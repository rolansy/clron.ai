import { getToken } from './firebase';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const sendMessage = async (message, imageData = null, chatId = null, systemPrompt = null) => {
  try {
    // Get auth token if user is logged in
    const token = await getToken();
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Prepare request body
    const requestBody = {
      message,
      chat_id: chatId,
      system_prompt: systemPrompt
    };
    
    // Add image if provided
    if (imageData) {
      requestBody.image_data = imageData;
      requestBody.image_type = imageData.split(';')[0].split(':')[1];
    }
    
    // Send request
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to send message');
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const uploadImage = async (message, file, chatId = null, systemPrompt = null) => {
  try {
    // Get auth token if user is logged in
    const token = await getToken();
    
    // Prepare form data
    const formData = new FormData();
    formData.append('message', message);
    formData.append('image', file);
    
    if (chatId) {
      formData.append('chat_id', chatId);
    }
    
    if (systemPrompt) {
      formData.append('system_prompt', systemPrompt);
    }
    
    // Prepare headers
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Send request
    const response = await fetch(`${API_URL}/chat/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to upload image');
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export const getChats = async () => {
  try {
    // Get auth token
    const token = await getToken();
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Send request
    const response = await fetch(`${API_URL}/chats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch chats');
    }
    
    const data = await response.json();
    return data.chats;
    
  } catch (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
};

export const getChatMessages = async (chatId) => {
  try {
    // Get auth token
    const token = await getToken();
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Send request
    const response = await fetch(`${API_URL}/chats/${chatId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch chat messages');
    }
    
    const data = await response.json();
    return data.messages;
    
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return [];
  }
};