// Simple Node.js server to handle OpenAI API calls
// This keeps your API key secure on the server side

import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static('.'));

// Route for the root URL
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: '.' });
});

// Endpoint to handle chat requests
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Create chat completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or "gpt-4" for more advanced responses
      messages: [
        {
          role: "system",
          content: context || "You are a helpful sports gambling assistant. Provide insights, predictions, and advice about sports betting. Be responsible and remind users to gamble responsibly."
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const reply = completion.choices[0].message.content;

    res.json({
      success: true,
      reply: reply,
      usage: completion.usage
    });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Make sure to set OPENAI_API_KEY in your .env file');
});
