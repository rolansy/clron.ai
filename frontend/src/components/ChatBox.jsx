import React, { useState, useEffect } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { sendMessage, uploadImage, getChatMessages } from '../services/api';

const ChatBox = ({ user, chatId, onChatIdChange }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Load chat history when chat ID changes
  useEffect(() => {
    if (user && chatId) {
      const loadMessages = async () => {
        try {
          const chatMessages = await getChatMessages(chatId);
          setMessages(chatMessages);
        } catch (error) {
          console.error('Error loading chat messages:', error);
        }
      };
      
      loadMessages();
    } else {
      // Clear messages when no chat is selected
      setMessages([]);
    }
  }, [user, chatId]);
  
  const handleSendMessage = async (text, imageData, imageFile) => {
    if ((!text || text.trim() === '') && !imageData) return;
    
    try {
      setLoading(true);
      
      // Add user message to state immediately
      const userMessage = {
        id: `temp-${Date.now()}`,
        content: text,
        role: 'user',
        timestamp: new Date(),
        ...(imageData && { image_url: imageData })
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      let response;
      
      // If we have an image file, use the file upload endpoint
      if (imageFile) {
        response = await uploadImage(text, imageFile, chatId);
      } else {
        // Otherwise use the regular JSON endpoint
        response = await sendMessage(text, imageData, chatId);
      }
      
      // Update chat ID if it's a new chat
      if (response.chat_id && (!chatId || chatId !== response.chat_id)) {
        onChatIdChange(response.chat_id);
      }
      
      // Add assistant message to state
      const assistantMessage = {
        id: `response-${Date.now()}`,
        content: response.content,
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      setMessages(prev => [
        ...prev, 
        {
          id: `error-${Date.now()}`,
          content: `Error: ${error.message}`,
          role: 'assistant',
          timestamp: new Date(),
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-hidden">
        <MessageList messages={messages} />
      </div>
      <ChatInput onSendMessage={handleSendMessage} isLoading={loading} />
    </div>
  );
};

export default ChatBox;