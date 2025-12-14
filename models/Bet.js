import mongoose from 'mongoose';

const selectionSchema = new mongoose.Schema({
  marketId: String,
  marketEvent: String,
  selectionId: String,
  selectionName: String,
  odds: Number,
  sport: String
}, { _id: false });

const betSchema = new mongoose.Schema({
  odId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['single', 'parlay'],
    default: 'single'
  },
  selections: [selectionSchema],
  stake: {
    type: Number,
    required: true
  },
  originalOdds: Number,
  combinedOdds: Number,
  potentialPayout: Number,
  status: {
    type: String,
    enum: ['open', 'won', 'lost', 'cancelled'],
    default: 'open'
  },
  canCancel: {
    type: Boolean,
    default: true
  },
  isRobPick: {
    type: Boolean,
    default: false
  },
  suggestionId: String,
  discountApplied: {
    type: Number,
    default: 0
  },
  cancelledAt: Date
}, {
  timestamps: true
});

betSchema.index({ odId: 1, status: 1 });
betSchema.index({ createdAt: -1 });

const Bet = mongoose.model('Bet', betSchema);

export default Bet;
