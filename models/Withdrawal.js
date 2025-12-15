import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema({
  odId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    default: 'User'
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

export default Withdrawal;
