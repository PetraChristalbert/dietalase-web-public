const OpenAI = require("openai");
const logger = require("../config/logger");

// 1. Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 2. Define and export TaskType (to keep other files from breaking)
// This is just a placeholder, as OpenAI's API doesn't use it.
const TaskType = {
  RETRIEVAL_QUERY: "RETRIEVAL_QUERY",
  RETRIEVAL_DOCUMENT: "RETRIEVAL_DOCUMENT",
};

/**
 * Turns a piece of text into a vector using OpenAI.
 * @param {string} text The text to embed
 * @param {string} taskType (Ignored by OpenAI, but kept for compatibility)
 * @returns {Promise<number[]>} An array of numbers.
 */
const generateEmbedding = async (text, taskType = TaskType.RETRIEVAL_DOCUMENT) => {
  try {
    // We use OpenAI's 'text-embedding-3-small' model
    // It's fast, cheap, and multilingual
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });

    if (
      !response ||
      !response.data ||
      !response.data[0] ||
      !response.data[0].embedding
    ) {
      logger.error("Invalid embedding response from OpenAI", { response });
      throw new Error("Invalid embedding response from OpenAI");
    }

    // Return the vector
    return response.data[0].embedding;

  } catch (error) {
    logger.error("Error generating OpenAI embedding:", {
      errorMessage: error.message,
      fullError: error,
    });
    return null;
  }
};

module.exports = {
  generateEmbedding,
  TaskType, // Export this so aiSearchController.js doesn't break
};