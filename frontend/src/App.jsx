import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import ChatBox from './components/ChatBox';
import { getChats } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  
  // Load user's chats when user changes
  useEffect(() => {
    if (user) {
      const loadChats = async () => {
        try {
          const userChats = await getChats();
          setChats(userChats);
        } catch (error) {
          console.error('Error loading chats:', error);
        }
      };
      
      loadChats();
    } else {
      setChats([]);
      setSelectedChatId(null);
    }
  }, [user]);
  
  const handleUserChange = (newUser) => {
    setUser(newUser);
  };
  
  const handleNewChat = () => {
    setSelectedChatId(null);
  };
  
  const handleChatSelect = (chatId) => {
    setSelectedChatId(chatId);
  };
  
  const handleChatIdChange = (chatId) => {
    setSelectedChatId(chatId);
    
    // Check if this chat is already in our list
    if (!chats.find(chat => chat.id === chatId)) {
      // Reload chats to get the new one
      if (user) {
        getChats().then(userChats => setChats(userChats));
      }
    }
  };
  
  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
  };
  
  return (
    <div className="flex h-screen bg-secondary-50">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-64' : 'w-0'} bg-white shadow-md transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b">
          <Auth onUserChange={handleUserChange} />
        </div>
        
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            New Chat
          </button>
        </div>
        
        <div className="overflow-y-auto flex-grow">
          <div className="p-2">
            <h2 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-2">Recent Chats</h2>
            {chats.length === 0 ? (
              <p className="text-sm text-secondary-400 text-center py-2">No chats yet</p>
            ) : (
              <ul className="space-y-1">
                {chats.map(chat => (
                  <li key={chat.id}>
                    <button
                      onClick={() => handleChatSelect(chat.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                        selectedChatId === chat.id 
                          ? 'bg-primary-50 text-primary-700' 
                          : 'text-secondary-700 hover:bg-secondary-100'
                      }`}
                    >
                      <div className="font-medium truncate">{chat.title || 'New Chat'}</div>
                      {chat.updated_at && (
                        <div className="text-xs text-secondary-500">
                          {new Date(chat.updated_at?.toDate?.() || chat.updated_at).toLocaleDateString()}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-grow flex flex-col h-full">
        <header className="bg-white shadow-sm border-b px-4 py-2 flex items-center">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
          
          <div className="ml-4 font-medium text-secondary-800">
            {selectedChatId ? (
              chats.find(chat => chat.id === selectedChatId)?.title || 'Chat'
            ) : (
              'New Conversation'
            )}
          </div>
        </header>
        
        <div className="flex-grow overflow-hidden">
          <ChatBox 
            user={user} 
            chatId={selectedChatId} 
            onChatIdChange={handleChatIdChange} 
          />
        </div>
      </div>
    </div>
  );
}

export default App;