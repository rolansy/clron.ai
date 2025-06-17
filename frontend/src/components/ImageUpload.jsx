import React, { useState, useRef } from 'react';

const ImageUpload = ({ onImageSelected, onImageCleared }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    handleFile(file);
  };

  const handleFile = (file) => {
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image is too large. Please select an image under 5MB.');
      return;
    }
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
      onImageSelected(e.target.result, file);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageCleared();
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="mt-2">
      {!previewUrl ? (
        <div 
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-secondary-50 transition-colors ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-secondary-300'}`}
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept="image/*"
            ref={fileInputRef}
          />
          <svg className="w-8 h-8 mx-auto text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <p className="mt-2 text-sm text-secondary-600">Click to upload or drag and drop</p>
          <p className="text-xs text-secondary-500">PNG, JPG, GIF up to 5MB</p>
        </div>
      ) : (
        <div className="relative">
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="max-h-64 mx-auto rounded-lg shadow-sm"
          />
          <button
            className="absolute top-2 right-2 bg-secondary-800 bg-opacity-70 text-white rounded-full p-1 hover:bg-opacity-100 transition-opacity"
            onClick={handleClear}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;