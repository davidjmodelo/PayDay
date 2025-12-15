import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true,
    index: true
  },
  senderUsername: {
    type: String,
    default: 'User'
  },
  receiverId: {
    type: String,
    required: true,
    index: true
  },
  receiverUsername: {
    type: String,
    default: 'User'
  },
  content: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  reported: {
    type: Boolean,
    default: false
  },
  reportReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for conversation queries
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
