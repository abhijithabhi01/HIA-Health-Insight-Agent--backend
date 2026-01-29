const axios = require("axios");
const { processReportOutput } = require("./reportOutputCleaner");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "arcee-ai/trinity-large-preview:free";

/**
 * Call LLM with text and/or images
 * @param {Array} messages - Array of message objects with role and content
 * @returns {string} - AI response
 */
async function callLLM(messages) {
  const response = await axios.post(
    OPENROUTER_URL,
    {
      model: MODEL,
      messages,
      temperature: 0.1,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "Health Insight Agent",
      },
    }
  );

  return response.data.choices[0].message.content;
}

/**
 * 💬 Chat mode - text only
 */
async function hiaChat({ history = [], userMessage }) {
  return callLLM([
    {
      role: "system",
      content: `
You are Health Insight Agent (HIA).

IMPORTANT: Always format your responses as clear, organized bullet points.
- Start with a brief 1-2 sentence introduction if needed
- Then break down information into bullet points using "•" or "-"
- Each point should be concise and focused on one key piece of information
- Use sub-bullets for additional details when needed
- End with a brief summary or recommendation if appropriate

Example format:
Here's what your results show:

• **Fasting Blood Sugar**: 100 mg/dL - Within normal range (70-100 mg/dL)
• **HbA1c**: 5.4% - Good control, indicates healthy average blood sugar over past 2-3 months
• **Total Cholesterol**: 180 mg/dL - Below recommended level (<200 mg/dL)
  - HDL (good cholesterol): 52 mg/dL - Above recommended level (>40 mg/dL)
  - LDL (bad cholesterol): 110 mg/dL - Below recommended level (<130 mg/dL)
• **Hemoglobin**: 14.5 g/dL - Within healthy range (13-17 g/dL)
• **Blood Pressure**: 120/80 mmHg - Normal and healthy

Overall, your results indicate a healthy profile. Continue maintaining a balanced lifestyle!

Answer health-related questions clearly and safely.
Do not diagnose or prescribe medication.
Use simple, calm language.
      `,
    },
    ...history,
    { role: "user", content: userMessage },
  ]);
}

/**
 * 📄 Report → Insight mode with MULTIMODAL SUPPORT
 * Accepts both text and images (base64 encoded)
 * 
 * @param {Object} options
 * @param {string} options.reportText - Plain text of report (optional)
 * @param {string} options.imageBase64 - Base64 encoded image (optional)
 * @param {string} options.imageType - Image MIME type (e.g., 'image/jpeg', 'image/png')
 * @returns {string} - Formatted analysis
 */
async function analyzeReport({ reportText, imageBase64, imageType = 'image/jpeg' }) {
  // Build the user message content
  const userContent = [];

  // Add image if provided
  if (imageBase64) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:${imageType};base64,${imageBase64}`
      }
    });
  }

  // Add text instruction
  const instruction = reportText 
    ? `Please analyze this medical report:\n\n${reportText}`
    : "Please analyze the medical report in this image.";

  userContent.push({
    type: "text",
    text: instruction
  });

  const rawOutput = await callLLM([
    {
      role: "system",
      content: `
You are Health Insight Agent (HIA). Your ONLY job is to classify medical test values as NORMAL, HIGH, or LOW.

STRICT RULES - NO EXCEPTIONS:
1. Output ONLY bullet points with parameter classifications
2. Format: • **Parameter Name**: [Value] - [Classification]
3. Use ONLY these exact classifications: NORMAL, HIGH, LOW, BORDERLINE
4. NO explanations, NO advice, NO medical terms, NO conversational language
5. NO greetings, NO questions, NO health risks, NO disease names
6. NO recommendations, NO reassurances, NO "discuss with doctor" statements
7. Compare the result value with the reference range to determine classification
8. If value is within range → NORMAL
9. If value is above range → HIGH
10. If value is below range → LOW
11. If value is slightly outside range → BORDERLINE

EXACT OUTPUT FORMAT (follow this strictly):

📊 **Blood & Metabolic Panel**
• **Fasting Blood Sugar**: 88 mg/dL - NORMAL
• **HbA1c**: 5.3% - NORMAL
• **Total Cholesterol**: 172 mg/dL - NORMAL
• **HDL Cholesterol**: 58 mg/dL - NORMAL
• **LDL Cholesterol**: 98 mg/dL - NORMAL
• **Triglycerides**: 110 mg/dL - NORMAL

🧬 **Complete Blood Count (CBC)**
• **Hemoglobin**: 11.4 g/dL - LOW
• **Total WBC Count**: 6,200 cells/µL - NORMAL
• **Platelet Count**: 280,000 cells/µL - NORMAL

🧠 **Kidney Function**
• **Serum Creatinine**: 0.8 mg/dL - NORMAL

❤️ **Vital Signs**
• **Blood Pressure**: 118/76 mmHg - NORMAL

DO NOT ADD:
❌ Any greetings or patient name
❌ Overall health assessments
❌ Discussion suggestions
❌ Follow-up questions
❌ Medical advice
❌ Explanations of what values mean
❌ Lifestyle recommendations
❌ Any text outside the bullet point format

Your output should be ONLY the categorized list above. Nothing else.
      `,
    },
    {
      role: "user",
      content: userContent,
    },
  ]);

  // Clean and validate the output
  const result = processReportOutput(rawOutput);

  if (!result.success) {
    console.error('Output cleaning failed:', result.error);
    return result.cleaned || rawOutput;
  }

  return result.output;
}

module.exports = {
  hiaChat,
  analyzeReport,
};
