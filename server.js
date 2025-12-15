// Simple Node.js server to handle OpenAI API calls
// This keeps your API key secure on the server side

import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { User, Post, Bet, RobSuggestion, RobMessage, Message, Withdrawal, PasswordReset, Settings } from './models/index.js';

dotenv.config();

const app = express();
const PORT = 3000;

// ========================================
// MONGODB CONNECTION
// ========================================

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json());

// ========================================
// HELPER FUNCTIONS
// ========================================

// Helper to get or create user in MongoDB
async function getOrCreateUser(odId, username, email) {
  let user = await User.findOne({ odId });
  if (!user) {
    user = await User.create({
      odId,
      username: username || 'User',
      email: email || '',
      balance: 0,
      followers: [],
      following: []
    });
  }
  return user;
}

// ========================================
// THE ODDS API INTEGRATION
// ========================================

const ODDS_API_KEY = process.env.ODDS_API_KEY;
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

// Sport key mapping for The Odds API
const SPORT_KEYS = {
  nfl: 'americanfootball_nfl',
  nba: 'basketball_nba',
  mlb: 'baseball_mlb',
  nhl: 'icehockey_nhl',
  soccer: 'soccer_usa_mls'
};

// Cache for odds data (to reduce API calls)
let oddsCache = {
  data: [],
  lastFetch: null,
  cacheDuration: 5 * 60 * 1000 // 5 minutes cache
};

// Fetch odds from The Odds API
async function fetchOddsFromAPI(sportKey) {
  if (!ODDS_API_KEY || ODDS_API_KEY === 'YOUR_ODDS_API_KEY_HERE') {
    console.log('⚠️ No Odds API key configured, using mock data');
    return null;
  }

  try {
    const url = `${ODDS_API_BASE}/sports/${sportKey}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
    console.log(`📡 Fetching odds for ${sportKey}...`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`❌ Odds API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    // Log remaining API quota
    const remaining = response.headers.get('x-requests-remaining');
    const used = response.headers.get('x-requests-used');
    console.log(`📊 Odds API quota - Used: ${used}, Remaining: ${remaining}`);
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching from Odds API:', error.message);
    return null;
  }
}

// Fetch all sports odds
async function fetchAllSportsOdds() {
  const allOdds = [];
  
  for (const [sport, sportKey] of Object.entries(SPORT_KEYS)) {
    const odds = await fetchOddsFromAPI(sportKey);
    if (odds && odds.length > 0) {
      // Transform API data to our format
      const transformed = odds.map(event => transformOddsEvent(event, sport));
      allOdds.push(...transformed);
    }
  }
  
  return allOdds;
}

// Transform Odds API event to our market format
function transformOddsEvent(event, sport) {
  const selections = [];
  
  // Get the first bookmaker's odds (usually the most reliable)
  const bookmaker = event.bookmakers?.[0];
  if (!bookmaker) {
    return null;
  }

  // Process each market type
  for (const market of bookmaker.markets || []) {
    if (market.key === 'h2h') {
      // Moneyline/Head-to-head
      for (const outcome of market.outcomes || []) {
        selections.push({
          id: `${event.id}-h2h-${outcome.name.replace(/\s+/g, '-').toLowerCase()}`,
          name: `${outcome.name} ML`,
          odds: outcome.price
        });
      }
    } else if (market.key === 'spreads') {
      // Point spreads
      for (const outcome of market.outcomes || []) {
        const spreadSign = outcome.point >= 0 ? '+' : '';
        selections.push({
          id: `${event.id}-spread-${outcome.name.replace(/\s+/g, '-').toLowerCase()}`,
          name: `${outcome.name} ${spreadSign}${outcome.point}`,
          odds: outcome.price
        });
      }
    } else if (market.key === 'totals') {
      // Over/Under totals
      for (const outcome of market.outcomes || []) {
        selections.push({
          id: `${event.id}-total-${outcome.name.toLowerCase()}`,
          name: `${outcome.name} ${outcome.point}`,
          odds: outcome.price
        });
      }
    }
  }

  return {
    id: event.id,
    sport: sport,
    event: `${event.away_team} vs ${event.home_team}`,
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    startTime: event.commence_time,
    closeTime: event.commence_time, // Close at game start
    status: new Date(event.commence_time) > new Date() ? 'open' : 'closed',
    selections: selections
  };
}

// Get markets (with caching)
async function getMarketsData(sportFilter = 'all') {
  const now = Date.now();
  
  // Check if cache is valid
  if (oddsCache.data.length > 0 && oddsCache.lastFetch && (now - oddsCache.lastFetch) < oddsCache.cacheDuration) {
    console.log('📦 Using cached odds data');
  } else {
    // Fetch fresh data
    console.log('🔄 Fetching fresh odds data...');
    const freshData = await fetchAllSportsOdds();
    
    if (freshData && freshData.length > 0) {
      // Filter out null entries
      oddsCache.data = freshData.filter(m => m !== null);
      oddsCache.lastFetch = now;
      console.log(`✅ Cached ${oddsCache.data.length} markets`);
    } else {
      console.log('⚠️ No live data available, using fallback mock data');
      // Use mock data as fallback
      oddsCache.data = getMockMarkets();
    }
  }

  // Filter by sport if specified
  if (sportFilter && sportFilter !== 'all') {
    return oddsCache.data.filter(m => m.sport === sportFilter);
  }
  
  return oddsCache.data;
}

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

// Endpoint to provide player prop lines (mock implementation)
app.get('/api/player-lines', async (req, res) => {
  try {
    const lines = [
      {
        player: 'Drake Maye',
        team: 'NE',
        position: 'QB',
        opponent: 'NYG',
        game_time: '2025-10-12T17:15:00Z',
        line_value: 245.5,
        stat_type: 'Pass Yards'
      },
      {
        player: 'Justin Jefferson',
        team: 'MIN',
        position: 'WR',
        opponent: 'GB',
        game_time: '2025-10-12T21:25:00Z',
        line_value: 89.5,
        stat_type: 'Rec Yards'
      },
      {
        player: 'Christian McCaffrey',
        team: 'SF',
        position: 'RB',
        opponent: 'SEA',
        game_time: '2025-10-13T01:20:00Z',
        line_value: 98.5,
        stat_type: 'Rush Yards'
      }
    ];

    res.json({ success: true, lines });
  } catch (error) {
    console.error('Player lines API Error:', error);
    res.status(500).json({ success: false, error: 'Failed to load player lines' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Odds API status endpoint
app.get('/api/odds-status', async (req, res) => {
  try {
    const hasApiKey = ODDS_API_KEY && ODDS_API_KEY !== 'YOUR_ODDS_API_KEY_HERE';
    
    if (!hasApiKey) {
      return res.json({
        success: true,
        status: 'mock',
        message: 'Using mock data - no Odds API key configured',
        cacheInfo: {
          itemCount: oddsCache.data.length,
          lastFetch: oddsCache.lastFetch ? new Date(oddsCache.lastFetch).toISOString() : null
        }
      });
    }

    // Test the API connection
    const testUrl = `${ODDS_API_BASE}/sports/?apiKey=${ODDS_API_KEY}`;
    const response = await fetch(testUrl);
    
    if (response.ok) {
      const remaining = response.headers.get('x-requests-remaining');
      const used = response.headers.get('x-requests-used');
      
      res.json({
        success: true,
        status: 'live',
        message: 'Connected to The Odds API',
        quota: {
          remaining: remaining,
          used: used
        },
        cacheInfo: {
          itemCount: oddsCache.data.length,
          lastFetch: oddsCache.lastFetch ? new Date(oddsCache.lastFetch).toISOString() : null
        }
      });
    } else {
      res.json({
        success: false,
        status: 'error',
        message: `API returned ${response.status}: ${response.statusText}`
      });
    }
  } catch (error) {
    res.json({
      success: false,
      status: 'error',
      message: error.message
    });
  }
});

// Get available sports from The Odds API
app.get('/api/sports', async (req, res) => {
  try {
    if (!ODDS_API_KEY || ODDS_API_KEY === 'YOUR_ODDS_API_KEY_HERE') {
      // Return our supported sports
      return res.json({
        success: true,
        source: 'mock',
        sports: Object.keys(SPORT_KEYS).map(key => ({
          key: key,
          title: key.toUpperCase(),
          active: true
        }))
      });
    }

    const url = `${ODDS_API_BASE}/sports/?apiKey=${ODDS_API_KEY}`;
    const response = await fetch(url);
    
    if (response.ok) {
      const sports = await response.json();
      res.json({ success: true, source: 'live', sports });
    } else {
      res.status(response.status).json({ success: false, error: 'Failed to fetch sports' });
    }
  } catch (error) {
    console.error('Error fetching sports:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// #14 - create posts with text/media
app.post('/api/posts', async (req, res) => {
  try {
    const { userId, username, email, content, imageUrl, videoUrl, isPublic } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    if (!content && !imageUrl && !videoUrl) {
      return res.status(400).json({ success: false, error: 'Post must have content, image, or video' });
    }

    // Get or create user
    await getOrCreateUser(userId, username, email);

    const post = await Post.create({
      odId: userId,
      username: username || 'User',
      content: content || '',
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      isPublic: isPublic !== false,
      likes: [],
      comments: []
    });

    // Convert to plain object and add id field for frontend compatibility
    const postObj = post.toObject();
    postObj.id = post._id.toString();
    postObj.userId = post.odId;
    postObj.createdAt = post.createdAt.toISOString();

    res.json({ success: true, post: postObj });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// Get posts (with filtering)
app.get('/api/posts', async (req, res) => {
  try {
    const { feed, userId } = req.query;
    let query = {};

    if (feed === 'mine' && userId) {
      query.odId = userId;
    } else if (feed === 'following' && userId) {
      const user = await User.findOne({ odId: userId });
      if (user && user.following.length > 0) {
        query.$or = [
          { odId: { $in: user.following } },
          { odId: userId }
        ];
      } else {
        query.odId = userId;
      }
    } else {
      if (userId) {
        query.$or = [
          { isPublic: true },
          { odId: userId }
        ];
      } else {
        query.isPublic = true;
      }
    }

    const posts = await Post.find(query).sort({ createdAt: -1 }).limit(100);
    
    // Convert to frontend-compatible format
    const formattedPosts = posts.map(p => {
      const obj = p.toObject();
      obj.id = p._id.toString();
      obj.userId = p.odId;
      obj.createdAt = p.createdAt.toISOString();
      if (obj.comments) {
        obj.comments = obj.comments.map(c => ({
          ...c,
          id: c._id ? c._id.toString() : c.id,
          userId: c.odId,
          createdAt: c.createdAt ? c.createdAt.toISOString() : c.createdAt
        }));
      }
      return obj;
    });

    res.json({ success: true, posts: formattedPosts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
});

// Delete a post
app.delete('/api/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (post.odId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(postId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

// #15 - like posts
app.post('/api/posts/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const likeIndex = post.likes.indexOf(userId);
    if (likeIndex === -1) {
      post.likes.push(userId);
    } else {
      post.likes.splice(likeIndex, 1);
    }
    await post.save();

    res.json({ success: true, liked: likeIndex === -1, likeCount: post.likes.length });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle like' });
  }
});

// #15 - comment on posts
app.post('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, username, text } = req.body;

    if (!userId || !text) {
      return res.status(400).json({ success: false, error: 'User ID and text are required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const comment = {
      odId: userId,
      username: username || 'User',
      text: text.trim(),
      likes: []
    };

    post.comments.push(comment);
    await post.save();

    // Get the newly added comment with its _id
    const addedComment = post.comments[post.comments.length - 1];
    const commentObj = {
      id: addedComment._id.toString(),
      userId: addedComment.odId,
      username: addedComment.username,
      text: addedComment.text,
      likes: addedComment.likes,
      createdAt: addedComment.createdAt.toISOString()
    };

    res.json({ success: true, comment: commentObj });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
});

// Delete a comment
app.delete('/api/posts/:postId/comments/:commentId', async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { userId } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    if (comment.odId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this comment' });
    }

    post.comments.pull(commentId);
    await post.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ success: false, error: 'Failed to delete comment' });
  }
});

// Like/unlike a comment
app.post('/api/posts/:postId/comments/:commentId/like', async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { userId } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    const likeIndex = comment.likes.indexOf(userId);
    if (likeIndex === -1) {
      comment.likes.push(userId);
    } else {
      comment.likes.splice(likeIndex, 1);
    }

    await post.save();
    res.json({ success: true, liked: likeIndex === -1, likeCount: comment.likes.length });
  } catch (error) {
    console.error('Error toggling comment like:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle comment like' });
  }
});

// #20 - search users/posts
app.get('/api/search', async (req, res) => {
  try {
    const { q, type, date, userId } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }

    const results = { posts: [], users: [] };

    // Date filter helper
    const getDateThreshold = (dateFilter) => {
      const now = new Date();
      switch (dateFilter) {
        case 'today':
          return new Date(now.setHours(0, 0, 0, 0));
        case 'week':
          return new Date(now.setDate(now.getDate() - 7));
        case 'month':
          return new Date(now.setMonth(now.getMonth() - 1));
        default:
          return null;
      }
    };

    const dateThreshold = getDateThreshold(date);

    // Search posts
    if (type === 'all' || type === 'posts') {
      const searchRegex = new RegExp(q, 'i');
      let postQuery = {
        $or: [
          { content: searchRegex },
          { username: searchRegex }
        ]
      };

      // Add visibility filter
      if (userId) {
        postQuery.$and = [
          postQuery.$or ? { $or: postQuery.$or } : {},
          { $or: [{ isPublic: true }, { odId: userId }] }
        ];
        delete postQuery.$or;
      } else {
        postQuery.isPublic = true;
      }

      // Add date filter
      if (dateThreshold) {
        postQuery.createdAt = { $gte: dateThreshold };
      }

      const posts = await Post.find(postQuery).sort({ createdAt: -1 }).limit(50);
      results.posts = posts.map(p => {
        const obj = p.toObject();
        obj.id = p._id.toString();
        obj.userId = p.odId;
        obj.createdAt = p.createdAt.toISOString();
        return obj;
      });
    }

    // Search users
    if (type === 'all' || type === 'users') {
      const searchRegex = new RegExp(q, 'i');
      const users = await User.find({ username: searchRegex }).limit(20);
      
      // Get post counts for each user
      for (const user of users) {
        const postsCount = await Post.countDocuments({ odId: user.odId });
        results.users.push({
          id: user.odId,
          username: user.username,
          postsCount,
          followers: user.followers
        });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// #4 - follow/unfollow users (suggested users list)
app.get('/api/users/suggested', async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Get users who have posted
    const usersWithPosts = await Post.aggregate([
      { $group: { _id: '$odId', username: { $first: '$username' }, postsCount: { $sum: 1 } } },
      { $limit: 20 }
    ]);

    let suggestions = [];
    for (const u of usersWithPosts) {
      const userDoc = await User.findOne({ odId: u._id });
      suggestions.push({
        id: u._id,
        username: u.username,
        postsCount: u.postsCount,
        followers: userDoc?.followers || []
      });
    }

    // Filter out current user and users already followed
    if (userId) {
      const currentUser = await User.findOne({ odId: userId });
      suggestions = suggestions.filter(u => 
        u.id !== userId && 
        (!currentUser || !currentUser.following.includes(u.id))
      );
    }

    // Return top 5 suggestions
    res.json({ success: true, users: suggestions.slice(0, 5) });
  } catch (error) {
    console.error('Error fetching suggested users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch suggestions' });
  }
});

// #4 - follow/unfollow a user
app.post('/api/users/:targetUserId/follow', async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const { userId } = req.body;

    if (userId === targetUserId) {
      return res.status(400).json({ success: false, error: 'Cannot follow yourself' });
    }

    // Get or create both users
    const currentUser = await getOrCreateUser(userId, null, null);
    const targetUser = await getOrCreateUser(targetUserId, null, null);

    const followingIndex = currentUser.following.indexOf(targetUserId);
    
    if (followingIndex === -1) {
      // Follow
      currentUser.following.push(targetUserId);
      targetUser.followers.push(userId);
    } else {
      // Unfollow
      currentUser.following.splice(followingIndex, 1);
      const followerIndex = targetUser.followers.indexOf(userId);
      if (followerIndex !== -1) {
        targetUser.followers.splice(followerIndex, 1);
      }
    }

    await currentUser.save();
    await targetUser.save();

    res.json({ 
      success: true, 
      following: followingIndex === -1,
      followersCount: targetUser.followers.length
    });
  } catch (error) {
    console.error('Error toggling follow:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle follow' });
  }
});

// Get user stats
app.get('/api/users/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findOne({ odId: userId });
    const postsCount = await Post.countDocuments({ odId: userId });

    res.json({
      success: true,
      stats: {
        postsCount,
        followersCount: user?.followers?.length || 0,
        followingCount: user?.following?.length || 0
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// #3 - profile management (get profile)
app.get('/api/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    
    let user = await User.findOne({ odId: userId });
    if (!user) {
      user = await User.create({ odId: userId });
    }

    res.json({
      success: true,
      profile: {
        username: user.username,
        email: user.email,
        birthday: user.birthday,
        bio: user.bio,
        photoUrl: user.photoUrl,
        balance: user.balance,
        followersCount: user.followers.length,
        followingCount: user.following.length
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// #3 - profile management (update profile)
app.put('/api/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, birthday, bio, photoUrl } = req.body;

    let user = await User.findOne({ odId: userId });
    if (!user) {
      user = await User.create({ odId: userId });
    }

    // Update only provided fields
    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = email;
    if (birthday !== undefined) user.birthday = birthday;
    if (bio !== undefined) user.bio = bio;
    if (photoUrl !== undefined) user.photoUrl = photoUrl;

    await user.save();

    res.json({
      success: true,
      profile: {
        username: user.username,
        email: user.email,
        birthday: user.birthday,
        bio: user.bio,
        photoUrl: user.photoUrl,
        balance: user.balance
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// #12 - virtual wallet (add funds)
app.post('/api/users/:userId/deposit', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid deposit amount' });
    }

    let user = await User.findOne({ odId: userId });
    if (!user) {
      user = await User.create({ odId: userId, balance: 0 });
    }

    user.balance += amount;
    await user.save();

    res.json({
      success: true,
      newBalance: user.balance,
      deposited: amount
    });
  } catch (error) {
    console.error('Error depositing funds:', error);
    res.status(500).json({ success: false, error: 'Failed to deposit funds' });
  }
});

// Get user balance
app.get('/api/users/:userId/balance', async (req, res) => {
  try {
    const { userId } = req.params;
    
    let user = await User.findOne({ odId: userId });
    if (!user) {
      // Create user with $0 balance - must deposit funds
      user = await User.create({ odId: userId, balance: 0 });
    }

    res.json({
      success: true,
      balance: user.balance
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch balance' });
  }
});

// #7 - view betting markets with odds
// #26 - real-time odds from api
function getMockMarkets() {
  return [
  {
    id: 'nfl-1',
    sport: 'nfl',
    event: 'Kansas City Chiefs vs Buffalo Bills',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    closeTime: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
    status: 'open',
    selections: [
      { id: 'nfl-1-1', name: 'Kansas City Chiefs -3.5', odds: -110 },
      { id: 'nfl-1-2', name: 'Buffalo Bills +3.5', odds: -110 },
      { id: 'nfl-1-3', name: 'Over 48.5', odds: -105 },
      { id: 'nfl-1-4', name: 'Under 48.5', odds: -115 }
    ]
  },
  {
    id: 'nfl-2',
    sport: 'nfl',
    event: 'Dallas Cowboys vs Philadelphia Eagles',
    startTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    closeTime: new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString(),
    status: 'open',
    selections: [
      { id: 'nfl-2-1', name: 'Dallas Cowboys +2.5', odds: -105 },
      { id: 'nfl-2-2', name: 'Philadelphia Eagles -2.5', odds: -115 },
      { id: 'nfl-2-3', name: 'Over 45.5', odds: -110 },
      { id: 'nfl-2-4', name: 'Under 45.5', odds: -110 }
    ]
  },
  {
    id: 'nba-1',
    sport: 'nba',
    event: 'Los Angeles Lakers vs Golden State Warriors',
    startTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    closeTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    status: 'open',
    selections: [
      { id: 'nba-1-1', name: 'Los Angeles Lakers +4.5', odds: -110 },
      { id: 'nba-1-2', name: 'Golden State Warriors -4.5', odds: -110 },
      { id: 'nba-1-3', name: 'Over 228.5', odds: -108 },
      { id: 'nba-1-4', name: 'Under 228.5', odds: -112 }
    ]
  },
  {
    id: 'nba-2',
    sport: 'nba',
    event: 'Boston Celtics vs Miami Heat',
    startTime: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
    closeTime: new Date(Date.now() + 29 * 60 * 60 * 1000).toISOString(),
    status: 'open',
    selections: [
      { id: 'nba-2-1', name: 'Boston Celtics -7.5', odds: -105 },
      { id: 'nba-2-2', name: 'Miami Heat +7.5', odds: -115 },
      { id: 'nba-2-3', name: 'Over 215.5', odds: -110 },
      { id: 'nba-2-4', name: 'Under 215.5', odds: -110 }
    ]
  },
  {
    id: 'mlb-1',
    sport: 'mlb',
    event: 'New York Yankees vs Boston Red Sox',
    startTime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    closeTime: new Date(Date.now() + 11 * 60 * 60 * 1000).toISOString(),
    status: 'open',
    selections: [
      { id: 'mlb-1-1', name: 'New York Yankees ML', odds: -145 },
      { id: 'mlb-1-2', name: 'Boston Red Sox ML', odds: +125 },
      { id: 'mlb-1-3', name: 'Over 8.5 Runs', odds: -115 },
      { id: 'mlb-1-4', name: 'Under 8.5 Runs', odds: -105 }
    ]
  },
  {
    id: 'nhl-1',
    sport: 'nhl',
    event: 'Toronto Maple Leafs vs Montreal Canadiens',
    startTime: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    closeTime: new Date(Date.now() + 17 * 60 * 60 * 1000).toISOString(),
    status: 'open',
    selections: [
      { id: 'nhl-1-1', name: 'Toronto Maple Leafs ML', odds: -135 },
      { id: 'nhl-1-2', name: 'Montreal Canadiens ML', odds: +115 },
      { id: 'nhl-1-3', name: 'Over 6.5 Goals', odds: +100 },
      { id: 'nhl-1-4', name: 'Under 6.5 Goals', odds: -120 }
    ]
  },
  {
    id: 'soccer-1',
    sport: 'soccer',
    event: 'Manchester United vs Liverpool',
    startTime: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    closeTime: new Date(Date.now() + 35 * 60 * 60 * 1000).toISOString(),
    status: 'open',
    selections: [
      { id: 'soccer-1-1', name: 'Manchester United', odds: +210 },
      { id: 'soccer-1-2', name: 'Draw', odds: +240 },
      { id: 'soccer-1-3', name: 'Liverpool', odds: +120 },
      { id: 'soccer-1-4', name: 'Over 2.5 Goals', odds: -125 },
      { id: 'soccer-1-5', name: 'Under 2.5 Goals', odds: +105 }
    ]
  }
];
}

// Current markets (will be populated from API or mock data)
let markets = getMockMarkets();

// Rob's fee - reduces payout when user follows Rob's suggestions
const ROB_FEE_PERCENTAGE = 10; // 10% reduced payout for using Rob's help

// Generate a Rob suggestion from available markets using AI analysis
async function generateRobSuggestion(type = 'single') {
  const openMarkets = markets.filter(m => new Date(m.closeTime) > new Date());
  if (openMarkets.length === 0) return null;

  const numPicks = type === 'parlay' ? Math.min(3, openMarkets.length) : 1;
  
  // Try to get AI-powered picks
  let aiAnalysis = null;
  try {
    aiAnalysis = await getAIBettingAnalysis(openMarkets, numPicks, type);
  } catch (error) {
    console.error('AI analysis failed, falling back to odds-based selection:', error.message);
  }

  let selections = [];
  let reasoning = '';
  let confidence = 75;

  if (aiAnalysis && aiAnalysis.picks && aiAnalysis.picks.length > 0) {
    // Use AI-selected picks
    for (const pick of aiAnalysis.picks) {
      const market = openMarkets.find(m => m.id === pick.marketId);
      if (market) {
        const selection = market.selections.find(s => s.id === pick.selectionId);
        if (selection) {
          selections.push({
            marketId: market.id,
            marketEvent: market.event,
            selectionId: selection.id,
            selectionName: selection.name,
            odds: selection.odds,
            sport: market.sport
          });
        }
      }
    }
    reasoning = aiAnalysis.reasoning || 'AI analysis of current odds and matchups';
    confidence = aiAnalysis.confidence || 80;
  }

  // Fallback: if AI didn't return valid picks, use odds-based selection (favorites)
  if (selections.length === 0) {
    selections = selectBestOddsPicks(openMarkets, numPicks);
    reasoning = 'Selected based on favorable odds and implied probability analysis';
    confidence = 72;
  }

  if (selections.length === 0) return null;

  const suggestion = await RobSuggestion.create({
    type,
    selections,
    feePercentage: ROB_FEE_PERCENTAGE,
    confidence,
    reasoning,
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
    usedBy: []
  });

  return suggestion;
}

// Get AI-powered betting analysis using OpenAI
async function getAIBettingAnalysis(openMarkets, numPicks, type) {
  // Format markets data for the AI
  const marketsData = openMarkets.slice(0, 10).map(m => ({
    id: m.id,
    sport: m.sport,
    event: m.event,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    startTime: m.startTime,
    selections: m.selections.map(s => ({
      id: s.id,
      name: s.name,
      odds: s.odds,
      impliedProbability: americanOddsToImpliedProbability(s.odds)
    }))
  }));

  const prompt = `You are an expert sports betting analyst. Analyze these upcoming games and their odds to identify the ${numPicks} best betting pick(s) for a ${type === 'parlay' ? 'parlay bet' : 'single bet'}.

CURRENT MARKETS:
${JSON.stringify(marketsData, null, 2)}

ANALYSIS CRITERIA:
1. Look for VALUE - where implied probability seems off
2. Consider favorites with reasonable odds (not too heavy)
3. For parlays, pick bets that are likely to hit together
4. Avoid extremely heavy favorites (worse than -300) unless very confident
5. Consider the sport and typical betting patterns

Respond in this exact JSON format:
{
  "picks": [
    {"marketId": "market_id_here", "selectionId": "selection_id_here", "reason": "brief reason"}
  ],
  "reasoning": "2-3 sentence overall analysis explaining why these picks are strong",
  "confidence": 75
}

Pick exactly ${numPicks} selection(s). Confidence should be 65-90 based on how strong you think the picks are.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are an expert sports betting analyst. You analyze odds and provide data-driven betting recommendations. Always respond with valid JSON only, no markdown."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 500,
    temperature: 0.7
  });

  const responseText = completion.choices[0].message.content.trim();
  
  // Parse JSON response (handle potential markdown code blocks)
  let jsonStr = responseText;
  if (responseText.includes('```')) {
    jsonStr = responseText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  }
  
  const analysis = JSON.parse(jsonStr);
  console.log('🤖 AI Betting Analysis:', analysis);
  return analysis;
}

// Convert American odds to implied probability
function americanOddsToImpliedProbability(odds) {
  if (odds >= 0) {
    return Math.round((100 / (odds + 100)) * 100);
  } else {
    return Math.round((Math.abs(odds) / (Math.abs(odds) + 100)) * 100);
  }
}

// Fallback: Select picks based on best odds (moderate favorites)
function selectBestOddsPicks(openMarkets, numPicks) {
  const selections = [];
  
  // Get all selections with their implied probabilities
  const allSelections = [];
  for (const market of openMarkets) {
    for (const selection of market.selections) {
      // Only consider moneyline/winner bets (skip totals for simplicity)
      if (!selection.name.includes('Over') && !selection.name.includes('Under')) {
        allSelections.push({
          market,
          selection,
          impliedProb: americanOddsToImpliedProbability(selection.odds)
        });
      }
    }
  }

  // Sort by implied probability (higher = more likely to win)
  // But filter out extremely heavy favorites (>80% implied prob)
  const goodPicks = allSelections
    .filter(s => s.impliedProb >= 55 && s.impliedProb <= 75)
    .sort((a, b) => b.impliedProb - a.impliedProb);

  // Take the best picks from different markets
  const usedMarkets = new Set();
  for (const pick of goodPicks) {
    if (usedMarkets.has(pick.market.id)) continue;
    if (selections.length >= numPicks) break;
    
    selections.push({
      marketId: pick.market.id,
      marketEvent: pick.market.event,
      selectionId: pick.selection.id,
      selectionName: pick.selection.name,
      odds: pick.selection.odds,
      sport: pick.market.sport
    });
    usedMarkets.add(pick.market.id);
  }

  // If we don't have enough, add any favorites
  if (selections.length < numPicks) {
    const remaining = allSelections
      .filter(s => !usedMarkets.has(s.market.id))
      .sort((a, b) => b.impliedProb - a.impliedProb);
    
    for (const pick of remaining) {
      if (selections.length >= numPicks) break;
      selections.push({
        marketId: pick.market.id,
        marketEvent: pick.market.event,
        selectionId: pick.selection.id,
        selectionName: pick.selection.name,
        odds: pick.selection.odds,
        sport: pick.market.sport
      });
      usedMarkets.add(pick.market.id);
    }
  }

  return selections;
}

// Apply Rob's fee to American odds (reduces payout)
function applyRobFee(americanOdds, feePercentage) {
  // Fee reduces payout for the user when they follow Rob's picks
  // For positive odds: reduce the plus value (e.g., +200 -> +180)
  // For negative odds: make them more negative (e.g., -110 -> -122)
  const feeFactor = 1 - (feePercentage / 100);
  
  if (americanOdds >= 0) {
    return Math.round(americanOdds * feeFactor);
  } else {
    // For negative odds, we reduce the payout by making odds more negative
    return Math.round(americanOdds / feeFactor);
  }
}

// Check if a bet matches a Rob suggestion
async function findMatchingSuggestion(selections) {
  const now = new Date();
  
  const activeSuggestions = await RobSuggestion.find({ expiresAt: { $gt: now } });
  
  for (const suggestion of activeSuggestions) {
    // Check if all selections match
    const allMatch = selections.every(sel => 
      suggestion.selections.some(robSel => 
        robSel.marketId === sel.marketId && robSel.selectionId === sel.selectionId
      )
    );
    
    if (allMatch && selections.length === suggestion.selections.length) {
      return suggestion;
    }
  }
  return null;
}

// Get markets (now uses The Odds API with fallback to mock data)
app.get('/api/markets', async (req, res) => {
  try {
    const { sport } = req.query;

    // Fetch markets from API (with caching) or use mock data
    const fetchedMarkets = await getMarketsData(sport);
    
    // Update the global markets variable for other functions
    if (fetchedMarkets && fetchedMarkets.length > 0) {
      // If fetching all, update the global cache
      if (!sport || sport === 'all') {
        markets = fetchedMarkets;
      }
    }

    // Update market status based on close time
    const filteredMarkets = fetchedMarkets.map(market => ({
      ...market,
      status: new Date(market.closeTime) > new Date() ? 'open' : 'closed'
    }));

    res.json({ success: true, markets: filteredMarkets });
  } catch (error) {
    console.error('Error fetching markets:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch markets' });
  }
});

// #8 - place single bets
// #9 - place parlay bets
app.post('/api/bets', async (req, res) => {
  try {
    const { userId, bets: betsToPlace } = req.body;

    if (!userId || !betsToPlace || betsToPlace.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid bet data' });
    }

    // Get user balance
    let user = await User.findOne({ odId: userId });
    if (!user) {
      user = await User.create({ odId: userId, balance: 0 });
    }
    let balance = user.balance;

    // Calculate total stake
    const totalStake = betsToPlace.reduce((sum, bet) => sum + bet.stake, 0);

    if (totalStake > balance) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // Validate all markets are open
    for (const bet of betsToPlace) {
      for (const selection of bet.selections) {
        const market = markets.find(m => m.id === selection.marketId);
        if (!market || new Date(market.closeTime) <= new Date()) {
          return res.status(400).json({ 
            success: false, 
            error: `Market ${selection.marketEvent} is closed` 
          });
        }
      }
    }

    // Create bet records
    const createdBets = [];
    for (const bet of betsToPlace) {
      // Check if this bet matches a Rob suggestion
      const matchingSuggestion = await findMatchingSuggestion(bet.selections);
      
      let finalOdds = bet.combinedOdds;
      let suggestionId = null;
      let discountApplied = 0;
      let isRobPick = false;

      if (matchingSuggestion) {
        // Apply Rob's fee to odds (reduces payout)
        finalOdds = applyRobFee(bet.combinedOdds, matchingSuggestion.feePercentage);
        suggestionId = matchingSuggestion._id.toString();
        discountApplied = matchingSuggestion.feePercentage;
        isRobPick = true;
        
        // Track that this user used the suggestion
        if (!matchingSuggestion.usedBy.includes(userId)) {
          matchingSuggestion.usedBy.push(userId);
          await matchingSuggestion.save();
        }
      }

      const potentialPayout = calculatePayout(finalOdds, bet.stake);
      
      // Get event time from the first selection's market
      let eventTime = new Date();
      if (bet.selections && bet.selections.length > 0) {
        const market = markets.find(m => m.id === bet.selections[0].marketId);
        if (market && market.startTime) {
          eventTime = new Date(market.startTime);
        }
      }

      const newBet = await Bet.create({
        odId: userId,
        type: bet.type,
        selections: bet.selections,
        stake: bet.stake,
        originalOdds: bet.combinedOdds,
        combinedOdds: finalOdds,
        potentialPayout,
        status: 'open',
        canCancel: true,
        isRobPick,
        suggestionId,
        discountApplied,
        eventTime
      });

      // Convert to frontend-compatible format
      const betObj = newBet.toObject();
      betObj.id = newBet._id.toString();
      betObj.userId = newBet.odId;
      betObj.createdAt = newBet.createdAt.toISOString();
      createdBets.push(betObj);
    }

    // Deduct balance
    balance -= totalStake;
    user.balance = balance;
    await user.save();

    res.json({ 
      success: true, 
      bets: createdBets,
      newBalance: balance,
      robPicksApplied: createdBets.filter(b => b.isRobPick).length
    });
  } catch (error) {
    console.error('Error placing bet:', error);
    res.status(500).json({ success: false, error: 'Failed to place bet' });
  }
});

// Get user's bets
app.get('/api/bets', async (req, res) => {
  try {
    const { userId, status } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    let query = { odId: userId };

    if (status === 'open') {
      query.status = 'open';
    } else if (status === 'settled') {
      query.status = { $in: ['won', 'lost', 'cancelled'] };
    }

    const bets = await Bet.find(query).sort({ createdAt: -1 });

    // Convert to frontend-compatible format and update canCancel
    const formattedBets = bets.map(bet => {
      const obj = bet.toObject();
      obj.id = bet._id.toString();
      obj.userId = bet.odId;
      obj.createdAt = bet.createdAt.toISOString();

      if (bet.status === 'open') {
        // Check if all markets are still open
        const allMarketsOpen = bet.selections.every(sel => {
          const market = markets.find(m => m.id === sel.marketId);
          return market && new Date(market.closeTime) > new Date();
        });
        obj.canCancel = allMarketsOpen;
      }

      return obj;
    });

    res.json({ success: true, bets: formattedBets });
  } catch (error) {
    console.error('Error fetching bets:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bets' });
  }
});

// #10 - cancel pending bets
app.post('/api/bets/:betId/cancel', async (req, res) => {
  try {
    const { betId } = req.params;
    const { userId } = req.body;

    const bet = await Bet.findById(betId);

    if (!bet) {
      return res.status(404).json({ success: false, error: 'Bet not found' });
    }

    if (bet.odId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    if (bet.status !== 'open') {
      return res.status(400).json({ success: false, error: 'Bet is not open' });
    }

    // Check if all markets are still open (cancellation allowed)
    const allMarketsOpen = bet.selections.every(sel => {
      const market = markets.find(m => m.id === sel.marketId);
      return market && new Date(market.closeTime) > new Date();
    });

    if (!allMarketsOpen) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot cancel - market has closed' 
      });
    }

    // Cancel bet and refund
    bet.status = 'cancelled';
    bet.canCancel = false;
    bet.cancelledAt = new Date();
    await bet.save();

    // Refund stake
    const user = await User.findOne({ odId: userId });
    if (user) {
      user.balance += bet.stake;
      await user.save();
    }

    res.json({ 
      success: true, 
      newBalance: user ? user.balance : 0
    });
  } catch (error) {
    console.error('Error cancelling bet:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel bet' });
  }
});

// Helper function to calculate payout
function calculatePayout(americanOdds, stake) {
  if (americanOdds >= 0) {
    return stake + (stake * americanOdds / 100);
  } else {
    return stake + (stake * 100 / Math.abs(americanOdds));
  }
}

// #19 - rob ai chat assistant
app.get('/api/rob/chat', async (req, res) => {
  try {
    // Return last 50 messages
    const messages = await RobMessage.find().sort({ createdAt: -1 }).limit(50);
    const formattedMessages = messages.reverse().map(m => {
      const obj = m.toObject();
      obj.id = m._id.toString();
      obj.userId = m.odId;
      obj.createdAt = m.createdAt.toISOString();
      return obj;
    });
    res.json({ success: true, messages: formattedMessages });
  } catch (error) {
    console.error('Error fetching Rob chat:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch chat' });
  }
});

// Post a message to Rob chat (user message)
app.post('/api/rob/chat', async (req, res) => {
  try {
    const { userId, username, message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message required' });
    }

    // Add user message to DB
    const userMsg = await RobMessage.create({
      type: 'user',
      odId: userId,
      username: username || 'User',
      content: message
    });

    const userMessage = {
      id: userMsg._id.toString(),
      type: 'user',
      userId,
      username: username || 'User',
      content: message,
      createdAt: userMsg.createdAt.toISOString()
    };

    // Generate Rob's response using OpenAI with live odds context
    let robResponse;
    try {
      // Get current markets for context
      const openMarkets = markets.filter(m => new Date(m.closeTime) > new Date()).slice(0, 5);
      const marketsContext = openMarkets.length > 0 
        ? `\n\nCURRENT LIVE GAMES & ODDS:\n${openMarkets.map(m => 
            `${m.sport.toUpperCase()}: ${m.event} - ${m.selections.slice(0, 4).map(s => `${s.name} (${s.odds >= 0 ? '+' : ''}${s.odds})`).join(', ')}`
          ).join('\n')}`
        : '';

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are Rob, an AI sports betting assistant for Pay Day. You help users with betting advice, explain odds, and provide insights based on REAL live odds data. You're friendly, knowledgeable, and always remind users to bet responsibly. 

When users ask about picks or who to bet on:
- Reference the actual live games and odds you have access to
- Explain WHY a bet might be good (implied probability, value, matchup)
- For official picks with reduced odds, tell them to click "Get Rob's Pick" button

Keep responses concise (2-4 sentences). Be specific about games when relevant.${marketsContext}`
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 200
      });
      robResponse = completion.choices[0].message.content;
    } catch (aiError) {
      console.error('OpenAI error:', aiError);
      robResponse = "I'm having trouble connecting right now. Try clicking 'Get Rob's Pick' for my latest suggestion!";
    }

    // Add Rob's response to DB
    const robMsg = await RobMessage.create({
      type: 'rob',
      content: robResponse
    });

    const robMessage = {
      id: robMsg._id.toString(),
      type: 'rob',
      content: robResponse,
      createdAt: robMsg.createdAt.toISOString()
    };

    res.json({ 
      success: true, 
      userMessage,
      robMessage
    });
  } catch (error) {
    console.error('Error in Rob chat:', error);
    res.status(500).json({ success: false, error: 'Failed to process message' });
  }
});

// Get Rob's current suggestions
app.get('/api/rob/suggestions', async (req, res) => {
  try {
    const now = new Date();
    // Return only active (non-expired) suggestions
    const activeSuggestions = await RobSuggestion.find({ expiresAt: { $gt: now } });
    const formatted = activeSuggestions.map(s => {
      const obj = s.toObject();
      obj.id = s._id.toString();
      obj.createdAt = s.createdAt.toISOString();
      obj.expiresAt = s.expiresAt.toISOString();
      return obj;
    });
    res.json({ success: true, suggestions: formatted });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch suggestions' });
  }
});

// #18 - rob ai betting suggestions
app.post('/api/rob/suggest', async (req, res) => {
  try {
    const { type = 'single' } = req.body;

    const suggestion = await generateRobSuggestion(type);

    if (!suggestion) {
      return res.status(400).json({ 
        success: false, 
        error: 'No open markets available for suggestions' 
      });
    }

    // Create a chat message for the suggestion
    const pickMessage = formatSuggestionMessage(suggestion);
    const robMsg = await RobMessage.create({
      type: 'rob-suggestion',
      suggestionId: suggestion._id.toString(),
      content: pickMessage,
      suggestion: suggestion.toObject()
    });

    const robMessage = {
      id: robMsg._id.toString(),
      type: 'rob-suggestion',
      suggestionId: suggestion._id.toString(),
      content: pickMessage,
      suggestion: {
        ...suggestion.toObject(),
        id: suggestion._id.toString(),
        createdAt: suggestion.createdAt.toISOString(),
        expiresAt: suggestion.expiresAt.toISOString()
      },
      createdAt: robMsg.createdAt.toISOString()
    };

    res.json({ 
      success: true, 
      suggestion: {
        ...suggestion.toObject(),
        id: suggestion._id.toString(),
        createdAt: suggestion.createdAt.toISOString(),
        expiresAt: suggestion.expiresAt.toISOString()
      },
      chatMessage: robMessage
    });
  } catch (error) {
    console.error('Error generating suggestion:', error);
    res.status(500).json({ success: false, error: 'Failed to generate suggestion' });
  }
});

// Format suggestion for chat display
function formatSuggestionMessage(suggestion) {
  const picks = suggestion.selections.map(s => 
    `${s.selectionName} (${formatOddsDisplay(s.odds)})`
  ).join(suggestion.type === 'parlay' ? ' + ' : '');

  const typeLabel = suggestion.type === 'parlay' ? '🎯 PARLAY PICK' : '📌 SINGLE PICK';
  
  return `${typeLabel}\n\n${picks}\n\n💡 ${suggestion.reasoning}\n\n⚠️ ${suggestion.feePercentage}% reduced payout (Rob's fee for the assist)\n⏰ Valid for 2 hours\n📊 Confidence: ${suggestion.confidence}%`;
}

function formatOddsDisplay(odds) {
  return odds >= 0 ? `+${odds}` : `${odds}`;
}

// Get suggestion by ID
app.get('/api/rob/suggestions/:suggestionId', async (req, res) => {
  try {
    const { suggestionId } = req.params;
    const suggestion = await RobSuggestion.findById(suggestionId);

    if (!suggestion) {
      return res.status(404).json({ success: false, error: 'Suggestion not found' });
    }

    const formatted = {
      ...suggestion.toObject(),
      id: suggestion._id.toString(),
      createdAt: suggestion.createdAt.toISOString(),
      expiresAt: suggestion.expiresAt.toISOString()
    };

    res.json({ success: true, suggestion: formatted });
  } catch (error) {
    console.error('Error fetching suggestion:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch suggestion' });
  }
});

// #5 - change email/password
// #25 - password reset via email
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token
    await PasswordReset.create({ email, token, expiresAt });

    // In production, you'd send an email here
    // For demo, we return the token (in real app, send via email)
    console.log(`🔑 Password reset token for ${email}: ${token}`);

    res.json({ 
      success: true, 
      message: 'Password reset link sent to your email',
      // For demo purposes only - remove in production
      demoToken: token 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ success: false, error: 'Failed to process reset request' });
  }
});

// Verify reset token
app.get('/api/auth/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const resetRecord = await PasswordReset.findOne({ 
      token, 
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!resetRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }

    res.json({ success: true, email: resetRecord.email });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify token' });
  }
});

// Complete password reset (mark token as used)
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token } = req.body;
    
    const resetRecord = await PasswordReset.findOne({ 
      token, 
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!resetRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }

    // Mark token as used
    resetRecord.used = true;
    await resetRecord.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

// #6 - delete account with data purge
app.delete('/api/users/:userId/account', async (req, res) => {
  try {
    const { userId } = req.params;
    const { confirmDelete } = req.body;

    if (!confirmDelete) {
      return res.status(400).json({ success: false, error: 'Deletion not confirmed' });
    }

    // Delete all user data
    const deleteResults = {
      user: await User.deleteOne({ odId: userId }),
      posts: await Post.deleteMany({ odId: userId }),
      bets: await Bet.deleteMany({ odId: userId }),
      messages: await Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] }),
      withdrawals: await Withdrawal.deleteMany({ odId: userId }),
      robMessages: await RobMessage.deleteMany({ odId: userId })
    };

    // Remove user from followers/following lists
    await User.updateMany(
      { followers: userId },
      { $pull: { followers: userId } }
    );
    await User.updateMany(
      { following: userId },
      { $pull: { following: userId } }
    );

    console.log(`🗑️ Account deleted for user ${userId}:`, deleteResults);

    res.json({ 
      success: true, 
      message: 'Account and all associated data have been permanently deleted',
      deletedCounts: {
        posts: deleteResults.posts.deletedCount,
        bets: deleteResults.bets.deletedCount,
        messages: deleteResults.messages.deletedCount
      }
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});

// #13 - withdrawal requests (simulated)
app.post('/api/users/:userId/withdraw', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid withdrawal amount' });
    }

    const user = await User.findOne({ odId: userId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // Deduct balance immediately (funds on hold)
    user.balance -= amount;
    await user.save();

    // Create withdrawal request
    const withdrawal = await Withdrawal.create({
      odId: userId,
      username: user.username,
      amount,
      status: 'pending'
    });

    res.json({ 
      success: true, 
      withdrawal: {
        id: withdrawal._id.toString(),
        amount: withdrawal.amount,
        status: withdrawal.status,
        requestedAt: withdrawal.createdAt.toISOString()
      },
      newBalance: user.balance,
      message: 'Withdrawal request submitted. Processing typically takes 1-3 business days.'
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ success: false, error: 'Failed to process withdrawal' });
  }
});

// Get user's withdrawal history
app.get('/api/users/:userId/withdrawals', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const withdrawals = await Withdrawal.find({ odId: userId }).sort({ createdAt: -1 });
    
    const formatted = withdrawals.map(w => ({
      id: w._id.toString(),
      amount: w.amount,
      status: w.status,
      requestedAt: w.createdAt.toISOString(),
      processedAt: w.processedAt ? w.processedAt.toISOString() : null,
      notes: w.notes
    }));

    res.json({ success: true, withdrawals: formatted });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawals' });
  }
});

// Cancel pending withdrawal
app.post('/api/withdrawals/:withdrawalId/cancel', async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { userId } = req.body;

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({ success: false, error: 'Withdrawal not found' });
    }

    if (withdrawal.odId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Only pending withdrawals can be cancelled' });
    }

    // Refund the amount
    const user = await User.findOne({ odId: userId });
    if (user) {
      user.balance += withdrawal.amount;
      await user.save();
    }

    withdrawal.status = 'rejected';
    withdrawal.notes = 'Cancelled by user';
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    res.json({ 
      success: true, 
      newBalance: user ? user.balance : 0,
      message: 'Withdrawal cancelled and funds returned to your wallet'
    });
  } catch (error) {
    console.error('Cancel withdrawal error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel withdrawal' });
  }
});

// #22 - player/team statistics display
app.get('/api/stats/:sport', async (req, res) => {
  try {
    const { sport } = req.params;
    const { team, player } = req.query;

    // Mock statistics data - in production, fetch from stats provider
    const stats = {
      nfl: [
        { team: 'Kansas City Chiefs', record: '12-4', pointsPerGame: 28.5, pointsAllowed: 21.2, lastFive: 'WWWLW' },
        { team: 'Buffalo Bills', record: '11-5', pointsPerGame: 27.8, pointsAllowed: 20.5, lastFive: 'WLWWW' },
        { team: 'Philadelphia Eagles', record: '13-3', pointsPerGame: 29.1, pointsAllowed: 19.8, lastFive: 'WWWWL' },
        { team: 'Dallas Cowboys', record: '10-6', pointsPerGame: 25.4, pointsAllowed: 22.1, lastFive: 'LWWLW' }
      ],
      nba: [
        { team: 'Boston Celtics', record: '28-10', pointsPerGame: 118.5, pointsAllowed: 109.2, lastFive: 'WWWWL' },
        { team: 'Los Angeles Lakers', record: '22-16', pointsPerGame: 115.8, pointsAllowed: 113.5, lastFive: 'WLWLW' },
        { team: 'Golden State Warriors', record: '18-20', pointsPerGame: 112.4, pointsAllowed: 114.1, lastFive: 'LLWLW' },
        { team: 'Miami Heat', record: '20-18', pointsPerGame: 110.2, pointsAllowed: 108.8, lastFive: 'WLWWL' }
      ],
      nhl: [
        { team: 'Toronto Maple Leafs', record: '25-12-4', goalsPerGame: 3.4, goalsAllowed: 2.8, lastFive: 'WWLWW' },
        { team: 'Montreal Canadiens', record: '18-20-3', goalsPerGame: 2.9, goalsAllowed: 3.2, lastFive: 'LWLLW' }
      ],
      mlb: [
        { team: 'New York Yankees', record: '95-67', runsPerGame: 5.2, runsAllowed: 4.1, lastFive: 'WWLWL' },
        { team: 'Boston Red Sox', record: '88-74', runsPerGame: 4.8, runsAllowed: 4.5, lastFive: 'LWWLW' }
      ],
      soccer: [
        { team: 'Manchester United', record: '12W-5D-8L', goalsPerGame: 1.8, goalsAllowed: 1.4, lastFive: 'WDLWW' },
        { team: 'Liverpool', record: '18W-3D-4L', goalsPerGame: 2.4, goalsAllowed: 0.9, lastFive: 'WWWDW' }
      ]
    };

    const sportStats = stats[sport] || [];
    
    // Filter by team if specified
    let filteredStats = sportStats;
    if (team) {
      filteredStats = sportStats.filter(s => 
        s.team.toLowerCase().includes(team.toLowerCase())
      );
    }

    res.json({ 
      success: true, 
      sport,
      stats: filteredStats,
      source: 'mock', // Would be 'live' with real provider
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// #23 - direct messaging (dm)
app.get('/api/messages/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get unique conversation partners
    const sent = await Message.distinct('receiverId', { senderId: userId });
    const received = await Message.distinct('senderId', { receiverId: userId });
    const partnerIds = [...new Set([...sent, ...received])];

    // Get last message and unread count for each conversation
    const conversations = await Promise.all(partnerIds.map(async (partnerId) => {
      const lastMessage = await Message.findOne({
        $or: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId }
        ]
      }).sort({ createdAt: -1 });

      const unreadCount = await Message.countDocuments({
        senderId: partnerId,
        receiverId: userId,
        read: false
      });

      const partner = await User.findOne({ odId: partnerId });

      return {
        odId: partnerId,
        username: partner?.username || 'Unknown User',
        photoUrl: partner?.photoUrl || '',
        lastMessage: lastMessage?.content || '',
        lastMessageTime: lastMessage?.createdAt?.toISOString() || null,
        unreadCount
      };
    }));

    // Sort by last message time
    conversations.sort((a, b) => 
      new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
    );

    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Conversations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
});

// Get messages with a specific user
app.get('/api/messages/:userId/:partnerId', async (req, res) => {
  try {
    const { userId, partnerId } = req.params;
    const { limit = 50, before } = req.query;

    let query = {
      $or: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId }
      ]
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Mark received messages as read
    await Message.updateMany(
      { senderId: partnerId, receiverId: userId, read: false },
      { read: true }
    );

    const formatted = messages.reverse().map(m => ({
      id: m._id.toString(),
      senderId: m.senderId,
      senderUsername: m.senderUsername,
      receiverId: m.receiverId,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      isOwn: m.senderId === userId
    }));

    res.json({ success: true, messages: formatted });
  } catch (error) {
    console.error('Messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// Send a message
app.post('/api/messages', async (req, res) => {
  try {
    const { senderId, senderUsername, receiverId, content } = req.body;

    if (!senderId || !receiverId || !content) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const receiver = await User.findOne({ odId: receiverId });

    const message = await Message.create({
      senderId,
      senderUsername: senderUsername || 'User',
      receiverId,
      receiverUsername: receiver?.username || 'User',
      content
    });

    res.json({ 
      success: true, 
      message: {
        id: message._id.toString(),
        senderId: message.senderId,
        senderUsername: message.senderUsername,
        receiverId: message.receiverId,
        content: message.content,
        createdAt: message.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// Report a message
app.post('/api/messages/:messageId/report', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, reason } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    message.reported = true;
    message.reportReason = reason || 'No reason provided';
    await message.save();

    console.log(`⚠️ Message ${messageId} reported by ${userId}: ${reason}`);

    res.json({ success: true, message: 'Message reported to moderators' });
  } catch (error) {
    console.error('Report message error:', error);
    res.status(500).json({ success: false, error: 'Failed to report message' });
  }
});

// Get unread message count
app.get('/api/messages/unread/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await Message.countDocuments({ receiverId: userId, read: false });
    res.json({ success: true, unreadCount: count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

// #28 - help, legal disclaimers, age verification
app.get('/api/legal/:type', (req, res) => {
  const { type } = req.params;

  const content = {
    terms: {
      title: 'Terms of Service',
      lastUpdated: '2024-01-01',
      content: `
        <h2>Pay Day Terms of Service</h2>
        <p><strong>Last Updated:</strong> January 1, 2024</p>
        
        <h3>1. Acceptance of Terms</h3>
        <p>By accessing or using Pay Day, you agree to be bound by these Terms of Service.</p>
        
        <h3>2. Eligibility</h3>
        <p>You must be at least 21 years old to use the betting features of this platform. Age verification is required.</p>
        
        <h3>3. Virtual Currency</h3>
        <p>All currency on Pay Day is virtual and for entertainment purposes only. Virtual coins have no real-world monetary value and cannot be exchanged for real money.</p>
        
        <h3>4. Responsible Gaming</h3>
        <p>We encourage responsible gaming. If you feel you may have a gambling problem, please seek help from organizations like the National Council on Problem Gambling (1-800-522-4700).</p>
        
        <h3>5. Account Security</h3>
        <p>You are responsible for maintaining the security of your account credentials.</p>
        
        <h3>6. Prohibited Activities</h3>
        <p>Users may not: use bots or automated systems, manipulate odds or outcomes, create multiple accounts, or engage in fraudulent activity.</p>
      `
    },
    privacy: {
      title: 'Privacy Policy',
      lastUpdated: '2024-01-01',
      content: `
        <h2>Pay Day Privacy Policy</h2>
        <p><strong>Last Updated:</strong> January 1, 2024</p>
        
        <h3>Information We Collect</h3>
        <p>We collect: email address, username, date of birth, and betting activity for platform functionality.</p>
        
        <h3>How We Use Information</h3>
        <p>Your information is used to: provide our services, verify age eligibility, prevent fraud, and improve user experience.</p>
        
        <h3>Data Security</h3>
        <p>We implement industry-standard security measures to protect your data. Payment information is tokenized and never stored on our servers.</p>
        
        <h3>Your Rights</h3>
        <p>You may request deletion of your account and associated data at any time through the Account settings.</p>
      `
    },
    disclaimer: {
      title: 'Betting Disclaimer',
      lastUpdated: '2024-01-01',
      content: `
        <h2>Important Betting Disclaimer</h2>
        
        <p><strong>⚠️ FOR ENTERTAINMENT PURPOSES ONLY</strong></p>
        
        <p>Pay Day is a simulated sports betting platform using virtual currency. No real money is wagered, won, or lost.</p>
        
        <h3>Age Restriction</h3>
        <p>Users must be 21 years or older to access betting features. Age verification is required.</p>
        
        <h3>No Guarantee of Accuracy</h3>
        <p>Odds and statistics are provided for entertainment. We make no guarantees about accuracy or outcomes.</p>
        
        <h3>AI Suggestions</h3>
        <p>Rob's AI-powered suggestions are for entertainment only and should not be considered financial advice. Past performance does not guarantee future results.</p>
        
        <h3>Responsible Gaming</h3>
        <p>If you or someone you know has a gambling problem, call 1-800-522-4700 (National Council on Problem Gambling).</p>
      `
    },
    help: {
      title: 'Help & FAQ',
      lastUpdated: '2024-01-01',
      content: `
        <h2>Help Center</h2>
        
        <h3>Getting Started</h3>
        <p><strong>Q: How do I create an account?</strong><br>
        A: Click "Sign Up" and provide your email, username, password, and date of birth.</p>
        
        <p><strong>Q: How do I add funds?</strong><br>
        A: Go to Account > Add Funds to deposit virtual currency into your wallet.</p>
        
        <h3>Betting</h3>
        <p><strong>Q: How do I place a bet?</strong><br>
        A: Browse markets, click on a selection to add it to your bet slip, enter your stake, and click "Place Bet".</p>
        
        <p><strong>Q: What is a parlay?</strong><br>
        A: A parlay combines multiple selections into one bet. All selections must win for the parlay to pay out.</p>
        
        <p><strong>Q: Who is Rob?</strong><br>
        A: Rob is our AI assistant who analyzes games and suggests bets. His picks have a 10% fee on winnings.</p>
        
        <h3>Account</h3>
        <p><strong>Q: How do I withdraw funds?</strong><br>
        A: Go to Account > Withdraw Funds. Withdrawals are processed within 1-3 business days.</p>
        
        <p><strong>Q: How do I delete my account?</strong><br>
        A: Go to Account and click "Delete Account". This action is permanent.</p>
      `
    }
  };

  const doc = content[type];
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Document not found' });
  }

  res.json({ success: true, ...doc });
});

// Age verification check
app.post('/api/verify-age', async (req, res) => {
  try {
    const { userId, birthday } = req.body;

    if (!birthday) {
      return res.status(400).json({ success: false, error: 'Birthday is required' });
    }

    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    const isEligible = age >= 21;

    res.json({ 
      success: true, 
      age,
      isEligible,
      message: isEligible 
        ? 'Age verified. You are eligible to use betting features.' 
        : 'You must be 21 or older to access betting features.'
    });
  } catch (error) {
    console.error('Age verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify age' });
  }
});

// ========================================
// #21: TRANSACTION HISTORY
// ========================================

app.get('/api/users/:userId/transactions', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, startDate, endDate } = req.query;

    // Get bets
    const bets = await Bet.find({ odId: userId }).sort({ createdAt: -1 }).limit(50);
    const betTransactions = bets.map(b => ({
      id: b._id.toString(),
      type: 'bet',
      description: `${b.type} bet - ${b.selections.map(s => s.selectionName).join(', ')}`,
      amount: -b.stake,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
      payout: b.status === 'won' ? b.potentialPayout : 0
    }));

    // Get withdrawals
    const withdrawals = await Withdrawal.find({ odId: userId }).sort({ createdAt: -1 }).limit(50);
    const withdrawalTransactions = withdrawals.map(w => ({
      id: w._id.toString(),
      type: 'withdrawal',
      description: `Withdrawal request`,
      amount: -w.amount,
      status: w.status,
      createdAt: w.createdAt.toISOString()
    }));

    // Combine and sort
    let transactions = [...betTransactions, ...withdrawalTransactions];
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Filter by type if specified
    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }

    // Filter by date range if specified
    if (startDate) {
      transactions = transactions.filter(t => new Date(t.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      transactions = transactions.filter(t => new Date(t.createdAt) <= new Date(endDate));
    }

    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

// #24 - full settings page (privacy/notifications)
app.get('/api/users/:userId/settings', async (req, res) => {
  try {
    const { userId } = req.params;
    
    let settings = await Settings.findOne({ odId: userId });
    
    // Create default settings if none exist
    if (!settings) {
      settings = new Settings({ odId: userId });
      await settings.save();
    }
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// Update user settings
app.put('/api/users/:userId/settings', async (req, res) => {
  try {
    const { userId } = req.params;
    const { privacy, notifications, display, betting } = req.body;
    
    let settings = await Settings.findOne({ odId: userId });
    
    if (!settings) {
      settings = new Settings({ odId: userId });
    }
    
    // Update privacy settings
    if (privacy) {
      settings.privacy = { ...settings.privacy.toObject(), ...privacy };
    }
    
    // Update notification settings
    if (notifications) {
      settings.notifications = { ...settings.notifications.toObject(), ...notifications };
    }
    
    // Update display settings
    if (display) {
      settings.display = { ...settings.display.toObject(), ...display };
    }
    
    // Update betting settings
    if (betting) {
      settings.betting = { ...settings.betting.toObject(), ...betting };
    }
    
    await settings.save();
    
    res.json({ success: true, settings, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// Update specific setting category
app.patch('/api/users/:userId/settings/:category', async (req, res) => {
  try {
    const { userId, category } = req.params;
    const updates = req.body;
    
    const validCategories = ['privacy', 'notifications', 'display', 'betting'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid settings category' });
    }
    
    let settings = await Settings.findOne({ odId: userId });
    
    if (!settings) {
      settings = new Settings({ odId: userId });
    }
    
    settings[category] = { ...settings[category].toObject(), ...updates };
    await settings.save();
    
    res.json({ success: true, settings, message: `${category} settings updated` });
  } catch (error) {
    console.error('Patch settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// Reset settings to defaults
app.post('/api/users/:userId/settings/reset', async (req, res) => {
  try {
    const { userId } = req.params;
    const { category } = req.body;
    
    let settings = await Settings.findOne({ odId: userId });
    
    if (!settings) {
      settings = new Settings({ odId: userId });
      await settings.save();
      return res.json({ success: true, settings, message: 'Settings reset to defaults' });
    }
    
    // Reset specific category or all
    if (category) {
      const defaults = {
        privacy: {
          profileVisibility: 'public',
          showBettingHistory: true,
          showWalletBalance: false,
          allowDirectMessages: 'everyone',
          showOnlineStatus: true,
          showActivityStatus: true
        },
        notifications: {
          emailNotifications: true,
          betResults: true,
          newFollowers: true,
          directMessages: true,
          robSuggestions: true,
          promotions: false,
          weeklyDigest: true
        },
        display: {
          theme: 'light',
          oddsFormat: 'american',
          timezone: 'America/Los_Angeles',
          language: 'en'
        },
        betting: {
          defaultStake: 10,
          confirmBets: true,
          showOddsChanges: true,
          autoAcceptOddsChanges: false
        }
      };
      
      if (defaults[category]) {
        settings[category] = defaults[category];
      }
    } else {
      // Reset all - delete and recreate
      await Settings.deleteOne({ odId: userId });
      settings = new Settings({ odId: userId });
    }
    
    await settings.save();
    res.json({ success: true, settings, message: 'Settings reset to defaults' });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset settings' });
  }
});

// Export user data (GDPR compliance)
app.get('/api/users/:userId/export-data', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findOne({ odId: userId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const settings = await Settings.findOne({ odId: userId });
    const posts = await Post.find({ odId: userId });
    const bets = await Bet.find({ odId: userId });
    const messages = await Message.find({ $or: [{ senderId: userId }, { receiverId: userId }] });
    const withdrawals = await Withdrawal.find({ odId: userId });
    
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        username: user.username,
        email: user.email,
        birthday: user.birthday,
        bio: user.bio,
        balance: user.balance,
        createdAt: user.createdAt
      },
      settings: settings || {},
      posts: posts.map(p => ({
        content: p.content,
        createdAt: p.createdAt,
        likes: p.likes?.length || 0,
        comments: p.comments?.length || 0
      })),
      bets: bets.map(b => ({
        event: b.event,
        selection: b.selection,
        stake: b.stake,
        odds: b.odds,
        status: b.status,
        createdAt: b.createdAt
      })),
      messages: messages.map(m => ({
        content: m.content,
        createdAt: m.createdAt,
        type: m.senderId === userId ? 'sent' : 'received'
      })),
      withdrawals: withdrawals.map(w => ({
        amount: w.amount,
        status: w.status,
        requestedAt: w.requestedAt
      }))
    };
    
    res.json({ success: true, data: exportData });
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ success: false, error: 'Failed to export data' });
  }
});

// ========================================
// BET SETTLEMENT SYSTEM (#17)
// ========================================

// Calculate win probability from American odds
function getWinProbabilityFromOdds(americanOdds) {
  if (americanOdds >= 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

// Simulate bet outcome based on odds (favorites win more often)
function simulateBetOutcome(odds) {
  const winProbability = getWinProbabilityFromOdds(odds);
  // Add some randomness but respect the odds
  const adjustedProbability = winProbability * 0.9 + Math.random() * 0.1;
  return Math.random() < adjustedProbability;
}

// Calculate payout for winning bet
function calculateWinnings(stake, americanOdds) {
  if (americanOdds >= 0) {
    return stake + (stake * americanOdds / 100);
  } else {
    return stake + (stake * 100 / Math.abs(americanOdds));
  }
}

// Settle a single bet
async function settleBet(bet, forceResult = null) {
  if (bet.status !== 'open') return null;
  
  // Use combinedOdds (stored in bet) or fallback to -110
  const odds = bet.combinedOdds || bet.originalOdds || -110;
  const isWin = forceResult !== null ? forceResult : simulateBetOutcome(odds);
  
  bet.status = isWin ? 'won' : 'lost';
  bet.settledAt = new Date();
  
  if (isWin) {
    const winnings = calculateWinnings(bet.stake, odds);
    bet.payout = winnings;
    
    // Credit user's balance
    const user = await User.findOne({ odId: bet.odId });
    if (user) {
      user.balance += winnings;
      await user.save();
    }
  } else {
    bet.payout = 0;
  }
  
  await bet.save();
  return bet;
}

// Auto-settle bets for events that have ended
async function autoSettleBets() {
  try {
    const now = new Date();
    
    // Find open bets where the event has ended (closeTime + 3 hours for game duration)
    const openBets = await Bet.find({ status: 'open' });
    
    let settledCount = 0;
    for (const bet of openBets) {
      // Check if event time has passed (add 3 hours buffer for game completion)
      const eventEndTime = new Date(bet.eventTime || bet.createdAt);
      eventEndTime.setHours(eventEndTime.getHours() + 3);
      
      if (now > eventEndTime) {
        await settleBet(bet);
        settledCount++;
        console.log(`🎲 Auto-settled bet ${bet._id}: ${bet.status}`);
      }
    }
    
    if (settledCount > 0) {
      console.log(`✅ Auto-settled ${settledCount} bets`);
    }
    
    return settledCount;
  } catch (error) {
    console.error('Auto-settle error:', error);
    return 0;
  }
}

// #17 - automated bet settlement
setInterval(autoSettleBets, 5 * 60 * 1000);

// #27 - admin moderation panel
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'payday2024!'
};

// Admin sessions (in-memory, use Redis/DB in production)
const adminSessions = new Map();

// Generate session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Verify admin session
function verifyAdminSession(token) {
  const session = adminSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    const token = generateSessionToken();
    adminSessions.set(token, {
      username,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  const { token } = req.body;
  adminSessions.delete(token);
  res.json({ success: true });
});

// Verify admin session endpoint
app.post('/api/admin/verify', (req, res) => {
  const { token } = req.body;
  if (verifyAdminSession(token)) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }
});

// Admin middleware helper
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.body.token;
  if (!verifyAdminSession(token)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

// Get all users (admin)
app.get('/api/admin/users', (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (!verifyAdminSession(token)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(100);
    res.json({
      success: true,
      users: users.map(u => ({
        id: u.odId,
        username: u.username,
        email: u.email,
        balance: u.balance,
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Get all bets (admin)
app.get('/api/admin/bets', (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (!verifyAdminSession(token)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const bets = await Bet.find(query).sort({ createdAt: -1 }).limit(200);
    res.json({
      success: true,
      bets: bets.map(b => ({
        id: b._id,
        odId: b.odId,
        type: b.type,
        selections: b.selections,
        stake: b.stake,
        odds: b.combinedOdds,
        potentialPayout: b.potentialPayout,
        payout: b.payout,
        status: b.status,
        eventTime: b.eventTime,
        createdAt: b.createdAt,
        settledAt: b.settledAt
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch bets' });
  }
});

// Get reported messages (admin)
app.get('/api/admin/reported-messages', (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (!verifyAdminSession(token)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}, async (req, res) => {
  try {
    const messages = await Message.find({ reported: true }).sort({ createdAt: -1 });
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch reported messages' });
  }
});

// Manual trigger for auto-settlement (updated with session auth)
app.post('/api/admin/settle-bets', async (req, res) => {
  try {
    const token = req.headers['x-admin-token'] || req.body.token;
    
    // Check session token or legacy admin key
    if (!verifyAdminSession(token) && req.body.adminKey !== 'payday-admin-2024') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    const settledCount = await autoSettleBets();
    res.json({ success: true, settledCount, message: `Settled ${settledCount} bets` });
  } catch (error) {
    console.error('Manual settle error:', error);
    res.status(500).json({ success: false, error: 'Settlement failed' });
  }
});

// Settle a specific bet manually (admin)
app.post('/api/admin/settle-bet/:betId', async (req, res) => {
  try {
    const { betId } = req.params;
    const { result } = req.body; // result: 'won' or 'lost'
    const token = req.headers['x-admin-token'] || req.body.token;
    
    // Check session token or legacy admin key
    if (!verifyAdminSession(token) && req.body.adminKey !== 'payday-admin-2024') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    const bet = await Bet.findById(betId);
    if (!bet) {
      return res.status(404).json({ success: false, error: 'Bet not found' });
    }
    
    if (bet.status !== 'open') {
      return res.status(400).json({ success: false, error: 'Bet already settled' });
    }
    
    const forceResult = result === 'won';
    const settledBet = await settleBet(bet, forceResult);
    
    res.json({ 
      success: true, 
      bet: settledBet,
      message: `Bet settled as ${settledBet.status}` 
    });
  } catch (error) {
    console.error('Manual bet settle error:', error);
    res.status(500).json({ success: false, error: 'Settlement failed' });
  }
});

// Get settlement statistics
app.get('/api/admin/settlement-stats', async (req, res) => {
  try {
    const totalBets = await Bet.countDocuments();
    const openBets = await Bet.countDocuments({ status: 'open' });
    const wonBets = await Bet.countDocuments({ status: 'won' });
    const lostBets = await Bet.countDocuments({ status: 'lost' });
    const cancelledBets = await Bet.countDocuments({ status: 'cancelled' });
    
    // Calculate total payouts
    const wonBetsData = await Bet.find({ status: 'won' });
    const totalPayouts = wonBetsData.reduce((sum, bet) => sum + (bet.payout || 0), 0);
    
    // Calculate total stakes
    const allBetsData = await Bet.find({ status: { $in: ['won', 'lost'] } });
    const totalStakes = allBetsData.reduce((sum, bet) => sum + bet.stake, 0);
    
    res.json({
      success: true,
      stats: {
        totalBets,
        openBets,
        wonBets,
        lostBets,
        cancelledBets,
        winRate: totalBets > 0 ? ((wonBets / (wonBets + lostBets)) * 100).toFixed(1) : 0,
        totalStakes: totalStakes.toFixed(2),
        totalPayouts: totalPayouts.toFixed(2),
        houseEdge: totalStakes > 0 ? ((totalStakes - totalPayouts) / totalStakes * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('Settlement stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

// Endpoint for users to check if their bets have been settled
app.get('/api/users/:userId/settled-bets', async (req, res) => {
  try {
    const { userId } = req.params;
    const { since } = req.query; // ISO date string
    
    const query = { odId: userId, status: { $in: ['won', 'lost'] } };
    if (since) {
      query.settledAt = { $gte: new Date(since) };
    }
    
    const settledBets = await Bet.find(query).sort({ settledAt: -1 }).limit(50);
    
    res.json({
      success: true,
      bets: settledBets.map(b => ({
        id: b._id,
        event: b.event,
        selection: b.selection,
        stake: b.stake,
        odds: b.odds,
        status: b.status,
        payout: b.payout || 0,
        settledAt: b.settledAt
      }))
    });
  } catch (error) {
    console.error('Settled bets error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settled bets' });
  }
});

// Run initial settlement check on server start
setTimeout(autoSettleBets, 10000);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Make sure to set OPENAI_API_KEY in your .env file');
});
