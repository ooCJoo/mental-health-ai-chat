// Import required packages
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Configure middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Mental health system prompt
const SYSTEM_PROMPT = `You are a compassionate mental health companion. Provide:
1. Empathetic, non-judgmental responses
2. General coping strategies (e.g., breathing exercises)
3. NEVER give medical advice
4. Always suggest consulting a professional`;

// Validate API key on startup
if (!process.env.DEEPSEEK_API_KEY) {
  console.error('⚠️ WARNING: DEEPSEEK_API_KEY is missing in environment variables');
  console.error('Please create a .env file with your API key');
}

// Retry mechanism for API calls
async function callWithRetry(apiCall, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      console.log(`Attempt ${attempt} failed. ${attempt < maxRetries ? 'Retrying...' : 'No more retries.'}`);
      lastError = error;
      
      if (attempt < maxRetries) {
        // Wait with exponential backoff (300ms, 900ms, 2700ms)
        await new Promise(resolve => setTimeout(resolve, 300 * Math.pow(3, attempt - 1)));
      }
    }
  }
  
  throw lastError;
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  // Validate request
  if (!req.body.message) {
    return res.status(400).json({ error: 'No message provided', reply: "I didn't catch that. Could you please try again?" });
  }

  console.log(`📩 Request received: "${req.body.message.substring(0, 30)}${req.body.message.length > 30 ? '...' : ''}"`);
  
  try {
    console.log('🔄 Sending request to DeepSeek API...');
    
    const apiResponse = await callWithRetry(async () => {
      return await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: "deepseek-chat",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: req.body.message }
          ],
          temperature: 0.7
        },
        {
          headers: { 
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );
    });
    
    console.log('✅ DeepSeek API response received successfully');
    const botReply = apiResponse.data.choices[0].message.content;
    console.log(`🤖 Bot reply: "${botReply.substring(0, 30)}${botReply.length > 30 ? '...' : ''}"`);
    
    res.json({ reply: botReply });
  } catch (error) {
    console.error('❌ API Error:');
    
    if (error.response) {
      // The server responded with an error status code
      console.error(`Status code: ${error.response.status}`);
      console.error('Response data:', error.response.data);
      
      if (error.response.status === 401) {
        console.error('Authentication error. Please check your API key.');
      } else if (error.response.status === 429) {
        console.error('Rate limit exceeded. Please slow down your requests.');
      }
    } else if (error.request) {
      // No response received from the server
      console.error('No response received from API. The service might be down or network issues occurred.');
      console.error('Request details:', error.request._currentUrl || 'unknown URL');
    } else {
      // Error setting up the request
      console.error(`Request setup error: ${error.message}`);
    }
    
    // Send appropriate error message back to client
    res.status(500).json({ 
      reply: "I'm having trouble connecting to my services right now. Please try again in a moment."
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const apiKeyStatus = process.env.DEEPSEEK_API_KEY ? 'configured' : 'missing';
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    apiKeyStatus,
    serverTime: new Date().toISOString()
  });
});

// Start the server
app.listen(port, () => {
  console.log(`
🚀 Server started successfully!
🌐 Server running at http://localhost:${port}
🔑 API Key status: ${process.env.DEEPSEEK_API_KEY ? 'Configured ✅' : 'MISSING ❌'}
📝 System prompt configured for mental health companion
  `);
});