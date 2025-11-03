const mongoose = require("mongoose");

const MONGODB_URI =
  "mongodb+srv://ankur:ankur123@cluster0.kdlfrx4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Database connected successfully!");
  } catch (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1); // Exit script if DB connection fails
  }
};

module.exports = connectDB;