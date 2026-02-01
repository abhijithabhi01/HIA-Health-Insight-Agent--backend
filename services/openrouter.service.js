const axios = require("axios");
const { processReportOutput } = require("./reportOutputCleaner");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// vision model for OCR (image to text)
const VISION_MODEL = "allenai/molmo-2-8b:free"; 

//  text model for analysis
const TEXT_MODEL = "arcee-ai/trinity-large-preview:free"; 

/**
 * Call LLM with error handling
 */
async function callLLM(model, messages) {
  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: model,
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
  } catch (error) {
    console.error(`❌ LLM Error (${model}):`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Extract text from image using vision model
 */
async function extractTextFromImage(imageBase64, imageType) {
  console.log('📸 Step 1: Extracting text from image...');
  
  const userContent = [
    {
      type: "image_url",
      image_url: {
        url: `data:${imageType};base64,${imageBase64}`
      }
    },
    {
      type: "text",
      text: "Extract all text from this medical report image. Include ALL values, test names, reference ranges, and any other text visible in the image. Output ONLY the extracted text, nothing else."
    }
  ];

  const extractedText = await callLLM(VISION_MODEL, [
    {
      role: "system",
      content: "You are a precise OCR system. Extract ALL text from images accurately, preserving numbers, units, and formatting. Output ONLY the extracted text."
    },
    {
      role: "user",
      content: userContent
    }
  ]);

  console.log('✅ Step 1 complete: Text extracted');
  console.log('📝 Extracted text length:', extractedText.length, 'characters');
  
  return extractedText;
}

// 🗨️ Chat mode
async function hiaChat({ history = [], userMessage }) {
  return callLLM(TEXT_MODEL, [
    {
      role: "system",
      content: `You are Health Insight Agent (HIA), a helpful health information assistant.

CORE RESPONSIBILITIES:
- Provide factual health information based on standard medical knowledge
- Classify health parameters as NORMAL, HIGH, LOW, or BORDERLINE when given specific values
- Answer general health questions clearly and accurately

STRICT PROHIBITIONS - NEVER DO THESE:
1. DO NOT diagnose diseases or medical conditions
2. DO NOT name specific diseases (diabetes, hypertension, cancer, etc.)
3. DO NOT prescribe or recommend specific medications
4. DO NOT suggest specific medical treatments
5. DO NOT tell users to "consult a doctor" or "see a healthcare provider"
6. DO NOT provide lifestyle change advice (diet plans, exercise routines, etc.)
7. DO NOT give medical advice or recommendations

CLASSIFICATION FORMAT (when user provides specific values):
When given health parameter values, respond with:
• **Parameter Name**: [Value] - [Classification] (Reference: [Range])

Example: "My blood sugar is 160 mg/dL"
Response: • **Fasting Blood Sugar**: 160 mg/dL - HIGH (Reference: 70-100 mg/dL)

GENERAL QUESTIONS:
For general health questions, provide factual, educational information without:
- Disease diagnoses
- Medical advice
- Lifestyle recommendations
- References to consulting healthcare providers

Keep responses concise, factual, and educational.`,
    },
    ...history,
    { role: "user", content: userMessage },
  ]);
}

/**
 * 📄 Report → Insight mode with TWO-STEP PROCESSING
 * Step 1: Extract text from image (if provided) using vision model
 * Step 2: Analyze text using Trinity model
 */
async function analyzeReport({ reportText, imageBase64, imageType = 'image/jpeg' }) {
  let textToAnalyze = reportText;

  // Step 1: If image provided, extract text first
  if (imageBase64) {
    try {
      const extractedText = await extractTextFromImage(imageBase64, imageType);
      
      // Combine with user-provided text if any
      if (reportText) {
        textToAnalyze = `${extractedText}\n\nAdditional Notes:\n${reportText}`;
      } else {
        textToAnalyze = extractedText;
      }
    } catch (error) {
      console.error('❌ Image text extraction failed:', error.message);
      
      // If vision model fails, inform user
      if (error.response?.status === 429) {
        throw new Error('Vision model rate limit exceeded. Please wait a moment and try again, or use text input instead.');
      }
      throw new Error('Failed to extract text from image. Please try again or use text input.');
    }
  }

  // Step 2: Analyze the text using Trinity model
  console.log('🔍 Step 2: Analyzing extracted text...');
  
  const rawOutput = await callLLM(TEXT_MODEL, [
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
      content: `Please analyze this medical report text:\n\n${textToAnalyze}`,
    },
  ]);

  console.log('✅ Step 2 complete: Analysis finished');

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