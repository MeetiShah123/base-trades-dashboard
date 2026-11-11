
const express = require("express");

const {
  getTrades,
  createPull,
  getPullStatus,
  getActivePull
} = require("../controllers/tradeController");

const router = express.Router();

router.get("/trades", getTrades);
router.post("/pulls", createPull);

// Keep this route before /pulls/:id
router.get("/pulls/active", getActivePull);

router.get("/pulls/:id", getPullStatus);

module.exports = router;
