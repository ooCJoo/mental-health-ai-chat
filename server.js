require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const rateLimit = require('express-rate-limit');
const app = express();
const port = process.env.PORT || 3000;

// Disable x-powered-by header
app.disable('x-powered-by');

// Configure rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Configure middleware
app.use(cors({
  origin: [
    'https://mental-health-ai-chatbot.vercel.app',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Conversation context storage
const conversationContext = new Map();

// Mental health system prompt
const SYSTEM_PROMPT = `You are a compassionate mental health companion. Provide:
1. Empathetic, non-judgmental responses
2. General coping strategies (e.g., breathing exercises)
3. NEVER give medical advice
4. Always suggest consulting a professional`;

// API validation middleware
app.use('/api/chat', apiLimiter, (req, res, next) => {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('API Key check failed: Key missing');
    return res.status(500).json({ 
      reply: "Service temporarily unavailable. Please try again later."
    });
  }
  
  if (!req.body.message || typeof req.body.message !== 'string' || req.body.message.length > 500) {
    return res.status(400).json({ 
      reply: "Please provide a valid message (max 500 characters)" 
    });
  }
  
  next();
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || Date.now().toString();
    
    if (!conversationContext.has(sessionId)) {
      conversationContext.set(sessionId, [
        { role: "system", content: SYSTEM_PROMPT }
      ]);
    }

    const messages = conversationContext.get(sessionId);
    messages.push({ role: "user", content: req.body.message });

    const response = await axios({
      method: 'post',
      url: 'https://api.deepseek.com/v1/chat/completions',
      headers: { 
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: "deepseek-chat",
        messages: messages,
        temperature: 0.7,
        max_tokens: 150
      },
      timeout: 10000
    });

    const botMessage = response.data.choices[0].message.content;
    messages.push({ role: "assistant", content: botMessage });
    
    // Cleanup old conversations (1 hour TTL)
    setTimeout(() => {
      conversationContext.delete(sessionId);
    }, 3600000);

    res.json({ reply: botMessage });
    
  } catch (error) {
    console.error('API Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });

    const safeMessage = error.response?.status === 429 
      ? "I'm receiving many requests. Please wait a moment."
      : "I'm having trouble connecting. Please try again.";

    res.status(500).json({ reply: safeMessage });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    environment: process.env.NODE_ENV || 'development',
    apiKeyConfigured: !!process.env.DEEPSEEK_API_KEY,
    nodeVersion: process.version
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;