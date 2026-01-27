const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { analyzeReport } = require('../services/openrouter.service');

router.post('/report', auth, async (req, res) => {
  try {
    const { reportText } = req.body;

    if (!reportText) {
      return res.status(400).json({ error: "Report text is required" });
    }

    const insight = await analyzeReport(reportText);

    res.json({ insight });
  } catch (err) {
    console.error("Report analysis error:", err);
    res.status(500).json({ error: "Failed to analyze report" });
  }
});

module.exports = router;
