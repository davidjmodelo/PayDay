import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  odId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    default: 'User'
  },
  email: {
    type: String,
    default: ''
  },
  birthday: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  photoUrl: {
    type: String,
    default: ''
  },
  balance: {
    type: Number,
    default: 0
  },
  followers: [{
    type: String
  }],
  following: [{
    type: String
  }]
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

export default User;
