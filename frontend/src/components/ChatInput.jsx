import React, { useState } from 'react';
import ImageUpload from './ImageUpload';

const ChatInput = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState('');
  const [imageData, setImageData] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if ((!message || message.trim() === '') && !imageData) {
      return;
    }
    
    // Send message and image if available
    onSendMessage(message, imageData, imageFile);
    
    // Reset state
    setMessage('');
    setImageData(null);
    setImageFile(null);
    setShowImageUpload(false);
  };
  
  const handleImageSelected = (dataUrl, file) => {
    setImageData(dataUrl);
    setImageFile(file);
  };
  
  const handleImageCleared = () => {
    setImageData(null);
    setImageFile(null);
  };
  
  const toggleImageUpload = () => {
    setShowImageUpload(prev => !prev);
  };
  
  return (
    <div className="border-t border-secondary-200 bg-white p-4">
      {showImageUpload && (
        <ImageUpload 
          onImageSelected={handleImageSelected} 
          onImageCleared={handleImageCleared}
        />
      )}
      
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <button
          type="button"
          onClick={toggleImageUpload}
          className={`p-2 rounded-full ${imageData ? 'bg-primary-100 text-primary-600' : 'text-secondary-500 hover:text-primary-600 hover:bg-secondary-100'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        </button>
        
        <div className="flex-grow">
          <textarea
            className="w-full rounded-md border border-secondary-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 py-2 px-3 resize-none"
            placeholder="Type your message..."
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={isLoading}
          />
        </div>
        
        <button
          type="submit"
          className={`p-2 rounded-md ${
            isLoading 
              ? 'bg-secondary-300 cursor-not-allowed' 
              : 'bg-primary-600 hover:bg-primary-700'
          } text-white`}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          )}
        </button>
      </form>
      
      {imageData && (
        <div className="mt-2">
          <div className="inline-flex items-center bg-primary-50 text-primary-700 px-2 py-1 rounded-md text-sm">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            Image attached
            <button 
              onClick={handleImageCleared}
              className="ml-1 text-primary-500 hover:text-primary-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInput;