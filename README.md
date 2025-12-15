# Pay Day - Social Sports Betting Platform

## Overview
Pay Day is a full-stack social sports betting web application that combines real-time betting markets, social features, and an AI-powered betting assistant called "Rob". The platform features Firebase authentication, MongoDB data persistence, real-time odds from The Odds API, and a modern responsive design.

## 🚀 Features

### User Management (#1-6)
- user signup/login with email and password (firebase auth)
- profile management (username, bio, photo)
- follow/unfollow other users
- change email/password
- delete account with full data purge
- password reset via email token

### Betting System (#7-10, #17)
- view betting markets with real-time odds
- place single bets
- place parlay bets (multi-selection)
- cancel pending bets (before market closes)
- automated bet settlement with simulated outcomes

### Live Streaming (#11)
- embedded youtube sports streams
- multiple sport channels (nfl, nba, soccer, nhl)
- simulated live viewer counts

### Virtual Wallet (#12-13)
- deposit funds to wallet
- withdrawal requests (simulated processing)
- transaction history

### Social Features (#14-16, #20, #23)
- create posts with text, images, and video
- like and comment on posts
- share posts
- search users and posts
- direct messaging between users

### AI Features (#18-19)
- rob ai betting suggestions with confidence ratings
- rob ai chat assistant for betting advice
- ai-powered pick analysis using openai

### Statistics & Data (#21-22, #26)
- transaction history
- player/team statistics display
- real-time odds from the odds api

### Settings & Admin (#24, #27-28)
- full settings page (privacy, notifications, display, betting preferences)
- admin moderation panel with login
- help pages, legal disclaimers, age verification

## 📁 Project Structure

```
daproject/
├── index.html              # landing page
├── timeline.html           # social feed with posts and live stream
├── betting.html            # betting markets and bet slip
├── account.html            # user profile and wallet
├── settings.html           # user settings page
├── admin.html              # admin moderation panel
├── about.html              # about page
├── contact.html            # contact page
├── styles.css              # main stylesheet
├── script.js               # auth and account functionality
├── timeline.js             # posts, search, dm, live stream
├── betting.js              # markets, bets, rob ai chat
├── settings.js             # settings page logic
├── server.js               # express backend api
├── models/                 # mongoose database models
│   ├── User.js
│   ├── Post.js
│   ├── Bet.js
│   ├── Message.js
│   ├── Settings.js
│   ├── Withdrawal.js
│   ├── PasswordReset.js
│   ├── RobSuggestion.js
│   ├── RobMessage.js
│   └── index.js
├── package.json            # node dependencies
├── .env                    # environment variables
└── images/                 # image assets
```

## 🛠️ Technology Stack

### Frontend
- html5/css3 with modern responsive design
- vanilla javascript (es6 modules)
- firebase sdk for authentication

### Backend
- node.js with express.js
- mongodb atlas with mongoose odm
- openai api for ai chat features
- the odds api for real-time sports odds

### Database Models
- User - profiles, balances, followers
- Post - social posts with likes/comments
- Bet - betting records with settlement
- Message - direct messages between users
- Settings - user preferences
- Withdrawal - withdrawal requests
- PasswordReset - reset tokens
- RobSuggestion - ai betting picks
- RobMessage - rob chat history

## 📦 Installation & Setup

### Prerequisites
- node.js (v18 or higher)
- mongodb atlas account
- firebase project
- openai api key (optional, for ai features)
- the odds api key (optional, for live odds)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file:
```
MONGODB_URI=your_mongodb_connection_string
OPENAI_API_KEY=your_openai_api_key
ODDS_API_KEY=your_odds_api_key
```

### Step 3: Start the Server
```bash
npm run dev
```
The app runs on http://localhost:3000

## 🔐 Admin Access
- url: /admin.html
- username: admin
- password: payday2024!

## 📋 Functional Requirements (28/28 Complete)

| # | Requirement | Status |
|---|-------------|--------|
| 1 | user signup with email/password | ✅ |
| 2 | user login/logout | ✅ |
| 3 | profile management | ✅ |
| 4 | follow/unfollow users | ✅ |
| 5 | change email/password | ✅ |
| 6 | delete account with data purge | ✅ |
| 7 | view betting markets with odds | ✅ |
| 8 | place single bets | ✅ |
| 9 | place parlay bets | ✅ |
| 10 | cancel pending bets | ✅ |
| 11 | live stream viewing | ✅ |
| 12 | virtual wallet (add funds) | ✅ |
| 13 | withdrawal requests | ✅ |
| 14 | create posts with text/media | ✅ |
| 15 | like/comment on posts | ✅ |
| 16 | share posts | ✅ |
| 17 | automated bet settlement | ✅ |
| 18 | rob ai betting suggestions | ✅ |
| 19 | rob ai chat assistant | ✅ |
| 20 | search users/posts | ✅ |
| 21 | transaction history | ✅ |
| 22 | player/team statistics | ✅ |
| 23 | direct messaging | ✅ |
| 24 | settings page | ✅ |
| 25 | password reset via email | ✅ |
| 26 | real-time odds from api | ✅ |
| 27 | admin moderation panel | ✅ |
| 28 | help/legal/age verification | ✅ |

##  License

This project is for educational purposes as part of a senior project.

## 👥 Contributors

Senior Project Team - California State University, Fullerton
