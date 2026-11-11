
const Trade = require("../models/Trade");
const PullJob = require("../models/PullJob");
const { startPull } = require("../services/pullService");

// Get stored trades
const getTrades = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));

    const total = await Trade.countDocuments();

    const trades = await Trade.find()
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      total,
      page,
      limit,
      trades
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Start a new pull
const createPull = async (req, res) => {
  try {
    const job = await startPull(req.app.get("io"));

    res.status(202).json({
      success: true,
      message: "Trade pull started successfully",
      jobId: job._id,
      status: job.status
    });

  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

// Get pull job status
const getPullStatus = async (req, res) => {
  try {
    const job = await PullJob.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Pull job not found"
      });
    }

    res.json({
      success: true,
      job
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getActivePull = async (req, res) => {
  try {
    const job = await PullJob.findOne({
      status: { $in: ["queued", "running"] }
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      job: job || null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getTrades,
  createPull,
  getPullStatus,
  getActivePull
};