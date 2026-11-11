
const mongoose = require("mongoose");

const pullJobSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued"
    },

    totalTrades: {
      type: Number,
      default: 0
    },

    processedTrades: {
      type: Number,
      default: 0
    },

    batchesCompleted: {
      type: Number,
      default: 0
    },

    totalBatches: {
      type: Number,
      default: 0
    },

    startedAt: Date,
    completedAt: Date,

    error: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("PullJob", pullJobSchema);