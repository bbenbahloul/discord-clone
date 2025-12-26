import { useEffect, useRef } from 'react';

const getUserColor = (username) => {
  if (!username) return '#ffffff';
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];
  return colors[Math.abs(hash % colors.length)];
};

export default function VoiceStage({ 
    users, 
    myPeerId, 
    inVoice, 
    onJoin, 
    screenStream,
    screenUser,
    isScreenSharing,
    localStream
}) {
  const videoRef = useRef(null);
  
  const hasActiveVideo = (screenStream) || (isScreenSharing && localStream);

  const getDynamicLayout = (count) => {
      if (count <= 1) return "grid-cols-1";
      if (count <= 2) return "grid-cols-1 sm:grid-cols-2"; 
      if (count <= 4) return "grid-cols-2";
      if (count <= 9) return "grid-cols-3";
      return "grid-cols-4";
  };

  useEffect(() => {
    if (videoRef.current) {
        if (isScreenSharing && localStream) {
            videoRef.current.srcObject = localStream;
            videoRef.current.muted = true; 
        } else if (screenStream) {
            videoRef.current.srcObject = screenStream;
            videoRef.current.muted = false; 
        }
    }
  }, [screenStream, isScreenSharing, localStream]);

  return (
     <div className="flex flex-col h-full bg-gray-900">
        
        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            
            {/* VIDEO STAGE */}
            {hasActiveVideo && (
                <div className="flex-1 bg-black flex flex-col items-center justify-center relative p-2 min-h-0 overflow-hidden">
                    <div className="relative w-full h-full flex items-center justify-center">
                        <video 
                            id="remote-screen-video"
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="max-h-full max-w-full rounded shadow-lg object-contain" 
                        />
                        <div className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded text-sm font-bold uppercase tracking-wider text-white border border-white/20 shadow-sm backdrop-blur-sm">
                            {isScreenSharing ? 'You are sharing' : `${screenUser} is sharing`}
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER (Only show if NOT connected and NO video) */}
            {!hasActiveVideo && !inVoice && (
                <div className="flex flex-col items-center justify-center p-12 bg-gray-800/30 border-b border-gray-700 h-1/3 shrink-0">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center border-4 border-gray-600 bg-gray-700 text-white mb-4 shadow-xl">
                        <span className="text-3xl">🎤</span>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-wide">Voice Lounge</h3>
                    <p className="text-gray-400 text-sm mb-6 mt-2 font-medium">{users.length} Users Connected</p>
                    
                    <button onClick={onJoin} className="px-8 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg transition-all transform active:scale-95 text-sm uppercase tracking-wider">
                        Join Voice Channel
                    </button>
                </div>
            )}

            {/* USERS GRID */}
            <div className={`${hasActiveVideo ? 'h-48 border-t border-gray-800 bg-gray-900' : 'flex-1 bg-gray-900'} p-4 overflow-y-auto custom-scrollbar transition-all duration-300`}>
                {hasActiveVideo && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">Connected Users — {users.length}</h4>}
                
                <div className={`grid gap-4 ${hasActiveVideo ? 'grid-cols-2 sm:grid-cols-4 xl:grid-cols-5' : getDynamicLayout(users.length) + ' h-full'}`}>
                    {users.map((user) => (
                    <div 
                        key={user.id} 
                        className={`bg-gray-800 rounded-xl flex flex-col items-center justify-center border border-gray-700/50 shadow-lg relative group transition-all duration-300 ${!hasActiveVideo ? 'h-full' : 'p-3'}`}
                    >
                        <div 
                            className={`rounded-full flex items-center justify-center font-bold text-white ring-4 ring-gray-700/50 shadow-2xl transition-all duration-300
                            ${!hasActiveVideo && users.length <= 4 ? 'w-32 h-32 text-5xl mb-6' : 'w-12 h-12 text-lg mb-2'}
                            `}
                            style={{ backgroundColor: getUserColor(user.username), borderColor: user.id === myPeerId ? '#22c55e' : 'transparent', borderWidth: user.id === myPeerId ? '3px' : '0px' }}
                        >
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        
                        <div className="text-center">
                            <div className={`font-bold text-gray-200 truncate leading-tight ${!hasActiveVideo && users.length <= 4 ? 'text-2xl' : 'text-sm'}`}>
                                {user.username}
                            </div>
                            <div className={`text-green-500 font-medium flex items-center justify-center mt-1 ${!hasActiveVideo && users.length <= 4 ? 'text-sm' : 'text-[10px]'}`}>
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                                Connected
                            </div>
                        </div>

                        <div className="absolute bottom-3 right-3 flex space-x-1">
                            {user.isMuted && !user.isDeafened && (
                                <div className="text-white bg-red-600 p-1.5 rounded-full shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12.732a1 1 0 01-1.707.707l-3.536-3.536a1 1 0 01-2.992-1.04l-.81-1.62a1 1 0 011.088-1.373l1.196.24.526-1.579a1 1 0 011.603-.59l1.715.857V4a1 1 0 01.617-.924zM16.5 7a1 1 0 010 6 1 1 0 110-2 1 1 0 010-4zM16.5 5a3 3 0 010 10 1 1 0 110-2 3 3 0 010-6z" clipRule="evenodd" /></svg></div>
                            )}
                            {user.isDeafened && (
                                <div className="text-white bg-red-600 p-1.5 rounded-full shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg></div>
                            )}
                        </div>
                    </div>
                    ))}
                </div>
            </div>
        </div>

        {/* --- BOTTOM SPACER / STATUS BAR --- */}
        {/* Only render if NO active video */}
        {!hasActiveVideo && (
            <div className={`bg-gray-900/90 flex items-center justify-between px-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] m-2 rounded-xl overflow-hidden ${inVoice ? 'h-[85px]' : 'h-[60px]'}`}>
                <div className="flex flex-col">
                    <span className={`text-xs font-bold uppercase tracking-wider ${inVoice ? 'text-green-500' : 'text-gray-500'}`}>
                        {inVoice ? 'Signal: RTC Connected' : 'Ready to Join'}
                    </span>
                    {inVoice && <span className="text-[10px] text-gray-500 mt-0.5">Voice Connected / High Quality</span>}
                </div>
                <div className="text-gray-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            </div>
        )}

     </div>
  );
}