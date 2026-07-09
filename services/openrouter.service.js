const axios = require("axios");
const { processReportOutput } = require("./reportOutputCleaner");
const Tesseract = require('tesseract.js');
const PDFParser = require("pdf2json");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Use Tesseract for OCR (free, no API limits)
const USE_TESSERACT = true;

// Vision models for OCR (fallback if Tesseract is disabled)
const VISION_MODEL = "allenai/molmo-2-8b:free"; 
const VISION_MODEL_FALLBACK = "meta-llama/llama-3.2-11b-vision-instruct:free";

// Text model for analysis (tried in order; each is a different provider's free tier,
// so a 429 on one doesn't mean the others are limited too).
// Final entry is OpenRouter's own auto-router, which always resolves to whatever
// free model is currently live — a self-healing catch-all so this list doesn't
// need manual upkeep every time a provider drops a model (as gemini-2.0-flash-exp did).
const TEXT_MODEL = "arcee-ai/trinity-large-preview:free";
const TEXT_MODEL_FALLBACKS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-20b:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "openrouter/free",
];

/**
 * Call LLM with error handling and retry logic for a single model.
 * Only retries transient errors (network blips, 5xx). A 429 is NOT retried
 * here since retrying the same rate-limited model wastes attempts — callers
 * that want cross-model fallback should use callLLMWithFallback instead.
 */
async function callLLM(model, messages, retries = 2) {
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Retry attempt ${attempt}/${retries} for ${model}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }

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
          timeout: 60000,
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      lastError = error;

      // 429 = rate limited on THIS model. Don't burn retries sleeping and
      // hitting the same wall again — bail out immediately so the caller
      // can move on to a different model.
      if (error.response?.status === 429) {
        break;
      }

      const isRetryable =
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNREFUSED' ||
        error.response?.status >= 500;
      
      if (!isRetryable || attempt === retries) {
        break;
      }
      
      console.log(`⚠️ Retryable error on attempt ${attempt + 1}: ${error.code || error.message}`);
    }
  }
  
  console.error(`❌ LLM Error (${model}) after ${retries + 1} attempts:`, lastError.response?.data || lastError.message);
  throw lastError;
}

/**
 * Try a primary model, then fall through a list of backup models in order.
 * Used for text generation where several interchangeable free models exist.
 */
async function callLLMWithFallback(models, messages, retries = 1) {
  let lastError;

  for (const model of models) {
    try {
      const result = await callLLM(model, messages, retries);
      return result;
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      console.log(`⚠️ Model ${model} failed (${status || error.code || error.message}), trying next fallback...`);
    }
  }

  console.error('❌ All text models exhausted:', lastError.response?.data || lastError.message);
  throw lastError;
}

/**
 * Extract text from PDF using pdf2json
 */
async function extractTextFromPDF(pdfBuffer) {
  console.log('📄 Extracting text from PDF using pdf2json...');
  
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on("pdfParser_dataError", errData => {
      reject(new Error(errData.parserError));
    });
    
    pdfParser.on("pdfParser_dataReady", pdfData => {
      try {
        let text = '';
        pdfData.Pages.forEach(page => {
          page.Texts.forEach(textItem => {
            text += decodeURIComponent(textItem.R[0].T) + ' ';
          });
        });
        
        console.log('✅ PDF extraction complete');
        console.log('📝 Extracted text length:', text.length, 'characters');
        console.log('📄 Number of pages:', pdfData.Pages.length);
        
        resolve(text.trim());
      } catch (err) {
        reject(err);
      }
    });
    
    pdfParser.parseBuffer(pdfBuffer);
  });
}

/**
 * Extract text from image using Tesseract OCR
 */
async function extractTextWithTesseract(imageBuffer) {
  console.log('📸 Extracting text with Tesseract OCR...');
  
  try {
    const { data: { text } } = await Tesseract.recognize(
      imageBuffer,
      'eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`📊 OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );
    
    console.log('✅ OCR complete');
    console.log('📝 Extracted text length:', text.length, 'characters');
    
    return text.trim();
  } catch (error) {
    console.error('❌ Tesseract OCR failed:', error);
    throw new Error('Failed to extract text from image using OCR');
  }
}

/**
 * Extract text from image using vision model with fallback
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

  const systemMessage = {
    role: "system",
    content: "You are a precise OCR system. Extract ALL text from images accurately, preserving numbers, units, and formatting. Output ONLY the extracted text."
  };

  const userMessage = {
    role: "user",
    content: userContent
  };

  let extractedText;
  
  try {
    extractedText = await callLLM(VISION_MODEL, [systemMessage, userMessage]);
  } catch (primaryError) {
    console.log('⚠️ Primary vision model failed, trying fallback...');
    
    try {
      extractedText = await callLLM(VISION_MODEL_FALLBACK, [systemMessage, userMessage], 1);
      console.log('✅ Fallback vision model succeeded');
    } catch (fallbackError) {
      console.error('❌ Both vision models failed');
      throw primaryError;
    }
  }

  console.log('✅ Step 1 complete: Text extracted');
  console.log('📝 Extracted text length:', extractedText.length, 'characters');
  
  return extractedText;
}

/**
 * Chat mode
 */
async function hiaChat({ history = [], userMessage }) {
  return callLLMWithFallback([TEXT_MODEL, ...TEXT_MODEL_FALLBACKS], [
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
 * Get system prompt based on user role
 */
function getAnalysisSystemPrompt(userRole) {
  if (userRole === 'HC' || userRole === 'ADMIN') {
    // Healthcare professional prompt - detailed with clinical insights
    return `
You are Health Insight Agent (HIA) in HEALTHCARE PROFESSIONAL mode. You are assisting a certified healthcare assistant.

RESPONSIBILITIES:
1. Classify all test values as NORMAL, HIGH, LOW, or BORDERLINE
2. Provide clinical context and potential causes for abnormal values
3. Suggest appropriate follow-up actions and monitoring recommendations
4. Note clinically significant patterns or combinations of abnormal values

OUTPUT FORMAT:

📊 **[Category Name]**
• **Parameter Name**: [Value] - [Classification]
  └ Clinical Note: [Brief explanation of what this means, potential causes if abnormal, and monitoring/action recommendations]

EXAMPLE OUTPUT:

📊 **Blood & Metabolic Panel**
• **Fasting Blood Sugar**: 145 mg/dL - HIGH
  └ Clinical Note: Elevated fasting glucose suggests impaired glucose metabolism. Possible causes include prediabetes, diabetes, stress, or recent food intake. Recommend: HbA1c test for 3-month glucose average, assess patient history, consider glucose tolerance test if indicated.

• **HbA1c**: 6.2% - BORDERLINE
  └ Clinical Note: Borderline value indicating prediabetes range (5.7-6.4%). Requires lifestyle intervention and regular monitoring. Recommend: Retest in 3 months, assess diet and exercise patterns, screen for other metabolic syndrome markers.

🧬 **Complete Blood Count (CBC)**
• **Hemoglobin**: 10.2 g/dL - LOW
  └ Clinical Note: Mild anemia. Possible causes: iron deficiency, chronic disease, vitamin B12/folate deficiency, blood loss. Recommend: Iron studies (ferritin, TIBC, serum iron), B12 and folate levels, assess for GI bleeding if indicated, review medications.

⚠️ **Clinical Patterns Identified:**
• Metabolic syndrome markers present (elevated glucose + borderline HbA1c)
• Anemia requires further workup to determine cause
• Priority: Address glucose abnormalities and investigate anemia etiology

GUIDELINES:
- Be specific about clinical implications
- Mention common causes for abnormalities
- Suggest appropriate follow-up tests or monitoring
- Note drug interactions or comorbidity considerations when relevant
- Identify patterns across multiple parameters
- Use medical terminology appropriate for healthcare professionals
- Always provide actionable clinical recommendations
`;
  } else {
    // Regular user prompt - simple classification only
    return `
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
`;
  }
}

/**
 * Report → Insight mode with role-based analysis
 */
async function analyzeReport({ reportText, imageBase64, imageType = 'image/jpeg', fileBuffer, fileType, userRole = 'USER' }) {
  let textToAnalyze = reportText;

  // Step 1: Extract text from file if provided
  if (fileBuffer || imageBase64) {
    try {
      let extractedText;
      
      const isPDF = fileType === 'application/pdf' || imageType === 'application/pdf';
      
      if (isPDF) {
        console.log('📄 Detected PDF file');
        const buffer = fileBuffer || Buffer.from(imageBase64, 'base64');
        extractedText = await extractTextFromPDF(buffer);
      } else {
        console.log('📸 Detected image file');
        
        if (USE_TESSERACT) {
          const imageBuffer = fileBuffer || Buffer.from(imageBase64, 'base64');
          extractedText = await extractTextWithTesseract(imageBuffer);
        } else {
          const base64Image = imageBase64 || fileBuffer.toString('base64');
          extractedText = await extractTextFromImage(base64Image, imageType);
        }
      }
      
      if (reportText) {
        textToAnalyze = `${extractedText}\n\nAdditional Notes:\n${reportText}`;
      } else {
        textToAnalyze = extractedText;
      }
    } catch (error) {
      console.error('❌ File text extraction failed:', error.message);
      throw new Error('Failed to extract text from file. Please try again or use text input instead.');
    }
  }

  // Step 2: Analyze with role-specific prompt
  console.log(`🔍 Analyzing for role: ${userRole}`);
  
  const systemPrompt = getAnalysisSystemPrompt(userRole);
  
  const rawOutput = await callLLMWithFallback([TEXT_MODEL, ...TEXT_MODEL_FALLBACKS], [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: `Please analyze this medical report text:\n\n${textToAnalyze}`,
    },
  ]);

  console.log('✅ Analysis complete');

  // For HC users, return raw output (includes clinical notes)
  if (userRole === 'HC' || userRole === 'ADMIN') {
    return rawOutput;
  }

  // For regular users, clean the output
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
