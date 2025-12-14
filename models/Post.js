import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  odId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    default: 'User'
  },
  text: {
    type: String,
    required: true
  },
  likes: [{
    type: String
  }]
}, {
  timestamps: true
});

const postSchema = new mongoose.Schema({
  odId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    default: 'User'
  },
  content: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: null
  },
  videoUrl: {
    type: String,
    default: null
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  likes: [{
    type: String
  }],
  comments: [commentSchema]
}, {
  timestamps: true
});

postSchema.index({ createdAt: -1 });
postSchema.index({ content: 'text', username: 'text' });

const Post = mongoose.model('Post', postSchema);

export default Post;
