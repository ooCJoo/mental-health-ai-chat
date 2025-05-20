// Import required packages
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Configure middleware
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Mental health system prompt
const SYSTEM_PROMPT = `You are a compassionate mental health companion. Provide:
1. Empathetic, non-judgmental responses
2. General coping strategies (e.g., breathing exercises)
3. NEVER give medical advice
4. Always suggest consulting a professional`;

// Debug info on startup
console.log('Starting server...');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`API Key configured: ${!!process.env.DEEPSEEK_API_KEY}`);

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  console.log('Chat request received');
  
  // Validate request
  if (!req.body || !req.body.message) {
    console.log('Invalid request: Missing message');
    return res.status(400).json({ 
      error: 'No message provided',
      reply: "I didn't catch what you said. Could you please try again?" 
    });
  }

  console.log(`Processing message: "${req.body.message.substring(0, 20)}..."`);
  
  // Check API key at request time
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('ERROR: DEEPSEEK_API_KEY is missing');
    return res.status(500).json({ 
      error: 'API key missing',
      reply: "I'm having configuration issues. Please contact support." 
    });
  }
  
  try {
    console.log('Calling DeepSeek API...');
    
    const response = await axios({
      method: 'post',
      url: 'https://api.deepseek.com/v1/chat/completions',
      headers: { 
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: req.body.message }
        ],
        temperature: 0.7
      },
      timeout: 8000 // 8 second timeout for Vercel
    });
    
    console.log('DeepSeek API response received');
    
    // Check if response contains expected data
    if (!response.data || !response.data.choices || 
        !response.data.choices[0] || !response.data.choices[0].message) {
      console.error('Unexpected API response format:', JSON.stringify(response.data));
      throw new Error('Invalid API response format');
    }
    
    const botReply = response.data.choices[0].message.content;
    res.json({ reply: botReply });
    
  } catch (error) {
    console.error('API Error:');
    
    // Detailed error logging
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
      
      // Handle common error codes
      if (error.response.status === 401) {
        return res.status(500).json({ 
          reply: "Authentication error. Please check your API configuration." 
        });
      } else if (error.response.status === 429) {
        return res.status(500).json({ 
          reply: "I'm experiencing high demand right now. Please try again shortly." 
        });
      }
    } else if (error.request) {
      console.error('No response received');
    } else {
      console.error('Error message:', error.message);
    }
    
    // General error response
    res.status(500).json({ 
      reply: "Sorry, I'm having trouble connecting. Please try again later." 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    environment: process.env.NODE_ENV || 'development',
    apiKeyStatus: process.env.DEEPSEEK_API_KEY ? 'configured' : 'missing',
    serverTime: new Date().toISOString()
  });
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV || 'development',
    apiKeyConfigured: !!process.env.DEEPSEEK_API_KEY,
    apiKeyLength: process.env.DEEPSEEK_API_KEY ? process.env.DEEPSEEK_API_KEY.length : 0,
    apiKeyPrefix: process.env.DEEPSEEK_API_KEY ? 
      process.env.DEEPSEEK_API_KEY.substring(0, 3) + '...' : 'N/A',
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
});

// Important: Handle the root route explicitly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle all other routes - send to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Export for Vercel serverless function
module.exports = app;