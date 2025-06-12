import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Get the directory name properly in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.querySelector('.chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const imageButton = document.getElementById('image-button');
    const fileInput = document.getElementById('file-input');
    const dropArea = document.getElementById('drop-area');
    
    // Store the current image data
    let currentImageData = null;
    let currentImageType = null;

    // Set up initial viewport height
    function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);

    // Image upload handling
    imageButton.addEventListener('click', function() {
        dropArea.classList.toggle('active');
    });

    dropArea.addEventListener('click', function() {
        fileInput.click();
    });

    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('drag-over');
    }

    function unhighlight() {
        dropArea.classList.remove('drag-over');
    }

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                // Store the image type (e.g., 'image/jpeg', 'image/png')
                currentImageType = file.type;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imageData = e.target.result;
                    // Store the base64 data for sending to API
                    currentImageData = imageData;
                    
                    addImageMessage('user', imageData);
                    dropArea.classList.remove('active');
                    fileInput.value = "";
                    updateImageIndicator(); // Add this line
                };
                reader.readAsDataURL(file);
            } else {
                alert('Please upload an image file');
            }
        }
    }

    function addImageMessage(sender, imageData) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', sender);
        
        const img = document.createElement('img');
        img.src = imageData;
        img.classList.add('message-image');
        img.onclick = function() {
            window.open(imageData);
        };
        
        messageElement.appendChild(img);
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendMessage() {
        const message = chatInput.value.trim();
        
        // If there's no message and no image, don't send anything
        if (message === '' && !currentImageData) return;

        chatInput.value = '';
        
        // If there's a text message, add it to the chat
        if (message !== '') {
            addMessage('user', message);
        }
        
        // Show a loading indicator
        const loadingElement = document.createElement('div');
        loadingElement.classList.add('chat-message', 'bot', 'loading');
        loadingElement.textContent = 'Thinking...';
        chatMessages.appendChild(loadingElement);
        
        try {
            // Prepare the request data
            const requestData = { message };
            
            // Add image data if available
            if (currentImageData) {
                // Extract base64 data by removing the data URL prefix
                const base64Data = currentImageData.split(',')[1];
                const mimeType = currentImageType || 'image/jpeg';
                
                requestData.image = {
                    data: base64Data,
                    type: mimeType
                };
            }
            
            // Call our backend proxy
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            // Clear the current image after sending
            currentImageData = null;
            currentImageType = null;
            updateImageIndicator(); // Add this line

            // Remove loading indicator
            chatMessages.removeChild(loadingElement);
            
            // Create a new message element for the response
            const botMessageElement = document.createElement('div');
            botMessageElement.classList.add('chat-message', 'bot');
            chatMessages.appendChild(botMessageElement);
            
            let accumulatedText = '';
            
            // Handle the stream response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.trim() === '' || !line.startsWith('data:')) continue;
                    
                    const data = line.substring(5).trim();
                    if (data === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.type === 'content_block_delta') {
                            accumulatedText += parsed.delta.text || '';
                            renderMarkdown(botMessageElement, accumulatedText);
                        }
                    } catch (e) {
                        console.error('Error parsing SSE:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            addMessage('bot', 'Sorry, there was an error processing your request.');
        }
    }

    function renderMarkdown(element, markdown) {
        // Parse markdown content with code block detection
        element.innerHTML = '';
        
        // Split by code blocks
        const parts = markdown.split(/(```[a-z]*\n[\s\S]*?```)/g);
        
        for (const part of parts) {
            if (part.startsWith('```') && part.endsWith('```')) {
                // This is a code block
                const codeContainer = document.createElement('div');
                codeContainer.classList.add('code-container');
                
                // Extract language and code content
                const match = part.match(/```([a-z]*)\n([\s\S]*?)```/);
                if (match) {
                    const language = match[1] || 'plaintext';
                    const codeContent = match[2];
                    
                    // Create header with language and copy button
                    const codeHeader = document.createElement('div');
                    codeHeader.classList.add('code-header');
                    
                    const langLabel = document.createElement('div');
                    langLabel.classList.add('code-language');
                    langLabel.textContent = language;
                    
                    const copyButton = document.createElement('button');
                    copyButton.classList.add('copy-button');
                    copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
                    copyButton.addEventListener('click', function() {
                        copyToClipboard(codeContent, codeContainer);
                    });
                    
                    codeHeader.appendChild(langLabel);
                    codeHeader.appendChild(copyButton);
                    
                    // Create code block
                    const codeBlock = document.createElement('pre');
                    const codeElement = document.createElement('code');
                    codeElement.classList.add(`language-${language}`);
                    codeElement.textContent = codeContent;
                    
                    codeBlock.appendChild(codeElement);
                    
                    codeContainer.appendChild(codeHeader);
                    codeContainer.appendChild(codeBlock);
                    codeContainer.classList.add(`language-${language}`);
                }
                
                element.appendChild(codeContainer);
            } else if (part.trim()) {
                // Regular text
                const textNode = document.createElement('div');
                textNode.classList.add('text-content');
                
                // Add copy button for text content too
                const textContainer = document.createElement('div');
                textContainer.style.position = 'relative';
                textContainer.style.width = '100%';
                
                const copyTextButton = document.createElement('button');
                copyTextButton.classList.add('copy-button');
                copyTextButton.style.position = 'absolute';
                copyTextButton.style.right = '0';
                copyTextButton.style.top = '0';
                copyTextButton.style.background = '#f1f0f0';
                copyTextButton.style.color = '#333';
                copyTextButton.style.padding = '2px 5px';
                copyTextButton.style.fontSize = '12px';
                copyTextButton.style.border = 'none';
                copyTextButton.style.borderRadius = '3px';
                copyTextButton.style.opacity = '0';
                copyTextButton.style.transition = 'opacity 0.2s';
                copyTextButton.innerHTML = '<i class="fas fa-copy"></i>';
                copyTextButton.title = 'Copy text';
                
                textContainer.addEventListener('mouseenter', function() {
                    copyTextButton.style.opacity = '1';
                });
                
                textContainer.addEventListener('mouseleave', function() {
                    copyTextButton.style.opacity = '0';
                });
                
                copyTextButton.addEventListener('click', function() {
                    copyToClipboard(part, textContainer);
                });
                
                textNode.textContent = part;
                textContainer.appendChild(textNode);
                textContainer.appendChild(copyTextButton);
                
                element.appendChild(textContainer);
            }
        }
        
        // Scroll to the bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function copyToClipboard(text, container) {
        navigator.clipboard.writeText(text).then(function() {
            showCopyNotification(container);
        }, function(err) {
            console.error('Could not copy text: ', err);
        });
    }

    function showCopyNotification(container) {
        // Create or find notification element
        let notification = container.querySelector('.copy-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.classList.add('copy-notification');
            notification.textContent = 'Copied!';
            container.appendChild(notification);
        }
        
        // Show notification
        notification.classList.add('visible');
        
        // Hide after 2 seconds
        setTimeout(() => {
            notification.classList.remove('visible');
        }, 2000);
    }

    function addMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', sender);
        
        if (sender === 'user') {
            messageElement.textContent = message;
        } else {
            renderMarkdown(messageElement, message);
        }
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Add this function to script.js
    function updateImageIndicator() {
        // Remove existing indicator if any
        const existingIndicator = document.querySelector('.image-active-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // If there's an image, show the indicator
        if (currentImageData) {
            const indicator = document.createElement('div');
            indicator.classList.add('image-active-indicator');
            indicator.innerHTML = `
                <i class="fas fa-image"></i>
                Image ready to send
                <i class="fas fa-times remove-btn"></i>
            `;
            document.body.appendChild(indicator);
            
            // Add click handler to remove button
            indicator.querySelector('.remove-btn').addEventListener('click', function() {
                currentImageData = null;
                currentImageType = null;
                updateImageIndicator();
            });
        }
    }

    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
});