import mongoose from 'mongoose';

const robSelectionSchema = new mongoose.Schema({
  marketId: String,
  marketEvent: String,
  selectionId: String,
  selectionName: String,
  odds: Number,
  sport: String
}, { _id: false });

const robSuggestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['single', 'parlay'],
    default: 'single'
  },
  selections: [robSelectionSchema],
  feePercentage: {
    type: Number,
    default: 10
  },
  confidence: {
    type: Number,
    default: 75
  },
  reasoning: String,
  expiresAt: {
    type: Date,
    required: true
  },
  usedBy: [{
    type: String
  }]
}, {
  timestamps: true
});

robSuggestionSchema.index({ expiresAt: 1 });

const RobSuggestion = mongoose.model('RobSuggestion', robSuggestionSchema);

export default RobSuggestion;
