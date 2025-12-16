# Pay Day

**A Social Sports Betting Platform with AI-Powered Insights**

Pay Day is a full-stack web application that combines real-time sports betting markets with social networking features. The platform integrates an AI assistant named "Rob" that provides data-driven betting suggestions and conversational guidance to users.

---

## About

Pay Day delivers a modern sports betting experience by merging three core components:

1. **Real-Time Betting** — Live odds from professional sports leagues with support for single and parlay wagers
2. **Social Networking** — A community-driven feed where users share picks, follow bettors, and engage through posts and direct messaging
3. **AI Assistance** — An intelligent assistant powered by OpenAI that analyzes markets and provides betting recommendations with confidence ratings

The platform is built as a senior capstone project at California State University, Fullerton, demonstrating full-stack development with modern web technologies and third-party API integrations.

---

## Key Features

### Betting Platform
- Browse betting markets across NFL, NBA, MLB, NHL, and MLS with real-time odds
- Place single bets or combine selections into parlay wagers
- Cancel pending bets before market close
- Automated settlement system with payout processing

### Rob AI Assistant
- Conversational chat interface for betting advice and questions
- AI-generated pick suggestions with confidence scores and reasoning
- Context-aware responses using live market data
- 10% fee structure on AI-assisted winning bets

### Social Experience
- Create posts with text, images, and video content
- Follow other users and curate a personalized feed
- Like, comment, and share posts within the community
- Private direct messaging between users
- Search functionality for discovering users and content

### Account Management
- Secure authentication via Firebase
- Virtual wallet with deposit and withdrawal capabilities
- Comprehensive transaction history
- Customizable privacy, notification, and display settings
- Full GDPR-compliant data export and account deletion

### Administration
- Moderation panel for platform oversight
- Manual bet settlement controls
- User and content management tools
- Reported message review system

---

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas with Mongoose ODM |
| **Authentication** | Firebase Authentication |
| **AI Integration** | OpenAI API (GPT-4o-mini) |
| **Sports Data** | The Odds API |

---

## Architecture

```
├── Frontend (Static HTML/JS)
│   ├── index.html          # Landing page & authentication
│   ├── timeline.html       # Social feed & live streams
│   ├── betting.html        # Markets & bet slip
│   ├── account.html        # Profile & wallet
│   ├── settings.html       # User preferences
│   └── admin.html          # Administration panel
│
├── Backend (Express.js)
│   └── server.js           # REST API (60+ endpoints)
│
└── Database (MongoDB Atlas)
    ├── Users               # Profiles, balances, social graphs
    ├── Posts               # Feed content with engagement
    ├── Bets                # Wager records & settlements
    ├── Messages            # Direct message threads
    ├── Settings            # User preferences
    ├── Withdrawals         # Payout requests
    ├── RobSuggestions      # AI-generated picks
    └── RobMessages         # Chat history
```

---

## Getting Started

### Prerequisites
- Node.js v18 or higher
- MongoDB Atlas account
- Firebase project with Authentication enabled
- OpenAI API key *(optional — enables AI features)*
- The Odds API key *(optional — enables live odds)*

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/davidjmodelo/PayDay.git
   cd daproject
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the project root:
   ```env
   MONGODB_URI=mongodb+srv://LeBron:daGoat123!@payday-cluster.vaalrmf.mongodb.net/payday?retryWrites=true&w=majority
   OPENAI_API_KEY=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
   ODDS_API_KEY=2581a9656cc40b1f0b48fbbb56c989e2
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   
   Open http://localhost:3000 in your browser.

---

## API Overview

The backend exposes a RESTful API organized into the following domains:

| Domain | Endpoints | Description |
|--------|-----------|-------------|
| Authentication | `/api/auth/*` | Password reset, token verification |
| Users | `/api/users/*` | Profiles, balances, follows, settings |
| Posts | `/api/posts/*` | CRUD operations, likes, comments |
| Betting | `/api/bets/*`, `/api/markets` | Markets, wagers, cancellations |
| Rob AI | `/api/rob/*`, `/api/chat` | Chat, suggestions |
| Messaging | `/api/messages/*` | Conversations, DMs |
| Admin | `/api/admin/*` | Moderation, settlement |

---

## Disclaimer

Pay Day is a **simulated betting platform** developed for educational purposes. All currency is virtual and holds no real-world monetary value. Users must be 21 years or older to access betting features.

If you or someone you know has a gambling problem, please contact the National Council on Problem Gambling at **1-800-522-4700**.

---

## License

This project was developed as part of an academic senior project and is intended for educational purposes only.

---

## Contributors
David Modelo
Leonel Noriega-Rojas

**Senior Project Team**  
California State University, Fullerton
