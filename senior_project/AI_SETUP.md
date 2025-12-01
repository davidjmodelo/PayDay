# ChatGPT AI Integration Setup Guide

## Overview
This integration adds ChatGPT-powered AI assistance to your PayDay sports gambling platform.

## Prerequisites
- Node.js installed (v18 or higher recommended)
- OpenAI API key

## Setup Instructions

### 1. Get Your OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Create a new API key
4. Copy the key (you won't be able to see it again!)

### 2. Install Dependencies
Open terminal in your project folder and run:
```bash
npm install
```

### 3. Configure Environment Variables
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` file and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

### 4. Start the Servers

You need to run TWO servers:

**Terminal 1 - Node.js API Server (port 3000):**
```bash
npm start
```

**Terminal 2 - Python Web Server (port 8000):**
```bash
python3 -m http.server 8000
```

### 5. Access the AI Chat
Open your browser and go to:
```
http://localhost:8000/ai-chat.html
```

## Features

- **AI-Powered Chat**: Ask questions about sports betting, predictions, and player statistics
- **Secure API**: Your OpenAI API key is kept secure on the server side
- **Integrated Design**: Matches your existing PayDay website design
- **Responsible Gambling**: AI reminds users to gamble responsibly

## Usage Examples

Ask the AI questions like:
- "What are the best strategies for NBA betting?"
- "Can you analyze the upcoming Lakers vs Warriors game?"
- "What should I know about player prop bets?"
- "Give me tips for responsible sports gambling"

## API Costs

OpenAI charges per token used:
- **gpt-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens (cheaper, faster)
- **gpt-4**: ~$30 per 1M input tokens, ~$60 per 1M output tokens (more advanced)

Current setup uses `gpt-4o-mini` for cost efficiency.

## Troubleshooting

### "Could not connect to AI server"
- Make sure the Node.js server is running on port 3000
- Check that `.env` file exists with your API key

### "Invalid API key"
- Verify your OpenAI API key is correct in `.env`
- Make sure you have credits in your OpenAI account

### Port already in use
- Change the PORT in `server.js` if 3000 is taken
- Update the API_URL in `ai-chat.js` to match

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit your `.env` file to Git (it's in `.gitignore`)
- Never share your OpenAI API key publicly
- The API key should only exist on the server side

## Customization

You can customize the AI's behavior by editing the `context` in `server.js`:
```javascript
content: "You are a helpful sports gambling assistant..."
```

Change the model in `server.js`:
```javascript
model: "gpt-4o-mini", // or "gpt-4" for better responses
```

Adjust response length:
```javascript
max_tokens: 500 // increase for longer responses
```
