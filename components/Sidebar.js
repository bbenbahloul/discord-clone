import { useState } from 'react';

const getUserColor = (username) => {
  if (!username) return '#ffffff';
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];
  return colors[Math.abs(hash % colors.length)];
};

export default function Sidebar({ 
  username, 
  channels, 
  activeChannel, 
  onSwitchChannel, 
  onJoinVoice,
  voiceUsers,
  inVoice,
  controls, 
  onRename 
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');

  const startEditing = () => {
    setEditNameInput(username);
    setIsEditingName(true);
  };

  const saveName = () => {
    if (editNameInput.trim() && editNameInput !== username) {
      onRename(editNameInput.trim());
    }
    setIsEditingName(false);
  };

  const handleChannelClick = (channel) => {
    if (channel.type === 'voice') {
      onJoinVoice('voice-lounge');
    } else {
      if (activeChannel.id !== channel.id) {
        onSwitchChannel(channel);
      }
    }
  };

  return (
    <div className="w-64 bg-gray-800 flex flex-col border-r border-gray-900 flex-shrink-0 shadow-2xl z-50 relative">
        {/* Header */}
        <div className="p-4 shadow-md bg-gray-800 z-10 border-b border-gray-900">
           <h1 className="text-xl font-bold text-indigo-400 tracking-tight">Datsik's Server</h1>
        </div>
        
        {/* Channel List */}
        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          {channels.map((channel) => {
            // Filter users specific to this channel
            const channelUsers = voiceUsers.filter(u => u.roomId === channel.id);
            
            return (
              <div key={channel.id} className="mb-2">
                <button
                  onClick={() => handleChannelClick(channel)}
                  className={`w-full text-left px-3 py-2 rounded flex items-center justify-between transition-colors group ${
                    activeChannel.id === channel.id ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center">
                      <span className="mr-2 text-lg text-gray-500 group-hover:text-gray-300">
                          {channel.type === 'voice' ? '🔊' : '#'}
                      </span>
                      <span className="truncate font-medium">{channel.name}</span>
                  </div>
                </button>
                
                {/* Render Voice Users if this is a voice channel */}
                {channel.type === 'voice' && channelUsers.length > 0 && (
                  <div className="pl-8 pr-2 mt-1 space-y-1">
                      {channelUsers.map((u) => (
                          <div key={u.id} className="flex items-center justify-between group cursor-default pr-2">
                             <div className="flex items-center min-w-0">
                                 <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white mr-2 shadow-sm flex-shrink-0" style={{ backgroundColor: getUserColor(u.username) }}>{u.username.charAt(0).toUpperCase()}</div>
                                 <span className="text-sm truncate max-w-[80px] text-gray-400">{u.username}</span>
                             </div>
                             <div className="flex space-x-1">
                                 {u.isMuted && !u.isDeafened && (
                                     <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
                                 )}
                                 {u.isDeafened && (
                                     <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" stroke="currentColor" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                                 )}
                             </div>
                          </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Footer (Bottom Left Section) */}
        <div className="bg-gray-900/90 flex flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] m-2 rounded-xl overflow-hidden">
            <div className="p-3 flex items-center group cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={!isEditingName ? startEditing : undefined}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0" style={{ backgroundColor: getUserColor(username) }}>{username.charAt(0).toUpperCase()}</div>
                <div className="ml-2.5 overflow-hidden flex-1">
                    {isEditingName ? (
                        <input autoFocus className="w-full bg-gray-950 text-white text-sm px-1 py-0.5 rounded border border-indigo-500 focus:outline-none" value={editNameInput} onChange={(e) => setEditNameInput(e.target.value)} onBlur={saveName} onKeyDown={(e) => e.key === 'Enter' && saveName()} />
                    ) : (
                        <><div className="text-sm font-bold truncate leading-tight group-hover:text-indigo-300 transition-colors" style={{ color: getUserColor(username) }}>{username}</div><div className="text-[11px] text-gray-500 uppercase tracking-wide font-bold">{inVoice ? 'Voice Connected' : 'Online'}</div></>
                    )}
                </div>
            </div>

            {inVoice && (
                <div className="grid grid-cols-5 gap-1 px-2 pb-2">
                    <button onClick={() => controls.toggleMic()} className={`p-1.5 rounded flex items-center justify-center transition-colors ${controls.isMicMuted ? 'bg-red-500/20 text-red-500' : 'bg-gray-700 hover:text-white text-gray-200'}`} title="Mic">
                         {controls.isMicMuted ? (<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>) : (<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>)}
                    </button>
                    <button onClick={() => controls.toggleDeafen()} className={`p-1.5 rounded flex items-center justify-center transition-colors ${controls.isDeafened ? 'bg-red-500/20 text-red-500' : 'bg-gray-700 hover:text-white text-gray-200'}`} title="Deafen">
                        {controls.isDeafened ? (<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" stroke="currentColor" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>) : (<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>)}
                    </button>
                    <button onClick={() => controls.toggleNoiseSuppression()} className={`p-1.5 rounded flex items-center justify-center transition-colors ${controls.isNoiseSuppression ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:text-white text-gray-200'}`} title="Noise Suppression">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </button>
                    <button onClick={() => controls.toggleScreenShare()} className={`p-1.5 rounded flex items-center justify-center transition-colors ${controls.isScreenSharing ? 'bg-green-500/20 text-green-500' : 'bg-gray-700 hover:text-white text-gray-200'}`} title="Screen">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </button>
                    <button onClick={() => controls.leaveVoice()} className="p-1.5 rounded flex items-center justify-center transition-colors bg-gray-700 hover:bg-red-600 text-gray-200 hover:text-white" title="Disconnect">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
                    </button>
                </div>
            )}
        </div>
    </div>
  );
}