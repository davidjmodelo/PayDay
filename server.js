// Simple Node.js server to handle OpenAI API calls
// This keeps your API key secure on the server side

import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User, Post, Bet, RobSuggestion, RobMessage } from './models/index.js';

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

// ========================================
// POSTS API ENDPOINTS
// ========================================

// Create a new post
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

// Like/unlike a post
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

// ========================================
// COMMENTS API ENDPOINTS
// ========================================

// Add a comment to a post
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

// ========================================
// SEARCH API ENDPOINT
// ========================================

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

// ========================================
// USERS API ENDPOINTS
// ========================================

// Get suggested users to follow
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

// Follow/unfollow a user
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

// Get user profile
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

// Update user profile
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

// Deposit funds to user balance
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

// ========================================
// BETTING MARKETS API
// ========================================

// Markets data (mock data - could be moved to DB later)
const markets = [
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

// Rob's fee - reduces payout when user follows Rob's suggestions
const ROB_FEE_PERCENTAGE = 10; // 10% reduced payout for using Rob's help

// Generate a Rob suggestion from available markets
async function generateRobSuggestion(type = 'single') {
  const openMarkets = markets.filter(m => new Date(m.closeTime) > new Date());
  if (openMarkets.length === 0) return null;

  const selections = [];
  const numPicks = type === 'parlay' ? Math.min(3, openMarkets.length) : 1;
  
  // Randomly select markets for the suggestion
  const shuffled = [...openMarkets].sort(() => Math.random() - 0.5);
  const selectedMarkets = shuffled.slice(0, numPicks);

  for (const market of selectedMarkets) {
    // Pick a random selection from the market
    const selection = market.selections[Math.floor(Math.random() * market.selections.length)];
    selections.push({
      marketId: market.id,
      marketEvent: market.event,
      selectionId: selection.id,
      selectionName: selection.name,
      odds: selection.odds,
      sport: market.sport
    });
  }

  const suggestion = await RobSuggestion.create({
    type,
    selections,
    feePercentage: ROB_FEE_PERCENTAGE,
    confidence: Math.floor(Math.random() * 30) + 70, // 70-99% confidence
    reasoning: generateRobReasoning(selections),
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
    usedBy: []
  });

  return suggestion;
}

// Generate reasoning for Rob's pick
function generateRobReasoning(selections) {
  const reasons = [
    "Based on recent team performance and statistical analysis",
    "Historical matchup data strongly favors this outcome",
    "Key player availability and momentum indicators suggest",
    "Advanced metrics and betting line movement analysis shows",
    "Considering home/away splits and current form",
    "Weather conditions and injury reports point to"
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
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

// Get markets
app.get('/api/markets', (req, res) => {
  try {
    const { sport } = req.query;

    let filteredMarkets = markets;
    if (sport && sport !== 'all') {
      filteredMarkets = markets.filter(m => m.sport === sport);
    }

    // Update market status based on close time
    filteredMarkets = filteredMarkets.map(market => ({
      ...market,
      status: new Date(market.closeTime) > new Date() ? 'open' : 'closed'
    }));

    res.json({ success: true, markets: filteredMarkets });
  } catch (error) {
    console.error('Error fetching markets:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch markets' });
  }
});

// ========================================
// BETS API
// ========================================

// Place bets
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
        discountApplied
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

// Cancel a bet
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

// ========================================
// ROB CHAT API ENDPOINTS
// ========================================

// Get Rob chat messages
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

    // Generate Rob's response using OpenAI
    let robResponse;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are Rob, an AI sports betting assistant for Pay Day. You help users with betting advice, explain odds, and provide insights. You're friendly, knowledgeable, and always remind users to bet responsibly. Keep responses concise (2-3 sentences max). If asked for a pick, tell them to click "Get Rob's Pick" button for an official suggestion with discounted odds.`
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 150
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

// Generate a new Rob suggestion
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Make sure to set OPENAI_API_KEY in your .env file');
});
