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
                // Limit file size to 5MB (Anthropic has a size limit)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Image is too large. Please upload an image under 5MB.');
                    return;
                }
                
                currentImageType = file.type;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imageData = e.target.result;
                    currentImageData = imageData;
                    
                    addImageMessage('user', imageData);
                    dropArea.classList.remove('active');
                    fileInput.value = "";
                    updateImageIndicator();
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

    // Update the sendMessage function with better error handling and retry logic
    async function sendMessage() {
        const message = chatInput.value.trim();
        
        if (message === '' && !currentImageData) return;

        chatInput.value = '';
        
        if (message !== '') {
            addMessage('user', message);
        }
        
        const loadingElement = document.createElement('div');
        loadingElement.classList.add('chat-message', 'bot', 'loading');
        loadingElement.textContent = 'Thinking...';
        chatMessages.appendChild(loadingElement);
        
        try {
            const requestData = { message };
            
            if (currentImageData) {
                // Extract base64 data by removing the data URL prefix
                const base64Data = currentImageData.split(',')[1];
                const mimeType = currentImageType || 'image/jpeg';
                
                // Check size before sending
                const estimatedSize = Math.ceil(base64Data.length * 0.75);
                if (estimatedSize > 5 * 1024 * 1024) {
                    throw new Error('Image is too large (over 5MB). Please try a smaller image.');
                }
                
                requestData.image = {
                    data: base64Data,
                    type: mimeType
                };
            }
            
            let retries = 0;
            const maxRetries = 2;
            let response;
            
            while (retries <= maxRetries) {
                try {
                    response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestData)
                    });
                    
                    if (response.ok) break;
                    
                    // If it's a 429 (rate limit) or 5xx (server error), retry
                    if (response.status === 429 || response.status >= 500) {
                        retries++;
                        if (retries <= maxRetries) {
                            const waitTime = retries * 2000; // Exponential backoff
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                            continue;
                        }
                    }
                    
                    // For other errors, don't retry
                    break;
                } catch (error) {
                    retries++;
                    if (retries <= maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        continue;
                    }
                    throw error;
                }
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            // Clear the current image after sending
            currentImageData = null;
            currentImageType = null;
            updateImageIndicator();

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
                        console.error('Error parsing SSE:', e, 'Line:', line);
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            
            try {
                chatMessages.removeChild(loadingElement);
            } catch (e) {
                // Already removed, ignore
            }
            
            addMessage('bot', `Sorry, there was an error processing your request: ${error.message}`);
        }
    }

    function renderMarkdown(element, markdown) {
        element.innerHTML = '';
        
        const parts = markdown.split(/(```[a-z]*\n[\s\S]*?```)/g);
        
        for (const part of parts) {
            if (part.startsWith('```') && part.endsWith('```')) {
                const codeContainer = document.createElement('div');
                codeContainer.classList.add('code-container');
                
                const match = part.match(/```([a-z]*)\n([\s\S]*?)```/);
                if (match) {
                    const language = match[1] || 'plaintext';
                    const codeContent = match[2];
                    
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
                const textNode = document.createElement('div');
                textNode.classList.add('text-content');
                
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
        let notification = container.querySelector('.copy-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.classList.add('copy-notification');
            notification.textContent = 'Copied!';
            container.appendChild(notification);
        }
        
        notification.classList.add('visible');
        
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

    function updateImageIndicator() {
        const existingIndicator = document.querySelector('.image-active-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        if (currentImageData) {
            const indicator = document.createElement('div');
            indicator.classList.add('image-active-indicator');
            indicator.innerHTML = `
                <i class="fas fa-image"></i>
                Image ready to send
                <i class="fas fa-times remove-btn"></i>
            `;
            document.body.appendChild(indicator);
            
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