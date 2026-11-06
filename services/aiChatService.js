const { v4: uuidv4 } = require("uuid");
const knex = require("../db/knex");
const logger = require("../config/logger");
const {
  VertexAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google-cloud/vertexai");

const { generateEmbedding } = require("./embeddingService");
const vectorCache = require("./vectorCacheService");
const { findShoppingListSolution } = require("./shoppingListService");
const { wideSearch } = require("./rankingService");

const vertex_ai = new VertexAI({
  project: process.env.GCLOUD_PROJECT_ID,
  location: "us-central1",
});

// Tool Definitions for Gemini Function Calling
const tools = [
  {
    functionDeclarations: [
      {
        name: "semanticSearch",
        description: "Search for products and stores based on semantic meaning and category.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query (e.g., 'artisan ceramics')" },
            category: { type: "string", description: "Optional category to filter by" },
          },
          required: ["query"],
        },
      },
      {
        name: "findShoppingListSolution",
        description: "Find the best stores and prices for a list of items.",
        parameters: {
          type: "object",
          properties: {
            items: { 
              type: "array", 
              items: { type: "string" },
              description: "List of items to search for" 
            },
          },
          required: ["items"],
        },
      },
      {
        name: "wideSearch",
        description: "Broad marketplace search for stores or general queries.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search term" },
          },
          required: ["query"],
        },
      },
    ],
  },
];

const generativeModel = vertex_ai.getGenerativeModel({
  model: "gemini-2.5-flash",
  tools: tools,
  systemInstruction: {
    parts: [{
      text: `You are the "Digital Concierge" for DiEtalase, a premium artisan marketplace.
      Your goal is to help users find products, compare prices, and plan shopping routes.
      
      RULES:
      1. Use tools (semanticSearch, wideSearch, findShoppingListSolution) to get REAL data.
      2. NEVER hallucinate products. If the tool returns nothing, say so.
      3. ALWAYS respond in a valid JSON format:
         {
           "responseText": "Your friendly message here",
           "resultData": {
             "mode": "SINGLE_PRODUCT" | "MULTI_PRODUCT" | "SHOPPING_LIST_SOLUTION" | "NONE",
             "data": { ... relevant data from tools ... }
           }
         }`
    }],
  },
});

const toolFunctions = {
  semanticSearch: async ({ query, category }) => {
    const embedding = await generateEmbedding(query);
    const results = await vectorCache.search(embedding, 10, category);
    return results;
  },
  findShoppingListSolution: async ({ items }) => {
    return await findShoppingListSolution(items);
  },
  wideSearch: async ({ query }) => {
    return await wideSearch(query);
  },
};

const getAiResponse = async (threadId, query, context = {}) => {
  try {
    // 1. Get History from thread
    const historyData = await knex("chat_messages")
      .where("thread_id", threadId)
      .orderBy("created_at", "asc")
      .limit(15);

    const history = historyData.map(m => ({
      role: m.sender_type === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const chat = generativeModel.startChat({ history });

    const promptWithContext = `${query} (Context: ${JSON.stringify(context)})`;
    let result = await chat.sendMessage(promptWithContext);
    let response = result.response.candidates[0].content;

    // --- FUNCTION CALLING LOOP ---
    // Gemini might call multiple tools or call them sequentially
    let iterations = 0;
    while (response.parts.some(part => part.functionCall) && iterations < 5) {
      iterations++;
      const toolResponses = [];

      for (const part of response.parts) {
        if (part.functionCall) {
          const { name, args } = part.functionCall;
          logger.info(`AI calling tool: ${name}`, args);
          
          try {
            const data = await toolFunctions[name](args);
            toolResponses.push({
              functionResponse: {
                name: name,
                response: { content: data },
              },
            });
          } catch (err) {
            logger.error(`Tool execution failed: ${name}`, err);
            toolResponses.push({
              functionResponse: {
                name: name,
                response: { content: { error: "Tool failed" } },
              },
            });
          }
        }
      }

      if (toolResponses.length > 0) {
        result = await chat.sendMessage(toolResponses);
        response = result.response.candidates[0].content;
      }
    }

    const finalModelText = response.parts.map(p => p.text).join(" ");

    // 2. Parse JSON response
    let finalResponse = { 
      responseText: finalModelText, 
      resultData: { mode: "NONE", data: null } 
    };

    try {
      const jsonMatch = finalModelText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Support both old and new formats
        finalResponse.responseText = parsed.responseText || finalResponse.responseText;
        finalResponse.resultData = parsed.resultData || parsed;
      }
    } catch (e) {
      logger.warn("AI didn't return perfect JSON, using raw text.");
    }

    return finalResponse;
  } catch (error) {
    logger.error("AI Service Error:", error);
    return { 
      responseText: "Maaf, Concierge sedang mengalami gangguan koneksi ke jaringan artisan.", 
      resultData: { mode: "ERROR", data: null } 
    };
  }
};

module.exports = {
  getAiResponse,
};
