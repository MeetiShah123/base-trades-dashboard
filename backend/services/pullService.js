
const PullJob = require("../models/PullJob");
const runTradeWorker = require("../workers/tradeWorker");

const startPull = async (io) => {

  // Prevent multiple simultaneous pull jobs
  const activeJob = await PullJob.findOne({
    status: { $in: ["queued", "running"] }
  });

  if (activeJob) {
    const error = new Error("A trade pull is already in progress");
    error.statusCode = 409;
    throw error;
  }

  // Create job in database
  const job = await PullJob.create({
    status: "queued"
  });

  // Start background processing without awaiting completion
  setImmediate(() => {
    runTradeWorker(job._id, io).catch((error) => {
      console.error("Background worker failed:", error);
    });
  });

  return job;
};

module.exports = { startPull };