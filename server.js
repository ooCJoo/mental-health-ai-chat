const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files

// Replace with your DeepSeek API key (store in environment variables!)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

app.post('/api/chat', async (req, res) => {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are a compassionate mental health companion. Provide empathetic, non-judgmental responses. Avoid medical advice."
          },
          { role: "user", content: req.body.message }
        ]
      },
      {
        headers: { 
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json({ reply: response.data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ reply: "I'm here to listen. Could you clarify?" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});