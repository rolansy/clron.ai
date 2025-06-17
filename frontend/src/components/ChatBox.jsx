import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { sendMessage, uploadImage, getChatMessages, streamMessage } from '../services/api';

const ChatBox = ({ user, chatId, onChatIdChange }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const endMessageRef = useRef(null);
  
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
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    endMessageRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = async (message, imageData = null, imageFile = null) => {
    if (!message.trim() && !imageData) return;
    
    setLoading(true);
    
    try {
      // Add user message to the chat
      const userMessage = {
        content: message,
        role: 'user',
        timestamp: new Date(),
        image_url: null
      };
      
      // Add to messages list
      setMessages(prev => [...prev, userMessage]);
      
      // Create placeholder for AI response
      const aiResponsePlaceholder = {
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        isStreaming: true
      };
      
      setMessages(prev => [...prev, aiResponsePlaceholder]);
      
      // Scroll to bottom
      scrollToBottom();
      
      // Stream the response
      await streamMessage(
        message, 
        imageData, 
        chatId, 
        null,
        // Handle content chunks
        (contentChunk) => {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            
            if (lastMessage.role === 'assistant' && lastMessage.isStreaming) {
              lastMessage.content += contentChunk;
            }
            
            return newMessages;
          });
          
          scrollToBottom();
        },
        // Handle completion
        (newChatId) => {
          // Update chat ID if needed
          if (newChatId && newChatId !== chatId) {
            if (onChatIdChange) {
              onChatIdChange(newChatId);
            }
          }
          
          // Mark streaming as complete
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            
            if (lastMessage.role === 'assistant' && lastMessage.isStreaming) {
              lastMessage.isStreaming = false;
            }
            
            return newMessages;
          });
        }
      );
      
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => {
        // Remove the placeholder message if there was an error
        if (prev[prev.length - 1].isStreaming) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      
      // Add error message
      setMessages(prev => [
        ...prev, 
        {
          content: `Error: ${error.message}`,
          role: 'system',
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
        <div ref={endMessageRef} />
      </div>
      <ChatInput onSendMessage={handleSendMessage} isLoading={loading} />
    </div>
  );
};

export default ChatBox;