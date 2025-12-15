import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  odId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Privacy Settings
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public'
    },
    showBettingHistory: {
      type: Boolean,
      default: true
    },
    showWalletBalance: {
      type: Boolean,
      default: false
    },
    allowDirectMessages: {
      type: String,
      enum: ['everyone', 'followers', 'nobody'],
      default: 'everyone'
    },
    showOnlineStatus: {
      type: Boolean,
      default: true
    },
    showActivityStatus: {
      type: Boolean,
      default: true
    }
  },
  // Notification Settings
  notifications: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    betResults: {
      type: Boolean,
      default: true
    },
    newFollowers: {
      type: Boolean,
      default: true
    },
    directMessages: {
      type: Boolean,
      default: true
    },
    robSuggestions: {
      type: Boolean,
      default: true
    },
    promotions: {
      type: Boolean,
      default: false
    },
    weeklyDigest: {
      type: Boolean,
      default: true
    }
  },
  // Display Settings
  display: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    oddsFormat: {
      type: String,
      enum: ['american', 'decimal', 'fractional'],
      default: 'american'
    },
    timezone: {
      type: String,
      default: 'America/Los_Angeles'
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  // Betting Preferences
  betting: {
    defaultStake: {
      type: Number,
      default: 10
    },
    confirmBets: {
      type: Boolean,
      default: true
    },
    showOddsChanges: {
      type: Boolean,
      default: true
    },
    autoAcceptOddsChanges: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
settingsSchema.pre('save', function() {
  this.updatedAt = new Date();
});

export default mongoose.model('Settings', settingsSchema);
