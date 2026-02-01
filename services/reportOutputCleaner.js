/**
 * Utility to clean and validate AI-generated medical report analysis
 * Ensures output contains ONLY parameter classifications (HIGH/LOW/NORMAL)
 */

/**
 * Cleans the AI output to remove unwanted conversational text
 * @param {string} rawOutput - Raw output from AI model
 * @returns {string} - Cleaned output with only classifications
 */
function cleanReportOutput(rawOutput) {
  if (!rawOutput) return '';

  // Remove common unwanted phrases
  const unwantedPhrases = [
    /Hello\s+\w+,?/gi,
    /Hi\s+\w+,?/gi,
    /Dear\s+\w+,?/gi,
    /I've reviewed your/gi,
    /overall,?\s+they look good/gi,
    /Here are some observations:/gi,
    /This suggests that/gi,
    /This might indicate/gi,
    /it's essential to/gi,
    /discuss with your doctor/gi,
    /Some potential areas to discuss/gi,
    /Do you have any/gi,
    /questions about/gi,
    /concerns you'd like/gi,
    /Overall, your test results/gi,
    /suggest that you're/gi,
    /However,/gi,
    /as they can provide/gi,
    /personalized advice/gi,
    /Maintaining a healthy/gi,
    /Monitoring your/gi,
    /consult.*healthcare provider/gi,
    /see.*doctor/gi,
    /talk to.*physician/gi,
    /medical professional/gi,
    /at risk for/gi,
    /may indicate/gi,
    /could suggest/gi,
    /diabetes/gi,
    /prediabetes/gi,
    /hypertension/gi,
    /anemia/gi,
    /disease/gi,
    /condition/gi,
    /insulin resistance/gi,
    /impaired.*glucose/gi,
    /lifestyle change/gi,
    /diet.*exercise/gi,
    /next steps/gi,
    /early intervention/gi,
    /opportunity to/gi,
    /positive changes/gi,
    /your body.*processing/gi,
    /efficiently/gi,
    /interpretation/gi,
    /diagnosis/gi,
    /What.*indicates:/gi,
    /What.*means:/gi,
    /Important.*notes:/gi,
    /Remember,?/gi,
  ];

  let cleaned = rawOutput;

  // Remove unwanted phrases
  unwantedPhrases.forEach(phrase => {
    cleaned = cleaned.replace(phrase, '');
  });

  // Remove any lines that don't start with a bullet point or emoji or header
  const lines = cleaned.split('\n');
  const validLines = lines.filter(line => {
    const trimmed = line.trim();
    
    // Keep empty lines for spacing
    if (trimmed === '') return true;
    
    // Keep lines that start with emoji headers
    if (/^[📊🧬🧠❤️💉🩺]/.test(trimmed)) return true;
    
    // Keep lines that start with **Section Name**
    if (/^\*\*[^*]+\*\*/.test(trimmed)) return true;
    
    // Keep lines that start with bullet points
    if (/^[•\-\*]/.test(trimmed)) return true;
    
    // Remove everything else
    return false;
  });

  cleaned = validLines.join('\n');

  // Remove multiple consecutive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Validates that output contains proper classifications
 * @param {string} output - Cleaned output
 * @returns {boolean} - True if output is valid
 */
function validateOutput(output) {
  if (!output) return false;

  // Check if output contains at least one classification
  const hasClassification = /NORMAL|HIGH|LOW|BORDERLINE/i.test(output);
  
  // Check if output has bullet points
  const hasBullets = /^[•\-\*]/m.test(output);
  
  // Check if output has reasonable length (not too short, not too long)
  const hasReasonableLength = output.length > 50 && output.length < 5000;

  return hasClassification && hasBullets && hasReasonableLength;
}

/**
 * Extracts parameter classifications from text
 * @param {string} text - Input text
 * @returns {Array} - Array of parameter objects
 */
function extractParameters(text) {
  const parameters = [];
  const lines = text.split('\n');

  let currentSection = '';

  lines.forEach(line => {
    const trimmed = line.trim();

    // Check for section headers
    const sectionMatch = trimmed.match(/^[📊🧬🧠❤️💉🩺]\s*\*\*(.+?)\*\*/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      return;
    }

    // Check for parameter lines
    const paramMatch = trimmed.match(/^[•\-\*]\s*\*\*(.+?)\*\*:\s*(.+?)\s*-\s*(NORMAL|HIGH|LOW|BORDERLINE)/i);
    if (paramMatch) {
      parameters.push({
        section: currentSection,
        name: paramMatch[1].trim(),
        value: paramMatch[2].trim(),
        classification: paramMatch[3].toUpperCase(),
      });
    }
  });

  return parameters;
}

/**
 * Formats parameters into clean output
 * @param {Array} parameters - Array of parameter objects
 * @returns {string} - Formatted output
 */
function formatParameters(parameters) {
  if (parameters.length === 0) return '';

  // Group by section
  const sections = {};
  parameters.forEach(param => {
    if (!sections[param.section]) {
      sections[param.section] = [];
    }
    sections[param.section].push(param);
  });

  // Build output
  let output = '';
  
  Object.keys(sections).forEach(section => {
    if (section) {
      output += `📊 **${section}**\n`;
    }
    
    sections[section].forEach(param => {
      output += `• **${param.name}**: ${param.value} - ${param.classification}\n`;
    });
    
    output += '\n';
  });

  return output.trim();
}

/**
 * Main function to process AI output
 * @param {string} rawOutput - Raw AI output
 * @returns {object} - Processed result
 */
function processReportOutput(rawOutput) {
  // Clean the output
  const cleaned = cleanReportOutput(rawOutput);

  // Validate
  const isValid = validateOutput(cleaned);

  if (!isValid) {
    return {
      success: false,
      error: 'Invalid output format',
      cleaned: cleaned,
      original: rawOutput,
    };
  }

  // Extract parameters
  const parameters = extractParameters(cleaned);

  // Format cleanly
  const formatted = formatParameters(parameters);

  return {
    success: true,
    output: formatted || cleaned, // Use formatted if available, otherwise cleaned
    parameters: parameters,
    original: rawOutput,
  };
}

/**
 * Get classification color for frontend display
 * @param {string} classification - Classification (NORMAL/HIGH/LOW/BORDERLINE)
 * @returns {string} - Tailwind CSS color class
 */
function getClassificationColor(classification) {
  switch (classification.toUpperCase()) {
    case 'NORMAL':
      return 'text-green-500';
    case 'HIGH':
      return 'text-red-500';
    case 'LOW':
      return 'text-orange-500';
    case 'BORDERLINE':
      return 'text-yellow-500';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get classification emoji for frontend display
 * @param {string} classification - Classification (NORMAL/HIGH/LOW/BORDERLINE)
 * @returns {string} - Emoji
 */
function getClassificationEmoji(classification) {
  switch (classification.toUpperCase()) {
    case 'NORMAL':
      return '🟢';
    case 'HIGH':
      return '🔴';
    case 'LOW':
      return '🟡';
    case 'BORDERLINE':
      return '🟠';
    default:
      return '⚪';
  }
}

module.exports = {
  cleanReportOutput,
  validateOutput,
  extractParameters,
  formatParameters,
  processReportOutput,
  getClassificationColor,
  getClassificationEmoji,
};