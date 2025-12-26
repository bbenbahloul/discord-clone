import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export default function LoginScreen({ onJoin }) {
  const [inputName, setInputName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    if (inputName.trim()) {
      onJoin(inputName);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        // Use the Google Display Name (e.g., "John Doe")
        if (user.displayName) {
            onJoin(user.displayName);
        } else {
            // Fallback if google doesn't return a name for some reason
            onJoin(user.email.split('@')[0]);
        }
    } catch (error) {
        console.error("Google Sign In Error:", error);
        setError("Failed to sign in with Google. Try again.");
        setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 bg-[url('https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png')] bg-no-repeat bg-center bg-[length:150px]">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-96 transform transition-all hover:scale-[1.01] border border-gray-700 relative">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Welcome Back!</h2>
        <p className="text-gray-400 text-center mb-6">We're so excited to see you again!</p>
        
        {/* Manual Input Form */}
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Username</label>
            <input 
              className="w-full bg-gray-900 text-white p-2.5 rounded border border-transparent focus:border-indigo-500 focus:outline-none transition-colors font-medium" 
              value={inputName} 
              onChange={(e) => setInputName(e.target.value)} 
              placeholder="Enter a display name"
              autoFocus
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2.5 rounded transition-colors text-sm"
          >
            Enter Server
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-4">
            <div className="flex-1 border-t border-gray-600"></div>
            <span className="px-3 text-gray-500 text-xs font-bold uppercase">Or</span>
            <div className="flex-1 border-t border-gray-600"></div>
        </div>

        {/* Google Login Button */}
        <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white hover:bg-gray-100 text-gray-800 font-bold py-2.5 rounded transition-colors flex items-center justify-center space-x-2 text-sm"
        >
            {isLoading ? (
                <span>Connecting...</span>
            ) : (
                <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Sign in with Google</span>
                </>
            )}
        </button>

        {error && (
            <div className="mt-4 p-2 bg-red-500/10 border border-red-500/50 rounded text-red-500 text-xs text-center">
                {error}
            </div>
        )}

      </div>
    </div>
  );
}