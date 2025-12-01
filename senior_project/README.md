# PayDay - Sports Gambling Platform with AI

## Overview
PayDay is a modern sports gambling web application that combines user-friendly betting interfaces with AI-powered predictions and insights. The platform features Firebase authentication, ChatGPT integration for intelligent betting advice, and a sleek, responsive design.

## 🚀 Features

### Core Features
- **User Authentication**: Secure sign-up and login system powered by Firebase
- **AI-Powered Predictions**: ChatGPT integration for betting insights and analysis
- **Multi-Sport Support**: NBA, NFL, NHL, FIFA, UFC, and MLS
- **Responsive Design**: Modern gradient UI with smooth animations
- **Interactive Cards**: Player card system for making betting picks

### Pages
1. **Home** (`index.html`) - Hero section with player cards and league partnerships
2. **Picks** (`picks.html`) - AI chatbot for betting predictions and advice
3. **Timeline** (`timeline.html`) - Upcoming games and events (placeholder)
4. **About Us** (`about.html`) - Platform information (placeholder)
5. **Contact** (`contact.html`) - Support contact page (placeholder)

## 📁 Project Structure

```
senior project/
├── index.html              # Home page with hero section
├── picks.html              # AI chat interface for predictions
├── timeline.html           # Timeline page
├── about.html              # About page
├── contact.html            # Contact page
├── ai-chat.html           # Standalone AI chat (optional)
├── styles.css              # Main stylesheet
├── script.js               # Frontend JavaScript (Firebase auth, UI)
├── ai-chat.js              # AI chat functionality
├── server.js               # Node.js backend for OpenAI API
├── package.json            # Node.js dependencies
├── .env                    # Environment variables (API keys)
├── .env.example            # Template for environment variables
├── .gitignore              # Git ignore file
├── README.md               # This file
├── AI_SETUP.md             # Detailed AI setup instructions
└── images/                 # Image assets

```

## 🛠️ Technology Stack

### Frontend
- **HTML5/CSS3**: Structure and styling
- **JavaScript (ES6+)**: Client-side logic
- **Firebase SDK**: Authentication and analytics
  - Firebase Auth for user management
  - Firebase Analytics for tracking

### Backend
- **Node.js**: Server runtime
- **Express.js**: Web framework for API endpoints
- **OpenAI API**: ChatGPT integration for AI predictions
- **CORS**: Cross-origin resource sharing
- **dotenv**: Environment variable management

### Development
- **Python HTTP Server**: Static file serving (port 8000)
- **Node.js Server**: API backend (port 3000)

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- Python 3
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file in the project root:
```bash
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
```

Or manually create `.env` with:
```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### Step 3: Start the Servers

**Terminal 1 - Node.js API Server (port 3000):**
```bash
npm start
```

**Terminal 2 - Python Web Server (port 8000):**
```bash
python3 -m http.server 8000
```

### Step 4: Access the Application
Open your browser and navigate to:
```
http://localhost:8000
```

## 🔧 Code Architecture

### Frontend Components

#### 1. Authentication System (`script.js`)
```javascript
// Firebase authentication functions
- openSignupModal()      // User registration
- openLoginModal()       // User login
- onAuthStateChanged()   // Auth state management
```

**Features:**
- Email/password authentication
- Username and birthday collection
- Persistent login state
- Logout confirmation
- Dynamic UI updates based on auth state

#### 2. AI Chat Interface (`ai-chat.js`)
```javascript
// Main functions
- sendMessage()          // Send user message to AI
- addMessage()           // Display messages in chat
```

**Features:**
- Real-time chat with ChatGPT
- Message history display
- Loading indicators
- Error handling
- Enter key support

#### 3. Navigation System
- Multi-page navigation with active state highlighting
- Consistent header/footer across all pages
- Responsive mobile-friendly design

### Backend Components

#### 1. API Server (`server.js`)

**Endpoints:**

##### POST `/api/chat`
Handles ChatGPT requests for betting advice.

**Request Body:**
```json
{
  "message": "What are good NBA betting strategies?",
  "context": "You are a helpful sports gambling assistant..."
}
```

**Response:**
```json
{
  "success": true,
  "reply": "Here are some NBA betting strategies...",
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 100,
    "total_tokens": 150
  }
}
```

##### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

#### 2. OpenAI Integration
- Model: `gpt-4o-mini` (cost-efficient)
- Temperature: 0.7 (balanced creativity)
- Max tokens: 500 (response length limit)
- System prompt: Sports gambling assistant with responsible gambling reminders

## 🎨 Design System

### Color Palette
- **Primary Orange**: `#ff6b1a`
- **Secondary Orange**: `#ff8c42`
- **Background Gradient**: `linear-gradient(135deg, #ff8c42 0%, #ff6b1a 100%)`
- **White**: `#ffffff`
- **Text Gray**: `#666666`

### Typography
- **Font Family**: Arial, sans-serif
- **Logo**: 24px bold
- **Headings**: Various sizes with bold weight
- **Body**: 16-18px regular

### UI Components
- **Buttons**: Rounded (25px border-radius), hover effects
- **Cards**: White background, shadow effects, rounded corners
- **Chat Messages**: Differentiated by user/AI with color coding
- **Animations**: Smooth transitions and fade-in effects

## 🔐 Security Features

### API Key Protection
- OpenAI API key stored server-side in `.env`
- Never exposed to client-side code
- `.gitignore` prevents accidental commits

### Firebase Security
- Secure authentication flow
- Password validation
- Session management

### CORS Configuration
- Configured for localhost development
- Should be restricted in production

## 📊 Firebase Configuration

The app uses Firebase for:
- **Authentication**: User sign-up/login
- **Analytics**: User behavior tracking

**Firebase Config:**
```javascript
{
  apiKey: "AIzaSyBaZLyGxJ94FJSlKNE8F0N3X-Eas4jNR28",
  authDomain: "payday-379da.firebaseapp.com",
  projectId: "payday-379da",
  storageBucket: "payday-379da.firebasestorage.app",
  messagingSenderId: "1052972331917",
  appId: "1:1052972331917:web:c4a3f2f2c16e5e679143c4",
  measurementId: "G-ECHW55F36E"
}
```

## 💡 Usage Examples

### AI Chat Queries
Users can ask the AI assistant:
- "What are the best strategies for NBA betting?"
- "Analyze the upcoming Lakers vs Warriors game"
- "What should I know about player prop bets?"
- "Give me tips for responsible sports gambling"
- "Who should I bet on for tonight's NFL game?"

### User Workflow
1. Visit homepage
2. Sign up or log in
3. Navigate to Picks page
4. Ask AI for betting advice
5. Make informed betting decisions

## 💰 API Costs

### OpenAI Pricing (gpt-4o-mini)
- **Input**: ~$0.15 per 1M tokens
- **Output**: ~$0.60 per 1M tokens

**Estimated costs:**
- Average query: ~100 input + 200 output tokens
- Cost per query: ~$0.00015
- 1000 queries: ~$0.15

## 🐛 Troubleshooting

### "Could not connect to AI server"
**Solution:** Ensure Node.js server is running on port 3000
```bash
npm start
```

### "Invalid API key"
**Solution:** Verify OpenAI API key in `.env` file
```bash
cat .env
```

### Port already in use
**Solution:** Kill existing process or change port
```bash
# Find process on port 3000
lsof -i :3000
# Kill process
kill -9 <PID>
```

### Firebase authentication errors
**Solution:** Check Firebase console for project status and configuration

## 🚀 Future Enhancements

### Planned Features
- [ ] Real-time odds integration
- [ ] Live game tracking
- [ ] Betting history and analytics
- [ ] Social features (share picks)
- [ ] Payment integration
- [ ] Mobile app version
- [ ] Advanced AI models (GPT-4)
- [ ] Multi-language support
- [ ] Dark mode

### Technical Improvements
- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] User profile management
- [ ] Betting slip functionality
- [ ] Real-time notifications
- [ ] Performance optimization
- [ ] Unit and integration tests
- [ ] CI/CD pipeline
- [ ] Production deployment

## 📝 Development Notes

### Adding New Pages
1. Create new HTML file with navigation template
2. Include Firebase SDK and scripts
3. Add navigation link to all pages
4. Update active state in navigation

### Modifying AI Behavior
Edit the system prompt in `server.js`:
```javascript
content: "You are a helpful sports gambling assistant..."
```

### Changing AI Model
Update model in `server.js`:
```javascript
model: "gpt-4o-mini", // or "gpt-4" for better responses
```

## 📄 License

This project is for educational purposes as part of a senior project.

## 👥 Contributors

Senior Project Team - California State University, Fullerton

## 📞 Support

For issues or questions, visit the Contact page or check `AI_SETUP.md` for detailed setup instructions.
