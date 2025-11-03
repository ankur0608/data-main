const mongoose = require("mongoose");

const horoscopeSchema = new mongoose.Schema(
  {
    language: { type: String, required: true },
    sign: { type: String, required: true },
    date: { type: String, required: true }, // Format: 'YYYY-MM-DD'
    horoscope: { type: String, default: null },
    luckyNumber: { type: String, default: null },
    luckyColor: { type: String, default: null },
    remedy: { type: String, default: null },
    ratings: { type: Object, default: {} },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

// Add a unique index to prevent duplicates for the same day/lang/sign
horoscopeSchema.index({ language: 1, sign: 1, date: 1 }, { unique: true });

const Horoscope = mongoose.model("Horoscope", horoscopeSchema);

module.exports = Horoscope;