const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const next = require('next'); 
const axios = require('axios');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

const port = process.env.PORT || 3000;

// --- PRISMA DB CLIENT ---
const prisma = new PrismaClient();

nextApp.prepare().then(() => {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  // --- HELPER: Parse Open Graph Data ---
  async function fetchOpenGraphData(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const match = text ? text.match(urlRegex) : null;

    if (!match) return null;
    const url = match[0];

    try {
      const response = await axios.get(url, { 
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DiscordClone/1.0; +http://localhost)' },
          timeout: 5000 
      });
      const $ = cheerio.load(response.data);
      
      const metadata = {
          url: url,
          title: $('meta[property="og:title"]').attr('content') || $('title').text(),
          description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content'),
          image: $('meta[property="og:image"]').attr('content'),
          site_name: $('meta[property="og:site_name"]').attr('content'),
          type: $('meta[property="og:type"]').attr('content')
      };

      if (!metadata.title) metadata.title = url;
      return metadata;
    } catch (error) {
      console.error(`Failed to fetch OG data for ${url}:`, error.message);
      return null;
    }
  }

  // --- IN-MEMORY STORAGE (Voice only) ---
  let voiceUsers = []; 

  io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // --- FIX: Send existing voice users to the new client immediately ---
    socket.emit('voice-users-update', voiceUsers);

    // --- CHAT LOGIC ---
    socket.on('join-channel', async (channelId) => {
      socket.join(channelId);
      
      try {
        // Fetch last 50 messages from DB
        const history = await prisma.message.findMany({
            where: { channelId: channelId },
            orderBy: { createdAt: 'asc' }, 
            take: -50 
        });

        // Format data for frontend 
        const formattedHistory = history.map(msg => ({
            ...msg,
            metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
            timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            // MAP DB FIELDS TO FRONTEND EXPECTATIONS
            username: msg.sender, 
            message: msg.text     
        }));

        socket.emit('channel-history', formattedHistory);
      } catch (e) {
        console.error("Error fetching history:", e);
      }
    });

    socket.on('send-message', async (data) => {
      // data = { channelId, message, username, image? }
      
      let metadata = null;
      if (data.message) {
          metadata = await fetchOpenGraphData(data.message);
      }

      // 1. SAVE TO DB (Correctly mapped to your Schema)
      try {
        const savedMsg = await prisma.message.create({
            data: {
                channelId: data.channelId,
                sender: data.username, // Map 'username' -> 'sender'
                text: data.message || '', // Map 'message' -> 'text'
                image: data.image || null,
                metadata: metadata ? JSON.stringify(metadata) : null
            }
        });

        // 2. Prepare for Broadcast
        const messageData = {
            ...data,
            id: savedMsg.id,
            metadata: metadata,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // 3. Broadcast
        io.to(data.channelId).emit('receive-message', messageData);

      } catch (e) {
          console.error("Error saving message:", e);
      }
    });

    // --- VOICE LOGIC ---
    socket.on('join-voice', ({ roomId, peerId, username }) => {
      voiceUsers = voiceUsers.filter(u => u.socketId !== socket.id);
      
      const newUser = { id: peerId, socketId: socket.id, username, roomId, isMuted: false, isDeafened: false };
      voiceUsers.push(newUser);
      
      socket.join(roomId);
      socket.to(roomId).emit('user-connected', peerId);
      io.emit('voice-users-update', voiceUsers);
    });

    socket.on('toggle-mute', ({ roomId, isMuted }) => {
        const user = voiceUsers.find(u => u.socketId === socket.id);
        if (user) {
            user.isMuted = isMuted;
            io.emit('voice-users-update', voiceUsers);
        }
    });

    socket.on('toggle-deafen', ({ roomId, isDeafened }) => {
        const user = voiceUsers.find(u => u.socketId === socket.id);
        if (user) {
            user.isDeafened = isDeafened;
            if (isDeafened) user.isMuted = true;
            io.emit('voice-users-update', voiceUsers);
        }
    });

    socket.on('leave-voice', () => {
      const user = voiceUsers.find(u => u.socketId === socket.id);
      if (user) {
          const roomId = user.roomId;
          socket.to(roomId).emit('user-disconnected', user.id);
          voiceUsers = voiceUsers.filter(u => u.socketId !== socket.id);
          io.emit('voice-users-update', voiceUsers);
          socket.leave(roomId);
      }
    });

    socket.on('disconnect', () => {
      const user = voiceUsers.find(u => u.socketId === socket.id);
      if (user) {
          const roomId = user.roomId;
          socket.to(roomId).emit('user-disconnected', user.id);
          voiceUsers = voiceUsers.filter(u => u.socketId !== socket.id);
          io.emit('voice-users-update', voiceUsers);
      }
    });
  });

  app.use((req, res) => {
    return nextHandler(req, res);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});