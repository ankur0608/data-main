const express = require("express");
const cors = require("cors");
const connectDB = require("./db"); // Import the DB connection
const Horoscope = require("./horoscope.model"); // Import the Model

const app = express();
const PORT = process.env.PORT || 5001; // Port for the API server

const languageIdMap = {
  "6560d27b0bc4a38928599a41": "hindi",
  "6560d27b0bc4a38928599a42": "english",
  "6560d27b0bc4a38928599a43": "tamil",
  "6560d27b0bc4a38928599a44": "kannada",
  "6560d27b0bc4a38928599a45": "bengali",
  "6560d27b0bc4a38928599a46": "marathi",
  "6560d27b0bc4a38928599a47": "malayalam",
  "6560d27b0bc4a38928599a48": "gujarati",
  "6560d27b0bc4a38928599a49": "telugu",
  "6560d27b0bc4a38928599a4b": "odia",
};


const validLanguageNames = new Set(Object.values(languageIdMap));

app.use(cors());
app.use(express.json());

// --- Connect to Database ---
connectDB();


app.get("/api/horoscope", async (req, res) => {
  try {
 
    const { languageId, sign } = req.query;

    // 1. Basic validation
    if (!languageId || !sign) {
      return res.status(400).json({
        success: false,
        message: "Missing 'languageId' (or name) or 'sign' query parameter.",
      });
    }

    // --- MODIFIED: Logic to find the language name ---
    let languageName;
    const lowerCaseLanguageId = languageId.toLowerCase();

    if (languageIdMap[languageId]) {
     
      languageName = languageIdMap[languageId];
    } else if (validLanguageNames.has(lowerCaseLanguageId)) {
    
      languageName = lowerCaseLanguageId;
    } else {
      
      return res.status(400).json({
        success: false,
        message: "Invalid 'languageId' or language name provided.",
      });
    }
  
    const today = new Date().toISOString().split("T")[0];


    const horoscopeData = await Horoscope.findOne({
      language: languageName,
      sign: sign.toLowerCase(),
      date: today,
    });


    if (!horoscopeData) {
      return res.status(404).json({
        success: false,
        message: "Horoscope not found for today. Please try again later.",
      });
    }

   
    return res.status(200).json({
      success: true,
      data: horoscopeData,
    });
  } catch (err) {
    console.error("API Error:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});
