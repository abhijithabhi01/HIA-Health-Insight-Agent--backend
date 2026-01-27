const axios = require("axios");
const { processReportOutput } = require("./reportOutputCleaner");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "meta-llama/llama-3.3-70b-instruct:free";

async function callLLM(messages) {
  const response = await axios.post(
    OPENROUTER_URL,
    {
      model: MODEL,
      messages,
      temperature: 0.1, // Lower temperature for more consistent output
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

// 🗨️ Chat mode
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

// 📄 Report → Insight mode (STRICT CLASSIFICATION ONLY)
async function analyzeReport(reportText) {
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
      content: reportText,
    },
  ]);

  // Clean and validate the output
  const result = processReportOutput(rawOutput);

  if (!result.success) {
    console.error('Output cleaning failed:', result.error);
    // Return cleaned version even if validation failed
    return result.cleaned || rawOutput;
  }

  return result.output;
}


module.exports = {
  hiaChat,
  analyzeReport,
};
