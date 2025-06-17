// Update the API_URL to conditionally use the production URL when deployed
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://clron-backend-dot-clron-2.uc.r.appspot.com/api'
  : process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const getToken = async () => {
  try {
    // Import firebase auth only when needed to avoid circular dependencies
    const { auth } = await import('./firebase');
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

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

export const streamMessage = async (message, imageData = null, chatId = null, systemPrompt = null, onContent, onComplete) => {
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
    const response = await fetch(`${API_URL}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to send message');
    }
    
    // Process the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let chatIdFromStream = chatId;
    let contentAccumulated = '';
    
    try {
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) {
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data:')) continue;
          
          try {
            const jsonStr = line.replace('data:', '').trim();
            if (jsonStr === '[DONE]') continue;
            
            const data = JSON.parse(jsonStr);
            
            if (data.type === 'metadata') {
              // Save chat ID if provided
              if (data.chat_id) {
                chatIdFromStream = data.chat_id;
              }
            }
            else if (data.type === 'content') {
              // Process content
              onContent(data.content);
              contentAccumulated += data.content;
            }
            else if (data.type === 'final') {
              // Final update with chat ID
              if (data.chat_id) {
                chatIdFromStream = data.chat_id;
              }
            }
          } catch (e) {
            console.error('Error parsing SSE:', e, 'Line:', line);
          }
        }
      }
    } catch (error) {
      console.error('Error reading stream:', error);
      throw error;
    }
    
    // Complete the stream
    if (onComplete) {
      onComplete(chatIdFromStream);
    }
    
    return { 
      chat_id: chatIdFromStream,
      content: contentAccumulated 
    };
    
  } catch (error) {
    console.error('Error streaming message:', error);
    throw error;
  }
};