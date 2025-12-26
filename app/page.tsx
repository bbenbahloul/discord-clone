"use client";
import { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from '../context/SocketContext';
import { useWebRTC } from '../hooks/useWebRTC';
import LoginScreen from '../components/LoginScreen';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import VoiceStage from '../components/VoiceStage';

// --- 1. Define Types ---
interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
}

interface Message {
  id: number;
  text: string;
  sender: string;
  timestamp: string;
  image?: string | null;
}

// --- Constants ---
const CHANNELS: Channel[] = [
  { id: 'general', name: 'general', type: 'text' },
  { id: 'gaming', name: 'gaming', type: 'text' },
  { id: 'music', name: 'music', type: 'text' },
  { id: 'voice-lounge', name: 'Voice Lounge', type: 'voice' },
];

function DiscordApp() {
  const socket = useSocket();
  const [username, setUsername] = useState<string>('');
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [activeChannel, setActiveChannel] = useState<Channel>(CHANNELS[0]);
  
  // Typed State for Messages
  const [messages, setMessages] = useState<Message[]>([]);

  // Use Custom Hook for Voice/Video Logic
  const webrtc = useWebRTC(socket, username);

  // Socket Listeners for Chat
  useEffect(() => {
    if (!socket) return;
    
    // --- FIX: Explicitly type the incoming data ---
    const handleMessage = (msg: Message) => setMessages((prev) => [...prev, msg]);
    const handleHistory = (history: Message[]) => setMessages(history);

    socket.on('receive-message', handleMessage);
    socket.on('channel-history', handleHistory);

    if (isJoined) {
      socket.emit('join-channel', activeChannel.id);
    }

    return () => {
      socket.off('receive-message', handleMessage);
      socket.off('channel-history', handleHistory);
    };
  }, [socket, activeChannel, isJoined]);

  // Wrapper to handle both Logic and UI switching
  const handleJoinVoice = (channelId: string) => {
    webrtc.joinVoice(channelId);
    
    // Force the UI to switch to the Voice Channel view
    const voiceChannel = CHANNELS.find(c => c.id === 'voice-lounge');
    if (voiceChannel) {
      setActiveChannel(voiceChannel);
      setMessages([]); 
    }
  };

  const handleRename = (newName: string) => {
    setUsername(newName);
    if (webrtc.inVoice) {
       webrtc.leaveVoice();
       setTimeout(() => {
          socket?.emit('join-voice', { roomId: 'voice-lounge', peerId: webrtc.myPeerId, username: newName });
       }, 200);
    }
  };

  if (!isJoined) return <LoginScreen onJoin={(name: string) => { setUsername(name); setIsJoined(true); }} />;

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      <Sidebar 
         username={username}
         channels={CHANNELS}
         activeChannel={activeChannel}
         voiceUsers={webrtc.voiceUsers}
         inVoice={webrtc.inVoice}
         onSwitchChannel={(c: Channel) => { setActiveChannel(c); setMessages([]); }}
         onJoinVoice={() => handleJoinVoice('voice-lounge')}
         onRename={handleRename}
         controls={{
             toggleMic: webrtc.toggleMic,
             toggleDeafen: webrtc.toggleDeafen,
             toggleScreenShare: webrtc.toggleScreenShare,
             toggleNoiseSuppression: webrtc.toggleNoiseSuppression,
             leaveVoice: webrtc.leaveVoice,
             isMicMuted: webrtc.isMicMuted,
             isDeafened: webrtc.isDeafened,
             isScreenSharing: webrtc.isScreenSharing,
             isNoiseSuppression: webrtc.isNoiseSuppression
         }}
      />
      
      <div className="flex-1 flex flex-col relative min-w-0">
         <div className="h-14 px-4 border-b border-gray-600 flex items-center shadow-sm bg-gray-700 shrink-0">
            <span className="text-2xl text-gray-400 mr-3">{activeChannel.type === 'voice' ? '🔊' : '#'}</span>
            <h2 className="text-lg font-bold text-white tracking-wide">{activeChannel.name}</h2>
         </div>

         {activeChannel.type === 'voice' ? (
            <VoiceStage 
               users={webrtc.voiceUsers} 
               myPeerId={webrtc.myPeerId}
               inVoice={webrtc.inVoice}
               onJoin={() => handleJoinVoice('voice-lounge')}
               screenStream={webrtc.remoteScreenStream}
               screenUser={webrtc.remoteScreenUser}
               isScreenSharing={webrtc.isScreenSharing}
               localStream={webrtc.localStream}
            />
         ) : (
            <ChatArea 
               activeChannel={activeChannel} 
               messages={messages} 
               socket={socket} 
               username={username} 
            />
         )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <SocketProvider>
      <DiscordApp />
    </SocketProvider>
  );
}