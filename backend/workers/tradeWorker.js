
const axios = require("axios");
const Trade = require("../models/Trade");
const PullJob = require("../models/PullJob");

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const runTradeWorker = async (jobId, io) => {
  try {
    const job = await PullJob.findById(jobId);

    if (!job) {
      throw new Error("Pull job not found");
    }

    const batchSize = Number(process.env.BATCH_SIZE || 100);
    const duration = Number(process.env.PULL_DURATION_MS || 900000);
    const mockURL = process.env.MOCK_API_URL || "http://localhost:4001";

    // Start the job
    job.status = "running";
    job.startedAt = new Date();
    await job.save();

    // Get total available records
    const firstResponse = await axios.get(
      `${mockURL}/getTrades`,
      {
        params: { offset: 0, limit: batchSize },
        timeout: 10000
      }
    );

    const totalTrades = firstResponse.data.total;

    const totalBatches = Math.ceil(totalTrades / batchSize);

    job.totalTrades = totalTrades;
    job.totalBatches = totalBatches;
    await job.save();

    // Distribute the configured duration across batches.
    // Waiting happens outside HTTP requests.
    const interval = totalBatches > 1
      ? duration / (totalBatches - 1)
      : 0;

    for (let batch = 0; batch < totalBatches; batch++) {

      const offset = batch * batchSize;

      // Fetch a batch using a short HTTP request
      const response = batch === 0
        ? firstResponse
        : await axios.get(
            `${mockURL}/getTrades`,
            {
              params: {
                offset,
                limit: batchSize
              },
              timeout: 10000
            }
          );

      const trades = response.data.trades;

      if (!Array.isArray(trades)) {
        throw new Error("Invalid trade data received");
      }

      // Insert new trades without duplicating existing ones
      const operations = trades.map((trade) => ({
        updateOne: {
          filter: { tradeId: trade.tradeId },
          update: {
            $setOnInsert: {
              ...trade,
              timestamp: new Date(trade.timestamp)
            }
          },
          upsert: true
        }
      }));

      const result = await Trade.bulkWrite(operations, {
        ordered: false
      });

      // Identify only records newly inserted by this batch
      const insertedTrades = Object.keys(result.upsertedIds)
        .map((index) => trades[Number(index)]);

      job.processedTrades += trades.length;
      job.batchesCompleted = batch + 1;

      await job.save();

      // Send updates to connected dashboards
      if (insertedTrades.length > 0) {
        io.emit("newTrades", insertedTrades);
      }

      const progress = Math.round(
        ((batch + 1) / totalBatches) * 100
      );

      io.emit("pullProgress", {
        jobId: job._id,
        status: "running",
        processedTrades: job.processedTrades,
        totalTrades: job.totalTrades,
        batchesCompleted: job.batchesCompleted,
        totalBatches: job.totalBatches,
        progress
      });

      console.log(
        `Batch ${batch + 1}/${totalBatches} completed. ` +
        `${job.processedTrades}/${totalTrades} trades processed.`
      );

      // Wait between batches, never while holding an HTTP request open
      if (batch < totalBatches - 1) {
        await sleep(interval);
      }
    }

    // Mark job completed
    job.status = "completed";
    job.completedAt = new Date();
    await job.save();

    io.emit("pullCompleted", {
      jobId: job._id,
      status: "completed",
      processedTrades: job.processedTrades,
      totalTrades: job.totalTrades
    });

    console.log(`Pull job ${jobId} completed successfully.`);

  } catch (error) {
    console.error("Worker Error:", error.message);

    const failedJob = await PullJob.findById(jobId);

    if (failedJob) {
      failedJob.status = "failed";
      failedJob.error = error.message;
      failedJob.completedAt = new Date();
      await failedJob.save();
    }

    io.emit("pullFailed", {
      jobId,
      status: "failed",
      error: error.message
    });
  }
};

module.exports = runTradeWorker;