import mongoose from 'mongoose';

const robMessageSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['user', 'rob', 'rob-suggestion'],
    required: true
  },
  odId: String,
  username: String,
  content: {
    type: String,
    required: true
  },
  suggestionId: String,
  suggestion: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

robMessageSchema.index({ createdAt: -1 });

const RobMessage = mongoose.model('RobMessage', robMessageSchema);

export default RobMessage;
