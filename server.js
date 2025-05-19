require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure DeepSeek connection
const DEEPSEEK_CONFIG = {
  BASE_URL: 'https://api.deepseek.com/v1',
  MODEL: 'deepseek-chat',
  API_KEY: process.env.DEEPSEEK_API_KEY
};

// System prompt for mental health companion
const SYSTEM_PROMPT = `You are a compassionate mental health supporter. Respond with:
- Empathetic statements
- General coping strategies
- No medical advice
- Always suggest professional help`;

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const response = await axios.post(
      `${DEEPSEEK_CONFIG.BASE_URL}/chat/completions`,
      {
        model: DEEPSEEK_CONFIG.MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: req.body.message }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_CONFIG.API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    res.json({
      reply: response.data.choices[0].message.content
    });

  } catch (error) {
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    res.status(500).json({
      reply: "I'm having connection issues. Please try again later."
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log('DeepSeek API Key:', DEEPSEEK_CONFIG.API_KEY ? '✅ Loaded' : '❌ Missing');
});