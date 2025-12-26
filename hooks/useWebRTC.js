import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

export function useWebRTC(socket, username) {
  const [myPeerId, setMyPeerId] = useState('');
  const [inVoice, setInVoice] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState([]);
  
  // Controls
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isNoiseSuppression, setIsNoiseSuppression] = useState(true);

  // Streams
  const [remoteScreenStream, setRemoteScreenStream] = useState(null);
  const [remoteScreenUser, setRemoteScreenUser] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const remoteAudioRefs = useRef([]);
  const remoteScreenSharerIdRef = useRef(null);

  const playSound = useCallback((type) => {
    const audio = new Audio(type === 'join' ? '/join.mp3' : '/leave.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio play failed", e));
  }, []);

  const getAudioConstraints = (suppressionEnabled) => ({
    echoCancellation: true,
    autoGainControl: true,
    noiseSuppression: suppressionEnabled
  });

  const handleIncomingStream = useCallback((remoteStream, callerPeerId) => {
    const hasVideo = remoteStream.getVideoTracks().length > 0;

    if (hasVideo) {
        setRemoteScreenStream(remoteStream);
        remoteScreenSharerIdRef.current = callerPeerId;
        setRemoteScreenUser('User Sharing'); 
    } else {
        if (remoteScreenSharerIdRef.current === callerPeerId) {
            setRemoteScreenStream(null);
            setRemoteScreenUser(null);
            remoteScreenSharerIdRef.current = null;
        }
    }

    const audio = document.createElement('audio');
    audio.srcObject = remoteStream;
    audio.muted = isDeafened;
    audio.addEventListener('loadedmetadata', () => audio.play());
    remoteAudioRefs.current.push(audio);
  }, [isDeafened]);

  const reCallEveryone = useCallback((stream) => {
    const peer = peerRef.current;
    if (!peer) return;
    voiceUsers.forEach(user => {
        if (user.id !== myPeerId) peer.call(user.id, stream);
    });
  }, [voiceUsers, myPeerId]);

  // --- FIXED JOIN LOGIC ---
  const joinVoice = async (roomId) => {
    if (inVoice || streamRef.current || !socket) return;

    try {
      // 1. Get Media Stream FIRST (Wait for user permission)
      const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: getAudioConstraints(isNoiseSuppression), 
          video: false 
      });
      
      streamRef.current = stream;
      setLocalStream(stream);

      // 2. NOW Import and Create Peer (Ensures 'open' listener isn't missed)
      const { Peer } = await import('peerjs');
      const peer = new Peer();
      peerRef.current = peer;

      // 3. Setup Listeners immediately
      peer.on('open', (id) => {
        setMyPeerId(id);
        setInVoice(true);
        setIsMicMuted(false);
        setIsDeafened(false);
        setIsScreenSharing(false);
        setRemoteScreenStream(null);
        remoteScreenSharerIdRef.current = null;
        playSound('join');
        
        socket.emit('join-voice', { roomId, peerId: id, username });
      });

      peer.on('call', (call) => {
        call.answer(streamRef.current);
        call.on('stream', (rs) => handleIncomingStream(rs, call.peer));
      });
      
      // Handle Peer Errors
      peer.on('error', (err) => {
          console.error("PeerJS Error:", err);
      });

    } catch (err) {
      console.error("Failed to join voice", err);
      alert("Microphone access denied or error occurred.");
      // Cleanup if stream was somehow created but Peer failed
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
          setLocalStream(null);
      }
    }
  };

  const leaveVoice = () => {
    playSound('leave');
    if (socket) socket.emit('leave-voice');

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    remoteAudioRefs.current = [];
    setInVoice(false);
    setIsScreenSharing(false);
    setRemoteScreenStream(null);
    setLocalStream(null);
    setMyPeerId('');
  };

  const toggleMic = (roomId = 'voice-lounge') => {
    if (streamRef.current) {
        const track = streamRef.current.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsMicMuted(!track.enabled);
            socket.emit('toggle-mute', { roomId, isMuted: !track.enabled });
        }
    }
  };

  const toggleDeafen = (roomId = 'voice-lounge') => {
    const newState = !isDeafened;
    setIsDeafened(newState);
    
    remoteAudioRefs.current.forEach(a => a.muted = newState);
    const videoEl = document.getElementById('remote-screen-video');
    if (videoEl) videoEl.muted = newState;

    socket.emit('toggle-deafen', { roomId, isDeafened: newState });
    if (newState && !isMicMuted) toggleMic(roomId);
  };

  const toggleNoiseSuppression = async () => {
    if (!inVoice || isScreenSharing) return; 

    const newState = !isNoiseSuppression;
    setIsNoiseSuppression(newState);

    try {
        const newStream = await navigator.mediaDevices.getUserMedia({ 
            audio: getAudioConstraints(newState), 
            video: false 
        });

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        streamRef.current = newStream;
        setLocalStream(newStream);

        const audioTrack = newStream.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = !isMicMuted;

        reCallEveryone(newStream);

    } catch (e) {
        console.error("Failed to toggle noise suppression", e);
        setIsNoiseSuppression(!newState);
    }
  };

  const stopScreenShare = async () => {
     try {
        const micStream = await navigator.mediaDevices.getUserMedia({ 
            audio: getAudioConstraints(isNoiseSuppression)
        });
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        
        streamRef.current = micStream;
        setLocalStream(micStream);
        
        setIsScreenSharing(false);
        reCallEveryone(micStream);
     } catch (e) {
        console.error("Failed to stop screen share", e);
     }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
        stopScreenShare();
    } else {
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            const micStream = await navigator.mediaDevices.getUserMedia({ 
                audio: getAudioConstraints(isNoiseSuppression)
            });
            const combined = new MediaStream([...displayStream.getVideoTracks(), ...micStream.getAudioTracks()]);

            displayStream.getVideoTracks()[0].onended = () => stopScreenShare();

            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
            
            streamRef.current = combined;
            setLocalStream(combined);
            
            setIsScreenSharing(true);
            reCallEveryone(combined);
        } catch (e) {
            console.log("Screen share cancelled", e);
        }
    }
  };

  useEffect(() => {
    if (!socket) return;
    socket.on('voice-users-update', (users) => setVoiceUsers(users));
    return () => socket.off('voice-users-update');
  }, [socket]);

  useEffect(() => {
    if (!socket || !inVoice) return;
    
    const handleUserConnected = (userId) => {
      playSound('join');
      const peer = peerRef.current;
      const stream = streamRef.current;
      if (peer && stream && !peer.destroyed) {
        const call = peer.call(userId, stream);
        if(call) call.on('stream', (rs) => handleIncomingStream(rs, userId));
      }
    };

    const handleUserDisconnected = (userId) => {
        playSound('leave');
        if (remoteScreenSharerIdRef.current === userId) {
            setRemoteScreenStream(null);
            setRemoteScreenUser(null);
            remoteScreenSharerIdRef.current = null;
        }
    };

    socket.on('user-connected', handleUserConnected);
    socket.on('user-disconnected', handleUserDisconnected);
    return () => {
        socket.off('user-connected', handleUserConnected);
        socket.off('user-disconnected', handleUserDisconnected);
    };
  }, [socket, inVoice, handleIncomingStream, playSound]);

  return {
    inVoice, myPeerId, voiceUsers, 
    isMicMuted, isDeafened, isScreenSharing, isNoiseSuppression,
    remoteScreenStream, remoteScreenUser, localStream,
    joinVoice, leaveVoice, 
    toggleMic, toggleDeafen, toggleScreenShare, toggleNoiseSuppression
  };
}