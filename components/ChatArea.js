import { useState, useRef, useEffect } from 'react';

const getUserColor = (username) => {
  if (!username) return '#ffffff';
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];
  return colors[Math.abs(hash % colors.length)];
};

const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const UrlEmbed = ({ metadata }) => {
    if (!metadata) return null;

    const isYoutube = metadata.site_name === 'YouTube' || (metadata.url && (metadata.url.includes('youtube.com') || metadata.url.includes('youtu.be')));
    const youtubeId = isYoutube ? getYoutubeId(metadata.url) : null;

    if (isYoutube && youtubeId) {
        return (
            <div className="mt-2 max-w-[400px]">
                <div className="text-[10px] uppercase text-gray-400 font-bold mb-1">YouTube</div>
                <div className="font-bold text-indigo-400 text-sm hover:underline cursor-pointer mb-1">
                    <a href={metadata.url} target="_blank" rel="noopener noreferrer">{metadata.title}</a>
                </div>
                <div className="relative pt-[56.25%] bg-black rounded-lg overflow-hidden border border-gray-700 shadow-lg">
                    <iframe 
                        className="absolute top-0 left-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${youtubeId}`} 
                        title="YouTube video player" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                    ></iframe>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-2 flex border-l-[3px] border-gray-600 bg-gray-800/60 rounded p-3 max-w-[480px]">
            <div className="flex-1 min-w-0 pr-4">
                {metadata.site_name && <div className="text-xs text-gray-400 mb-1">{metadata.site_name}</div>}
                <a href={metadata.url} target="_blank" rel="noopener noreferrer" className="block text-indigo-400 font-bold hover:underline truncate mb-1 text-sm">
                    {metadata.title}
                </a>
                {metadata.description && (
                    <p className="text-gray-300 text-xs line-clamp-3 mb-1.5 leading-relaxed">
                        {metadata.description}
                    </p>
                )}
            </div>
            {metadata.image && (
                <div className="shrink-0">
                    <img src={metadata.image} alt="Thumbnail" className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-md" />
                </div>
            )}
        </div>
    );
};

export default function ChatArea({ activeChannel, messages, socket, username }) {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null); 

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    socket.emit('send-message', { channelId: activeChannel.id, message: input, username });
    setInput('');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert("File too large (Max 5MB)");
    
    const reader = new FileReader();
    reader.onload = () => {
        socket.emit('send-message', { channelId: activeChannel.id, message: '', image: reader.result, username });
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const getSenderName = (msg) => msg.username || msg.sender || 'Unknown';

  return (
    <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        
        {/* --- CUSTOM SCROLLBAR STYLES --- */}
        <style>{`
            .custom-scrollbar::-webkit-scrollbar {
                width: 12px;
                height: 12px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background-color: #2b2d31; 
                border-radius: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: #1a1b1e; 
                border-radius: 8px;
                border: 3px solid #2b2d31; /* Creates a padding effect */
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background-color: #404249; 
            }
        `}</style>

        {/* Messages List Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 min-h-0">
           
           {/* Render Messages */}
           {messages.map((msg, idx) => {
             const senderName = getSenderName(msg);
             const messageText = msg.message || msg.text; 

             return (
               <div key={idx} className="group hover:bg-gray-700/40 -mx-4 px-4 py-1 flex items-start transition-colors">
                  <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-sm mt-0.5 shadow-sm" style={{ backgroundColor: getUserColor(senderName) }}>
                      {senderName.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                      <div className="flex items-baseline">
                          <span className="font-bold cursor-pointer hover:underline text-[15px]" style={{ color: getUserColor(senderName) }}>{senderName}</span>
                          <span className="text-xs text-gray-400 ml-2 font-medium">{msg.timestamp}</span>
                      </div>
                      
                      {messageText && (
                          <p className="text-gray-100 text-[15px] leading-relaxed break-words whitespace-pre-wrap">
                              {messageText.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
                                  part.match(/https?:\/\/[^\s]+/) ? 
                                  <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{part}</a> : 
                                  part
                              )}
                          </p>
                      )}

                      {msg.metadata && <UrlEmbed metadata={msg.metadata} />}
                      
                      {msg.image && (
                          <img 
                              src={msg.image} 
                              alt="Upload" 
                              onClick={() => setSelectedImage(msg.image)}
                              className="mt-2 max-h-64 rounded-md border border-gray-600 shadow-md cursor-pointer hover:opacity-90 hover:scale-[1.01] transition-all" 
                          />
                      )}
                  </div>
               </div>
             );
           })}
           
           {/* Invisible element at the bottom to scroll to */}
           <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-gray-700 shrink-0">
             <div className="bg-gray-600/50 rounded-lg px-4 py-2.5 flex items-center">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                <button onClick={() => fileInputRef.current?.click()} className="mr-3 text-gray-400 hover:text-gray-200 transition-colors bg-gray-700 rounded-full w-6 h-6 flex items-center justify-center hover:bg-gray-600" title="Upload Image">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
                <form onSubmit={sendMessage} className="flex-1">
                    <input className="w-full bg-transparent text-gray-100 focus:outline-none placeholder-gray-400 font-medium" placeholder={`Message #${activeChannel.name}`} value={input} onChange={(e) => setInput(e.target.value)} />
                </form>
             </div>
        </div>

        {/* Full Size Image Modal */}
        {selectedImage && (
            <div 
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200 backdrop-blur-sm"
                onClick={() => setSelectedImage(null)}
            >
                <div className="relative max-w-full max-h-full">
                    <img 
                        src={selectedImage} 
                        alt="Full Size" 
                        className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
                        onClick={(e) => e.stopPropagation()} 
                    />
                    <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-12 right-0 text-gray-400 hover:text-white transition-colors bg-black/50 hover:bg-gray-800 rounded-full p-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <a href={selectedImage} target="_blank" rel="noopener noreferrer" className="absolute -bottom-10 left-0 text-sm text-gray-400 hover:underline" onClick={(e) => e.stopPropagation()}>Open original</a>
                </div>
            </div>
        )}
    </div>
  );
}