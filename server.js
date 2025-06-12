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

// Middleware to parse JSON with increased limit for base64 images
app.use(express.json({ limit: '50mb' }));

// Serve static files
app.use(express.static(__dirname));

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Proxy API route for Anthropic
app.post('/api/chat', async (req, res) => {
  try {
    const { message, image } = req.body;
    
    // Set up headers with API key from .env
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    };
    
    // Prepare the message content based on whether there's an image
    let content = [];
    
    // Add text message if provided
    if (message && message.trim() !== '') {
      content.push({
        type: "text",
        text: message
      });
    }
    
    // Add image if provided
    if (image && image.data) {
      // Format for Anthropic API image content
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: image.type,
          data: image.data
        }
      });
    }
    
    console.log("Sending to Anthropic API:", JSON.stringify({
      model: "claude-3-sonnet-20240229",
      messages: [{ role: "user", content }],
      max_tokens: 4096,
      temperature: 0.7,
      stream: true
    }, null, 2));
    
    // Make the request to Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        messages: [
          {
            role: "user",
            content: content
          }
        ],
        max_tokens: 4096,
        temperature: 0.7,
        stream: true
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Anthropic API error:", errorData);
      return res.status(response.status).json({ 
        error: 'Error from Anthropic API',
        details: errorData
      });
    }
    
    // Set up headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Stream the response to the client
    response.body.pipe(res);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});