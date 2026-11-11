
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log("=================================");
    console.log("MongoDB Connected Successfully!");
    console.log(`Database Host: ${conn.connection.host}`);
    console.log("=================================");

  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
