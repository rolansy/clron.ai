import React, { useState, useEffect } from 'react';
import { signInWithGoogle, logOut, getCurrentUser, onAuthChanged } from '../services/firebase';

const Auth = ({ onUserChange }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const unsubscribe = onAuthChanged((user) => {
      setUser(user);
      setLoading(false);
      if (onUserChange) {
        onUserChange(user);
      }
    });
    
    return () => unsubscribe();
  }, [onUserChange]);
  
  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignOut = async () => {
    try {
      setLoading(true);
      await logOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Improve the loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-12 gap-2">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
        <p className="text-xs text-secondary-500">Connecting to Google...</p>
      </div>
    );
  }
  
  if (user) {
    return (
      <div className="flex items-center space-x-2">
        {user.photoURL && (
          <img 
            src={user.photoURL} 
            alt={user.displayName || 'User'} 
            className="w-8 h-8 rounded-full"
          />
        )}
        <div className="text-sm overflow-hidden">
          <p className="truncate font-medium">{user.displayName || 'User'}</p>
          <button 
            onClick={handleSignOut}
            className="text-xs text-secondary-500 hover:text-secondary-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <button
        onClick={handleSignIn}
        className="py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.545,12.151L12.545,12.151c0,1.054,0.855,1.909,1.909,1.909h3.536c-0.416,1.363-1.187,2.572-2.182,3.536 C14.89,18.517,13.518,19.13,12,19.13c-1.518,0-2.89-0.613-3.808-1.534c-0.995-0.964-1.766-2.173-2.182-3.536h3.536 c1.054,0,1.909-0.855,1.909-1.909l0,0c0-1.054-0.855-1.909-1.909-1.909H5.69c0.113-0.481,0.268-0.95,0.456-1.397h6.399 c1.054,0,1.909-0.855,1.909-1.909l0,0c0-1.054-0.855-1.909-1.909-1.909H7.232C8.343,4.876,10.057,4,12,4 c3.537,0,6.567,2.071,7.964,5.059c0.25,0.533,0.807,0.757,1.29,0.58c0.524-0.191,0.813-0.759,0.623-1.289 C20.07,4.583,16.268,2,12,2C7.373,2,3.585,4.991,2.422,9.151h3.113c1.054,0,1.909,0.855,1.909,1.909l0,0 c0,1.054-0.855,1.909-1.909,1.909H2.459c-0.046,0.326-0.068,0.66-0.068,1c0,0.34,0.022,0.674,0.068,1h3.077 C6.59,15.054,9.962,17,14,17c4.06,0,7.571-2.028,9.496-5.108c0.219-0.352,0.142-0.817-0.205-1.071 c-0.373-0.273-0.905-0.175-1.183,0.205C20.454,13.464,17.363,15,14,15h-4.364C10.69,15,11.642,14.045,11.642,12.991z"></path>
        </svg>
        Sign in with Google
      </button>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default Auth;