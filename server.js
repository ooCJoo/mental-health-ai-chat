require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Updated system prompt for mental health
const SYSTEM_PROMPT = `You are a compassionate mental health companion. Provide:
1. Empathetic, non-judgmental responses
2. General coping strategies (e.g., breathing exercises)
3. NEVER give medical advice
4. Always suggest consulting a professional`;

app.post('/api/chat', async (req, res) => {
  try {
    const response = await axios.post(
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
        }
      }
    );
    res.json({ reply: response.data.choices[0].message.content });
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({ reply: "I'm here to listen. Could you share more?" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});