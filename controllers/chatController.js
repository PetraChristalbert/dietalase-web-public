const { v4: uuidv4 } = require("uuid");
const knex = require("../db/knex");
const logger = require("../config/logger");
const {
  VertexAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google-cloud/vertexai");

// --- 1. Import all your local tool dependencies ---
const { generateEmbedding } = require("../services/embeddingService");
const vectorCache = require("../services/vectorCacheService");
const {
  findShoppingListSolution: runShoppingListService,
} = require("../services/shoppingListService");
const { wideSearch: runWideSearch } = require("../services/rankingService");

// --- 3. Initialize the Vertex AI Chat Model ---
const vertex_ai = new VertexAI({
  project: process.env.GCLOUD_PROJECT_ID,
  location: "us-central1",
});

const generativeModel = vertex_ai.getGenerativeModel({
  model: "gemini-1.5-flash",
  // --- 4. UPDATED: System Instruction (Rules) ---
  systemInstruction: {
    parts: [
      {
        text: `You are an assistant for "DiEtalase", an e-commerce marketplace app.
Your ONLY job is to help users find products and stores. You MUST refuse any request not related to this.

### ATURAN UTAMA RESPONS ###
Respons FINAL Anda WAJIB berupa satu objek JSON yang valid. JANGAN membalas dengan teks biasa.
Balasan Anda HARUS dimulai dengan '{' dan diakhiri dengan '}'. JANGAN gunakan markdown backticks \`\`\`.

### ATURAN UTAMA TOOL ###
1.  **Pilih Tool:** Pilih 'semanticSearch' untuk kueri satu item, atau 'findShoppingListSolution' untuk kueri multi-item/daftar belanja.
2.  **Terima Output Tool:** Tool akan mengembalikan objek JSON yang sudah diformat lengkap.
3.  **KEMBALIKAN JSON DARI TOOL:** Tugas Anda HANYA mengembalikan objek JSON yang Anda terima dari tool, TANPA MENGUBAH APA PUN.

### ATURAN PENOLAKAN (Di luar topik) ###
Jika permintaan tidak relevan, balas HANYA dengan JSON ini:
{"responseText": "Maaf, saya hanya dapat membantu Anda mencari produk atau toko di DiEtalase.", "resultData": null}

### ATURAN FALLBACK (Kebingungan) ###
Jika Anda bingung, tidak yakin tool apa yang harus digunakan, atau kueri tidak jelas, balas HANYA dengan JSON ini:
{"responseText": "Maaf, saya tidak mengerti maksud Anda. Bisa tolong jelaskan lagi?", "resultData": null}
`,
      },
    ],
  },
  safetySettings: [
    // ... (Safety settings Anda tetap sama)
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
  ],
});

// --- 5. UPDATED: Tool Declarations (What we send to Google) ---
const toolDeclarations = {
  functionDeclarations: [
    {
      name: "semanticSearch",
      description:
        "Searches for products and stores using a natural language query and user's location. Use this for specific queries like 'servis laptop', 'tas kulit', 'buku novel', or 'PC gaming'.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The user's search query (e.g., 'jasa perbaikan laptop', 'toko buku terdekat').",
          },
          latitude: {
            type: "number",
            description: "The user's current latitude.",
          },
          longitude: {
            type: "number",
            description: "The user's current longitude.",
          },
          country: {
            type: "string",
            description: "The user's current country.",
          },
        },
        required: ["query", "latitude", "longitude", "country"],
      },
    },
    {
      name: "findShoppingListSolution",
      description:
        "Finds the best one-stop-shop or multi-stop route for a shopping list of multiple different product names.",
      parameters: {
        type: "OBJECT",
        properties: {
          items: {
            type: "ARRAY",
            description:
              "An array of product names to find, e.g., ['keyboard', 'mouse']",
            items: { type: "STRING" },
          },
          userLat: {
            type: "NUMBER",
            description: "The user's current latitude.",
          },
          userLng: {
            type: "NUMBER",
            description: "The user's current longitude.",
          },
        },
        required: ["items", "userLat", "userLng"],
      },
    },
    {
      name: "wideSearch",
      description:
        "Melakukan pencarian 'seluruh Indonesia' yang canggih untuk satu item, diranking berdasarkan relevansi, ulasan, jarak, dan harga. Gunakan ini jika pencarian lokal gagal atau pengguna memintanya.",
      parameters: {
        type: "OBJECT",
        properties: {
          query: {
            type: "STRING",
            description:
              "Kueri pencarian pengguna, misal: 'servis laptop terbaik'",
          },
          userLat: {
            type: "NUMBER",
            description: "Garis lintang pengguna saat ini.",
          },
          userLng: {
            type: "NUMBER",
            description: "Garis bujur pengguna saat ini.",
          },
        },
        required: ["query", "userLat", "userLng"],
      },
    },
    // TODO: Add "wideSearch" (country-level) and "findRoute" tools here
  ],
};

// --- 6. UPDATED: Tool Functions (Our local Node.js logic) ---
const toolFunctions = {
  semanticSearch: async ({ query, latitude, longitude, country }) => {
    logger.info(`[Tool] semanticSearch dipanggil.`, { query });
    try {
      const keywordQuery = `%${query}%`;
      const queryVector = await generateEmbedding(query, "RETRIEVAL_QUERY");
      const searchResults = vectorCache.search(queryVector, 100);
      const productIds = searchResults
        .filter((r) => r.type === "product")
        .map((r) => r.id);
      const productRank = new Map(productIds.map((pid, i) => [pid, i]));

      const storeIds = searchResults
        .filter((r) => r.type === "store")
        .map((r) => r.id);
      const storeRank = new Map(storeIds.map((sid, i) => [sid, i]));

      const userPoint = `POINT(${longitude} ${latitude})`;
      const radiusInMeters = 15 * 1000; // 15km

      let localProducts = [];
      if (productIds.length > 0) {
        // 3. Query Hibrida untuk Produk
        localProducts = await knex("products")
          .join("stores", "products.sid", "stores.sid")
          .select(
            "products.pid",
            "products.sid",
            "products.name",
            "products.price",
            "products.unit",
            "products.image",
            "stores.name as storeName"
          )
          // Beri skor bonus jika nama produk cocok dengan keyword
          .select(
            knex.raw(
              "CASE WHEN products.name ILIKE ? THEN 1 ELSE 0 END as keyword_score",
              [keywordQuery]
            )
          )
          .whereIn("products.pid", productIds)
          .whereRaw(
            "ST_DWithin(stores.location, ST_SetSRID(ST_GeogFromText(?), 4326)::geography, ?)",
            [userPoint, radiusInMeters]
          );

        // 4. Re-rank di Node.js
        localProducts.sort((a, b) => {
          // Urutkan berdasarkan keyword_score (DESC)
          if (a.keyword_score > b.keyword_score) return -1;
          if (a.keyword_score < b.keyword_score) return 1;
          // Jika sama, urutkan berdasarkan peringkat semantik (ASC)
          return productRank.get(a.pid) - productRank.get(b.pid);
        });
        localProducts = localProducts.slice(0, 5); // Ambil Top 5 HIBRIDA
      }

      let localStores = [];
      if (storeIds.length > 0) {
        // 3. Query Hibrida untuk Toko
        localStores = await knex("stores")
          .select(
            "sid",
            "name",
            "type",
            "address",
            "city",
            knex.raw("ST_X(location::geometry) as lng"),
            knex.raw("ST_Y(location::geometry) as lat")
          )
          // Beri skor bonus jika nama toko cocok dengan keyword
          .select(
            knex.raw(
              "CASE WHEN name ILIKE ? THEN 1 ELSE 0 END as keyword_score",
              [keywordQuery]
            )
          )
          .whereIn("sid", storeIds)
          .whereRaw(
            "ST_DWithin(location, ST_SetSRID(ST_GeogFromText(?), 4326)::geography, ?)",
            [userPoint, radiusInMeters]
          );

        // 4. Re-rank di Node.js
        localStores.sort((a, b) => {
          if (a.keyword_score > b.keyword_score) return -1;
          if (a.keyword_score < b.keyword_score) return 1;
          return storeRank.get(a.sid) - storeRank.get(b.sid);
        });
        localStores = localStores.slice(0, 5); // Ambil Top 5 HIBRIDA
      }

      if (localProducts.length === 0 && localStores.length === 0) {
        logger.warn(
          `[Tool] Tidak ada hasil lokal (produk/toko) dalam radius 15km.`
        );
        // Kembalikan JSON "NO_SOLUTION"
        return JSON.stringify({
          responseText: `Toko/Produk untuk "${query}" tidak tersedia di sekitarmu. Apakah kamu mau memperluas pencarian?`, // AI tidak perlu lagi mengarang ini
          resultData: {
            mode: "NO_LOCAL_RESULTS",
            country: country, // Sertakan country jika diperlukan
          },
        });
      }

      // Tentukan Tipe Hasil Prioritas (Logika Anda tetap sama)
      let primaryType = null;
      for (const result of searchResults) {
        if (result.type === "store") {
          if (localStores.some((s) => s.sid === result.id)) {
            primaryType = "store";
            break;
          }
        } else if (result.type === "product") {
          if (localProducts.some((p) => p.pid === result.id)) {
            primaryType = "product";
            break;
          }
        }
      }
      if (!primaryType) {
        primaryType = localStores.length > 0 ? "store" : "product";
      }

      // Bangun Respons JSON Terstruktur
      if (primaryType === "product") {
        const p = localProducts[0];
        return JSON.stringify({
          responseText: `Saya menemukan produk yang cocok untuk "${query}".`,
          resultData: {
            mode: "SINGLE_PRODUCT",
            data: {
              pid: p.pid,
              name: p.name,
              image: p.image,
              price: p.price,
              storeName: p.storeName,
              sid: p.sid, // <-- Kirim SID
            },
          },
        });
      } else {
        // primaryType === "store"
        const s = localStores[0];
        return JSON.stringify({
          responseText: `Ini toko yang mungkin Anda cari untuk "${query}".`,
          resultData: {
            mode: "SINGLE_STORE",
            data: {
              sid: s.sid,
              name: s.name,
              address: s.address,
              image:
                "https://dietalase.com/Assets/images/default_store_icon.png", // Default image
              lat: s.lat,
              lng: s.lng,
            },
          },
        });
      }
    } catch (error) {
      logger.error("[Tool] Error di dalam semanticSearch:", error);
      return JSON.stringify({
        responseText: "Terjadi kesalahan saat mencari.",
        resultData: { mode: "ERROR", details: error.message },
      });
    }
  },
  findShoppingListSolution: async ({ items, userLat, userLng }) => {
    logger.info(`[Tool] findShoppingListSolution dipanggil.`, {
      items,
      userLat,
      userLng,
    });
    try {
      // Panggil service logic Anda yang sudah di-upgrade
      const solution = await runShoppingListService(items, userLat, userLng);

      logger.info(`[Tool] findShoppingListSolution selesai.`, { solution });

      // Kembalikan JSON (yang sudah dibuat oleh service)
      return JSON.stringify(solution);
    } catch (error) {
      logger.error("[Tool] Error di dalam findShoppingListSolution:", error);
      return JSON.stringify({
        responseText: "Terjadi kesalahan saat mencari rute.",
        resultData: { mode: "ERROR", details: error.message },
      });
    }
  },
  wideSearch: async ({ query, userLat, userLng }) => {
    logger.info(`[Tool] wideSearch dipanggil.`, { query, userLat, userLng });
    try {
      // Panggil service logic "Mode 3" Anda
      const solution = await runWideSearch(query, userLat, userLng);
      logger.info(`[Tool] wideSearch selesai.`, { solution });
      return JSON.stringify(solution);
    } catch (error) {
      logger.error("[Tool] Error di dalam wideSearch:", error);
      return JSON.stringify({
        responseText: "Terjadi kesalahan saat mencari rute.",
        resultData: { mode: "ERROR", details: error.message },
      });
    }
  },
  // TODO: Add "wideSearch" (country-level) and "findRoute" functions here
};

// --- 7. Main Chat Handler (Updated to pass location to tools) ---
const handleChat = async (req, res) => {
  let { query, chatId, latitude, longitude, city, country } = req.body;
  logger.info(`[Chat] Request /api/chat dimulai.`, { body: req.body });

  if (!query) {
    logger.warn("[Chat] Request ditolak: Query kosong.");
    return res.status(400).json({ error: "Query is required." });
  }

  try {
    if (!chatId) {
      chatId = uuidv4();
      logger.info(`[Chat] ChatID baru dibuat: ${chatId}`, { chatId });
    }

    const history = await knex("chat_history")
      .where("chat_id", chatId)
      .orderBy("created_at", "asc")
      .select("role", "content as parts");

    logger.info(
      `[Chat] Memuat ${history.length} pesan histori untuk ${chatId}.`,
      { chatId }
    );

    const chat = generativeModel.startChat({
      history: history.map((item) => ({
        role: item.role,
        parts: [{ text: item.content }],
      })),
      tools: [toolDeclarations],
    });

    await knex("chat_history").insert({
      chat_id: chatId,
      role: "user",
      content: query,
    });
    logger.info(`[Chat] Pesan pengguna disimpan ke DB.`, { chatId, query });

    const promptWithContext = [
      { text: query },
      {
        text: `(Context: User location is latitude: ${latitude}, longitude: ${longitude}, city: "${city}", country: "${country}")`,
      },
    ];

    logger.info(`[Chat] Mengirim prompt ke Gemini (Panggilan 1)...`, {
      chatId,
      prompt: promptWithContext,
    });

    const result = await chat.sendMessage(promptWithContext);
    const aiResponse = result.response;
    const candidate = aiResponse.candidates?.[0];

    logger.info(`[Chat] Menerima respons dari Gemini (Panggilan 1).`, {
      chatId,
    });

    const callPart = candidate?.content?.parts?.[0];

    if (callPart && callPart.functionCall) {
      logger.info(
        `[Chat] Gemini meminta panggilan tool: ${callPart.functionCall.name}`,
        { chatId, functionCall: callPart.functionCall }
      );

      const toolFunction = toolFunctions[callPart.functionCall.name];
      if (toolFunction) {
        let toolArgs;
        if (callPart.functionCall.name === "semanticSearch") {
          toolArgs = {
            ...callPart.functionCall.args,
            latitude,
            longitude,
            country,
          };
        } else if (callPart.functionCall.name === "findShoppingListSolution") {
          toolArgs = callPart.functionCall.args;

          // --- TAMBAHKAN BLOK INI: ---
        } else if (callPart.functionCall.name === "wideSearch") {
          toolArgs = {
            ...callPart.functionCall.args,
            userLat: latitude, // Gunakan latitude dari req.body
            userLng: longitude, // Gunakan longitude dari req.body
          };
        }

        logger.info(`[Chat] Menjalankan tool dengan argumen...`, {
          chatId,
          toolArgs,
        });

        // --- INI ADALAH PERUBAHAN UTAMA ---
        // 'toolResult' adalah STRING JSON FINAL yang kita inginkan.
        const toolResultString = await toolFunction(toolArgs);
        logger.info(
          `[Chat] Tool selesai. Menerima JSON final dari tool: ${toolResultString}`,
          { chatId }
        );

        // Kita tidak perlu mengirim kembali ke AI.
        // Kita bisa langsung parse dan kirim ke klien.

        let finalResponseObject;
        try {
          // 'toolResultString' adalah apa yang sebelumnya kita sebut 'finalAnswerJsonString'
          finalResponseObject = JSON.parse(toolResultString);
        } catch (e) {
          logger.error("[Chat] Gagal parse JSON dari tool lokal!", {
            chatId,
            rawJsonString: toolResultString,
            error: e.message,
          });
          finalResponseObject = {
            responseText: "Terjadi kesalahan saat memproses respons AI.",
            resultData: null,
          };
        }

        // Simpan HANYA bagian responseText ke riwayat chat
        await knex("chat_history").insert({
          chat_id: chatId,
          role: "model",
          content: finalResponseObject.responseText,
        });
        logger.info(`[Chat] Menyimpan respons AI ke DB.`, {
          chatId,
          content: finalResponseObject.responseText,
        });

        // Kirim SELURUH objek ke mobile
        logger.info(`[Chat] Mengirim respons akhir ke klien.`, {
          chatId,
          finalResponse: finalResponseObject,
        });
        return res.json({
          ...finalResponseObject,
          chatId: chatId,
        });
        // --- AKHIR DARI PERUBAHAN ---
      }
    }

    // --- Fallback (Penolakan, Kebingungan) ---
    logger.info(
      `[Chat] Tidak ada panggilan tool. Memproses sebagai fallback/rejection.`,
      { chatId }
    );
    let textResponseString = candidate?.content?.parts?.[0]?.text;
    if (!textResponseString) {
      logger.error("[Chat] Respons AI kosong atau diblokir safety filter.", {
        chatId,
        aiResponse,
      });
      throw new Error("AI response was empty or blocked.");
    }
    logger.info(
      `[Chat] Menerima teks mentah dari Gemini (Panggilan 1): ${textResponseString}`,
      { chatId }
    );
    let finalResponseObject;
    const jsonMatch = textResponseString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        finalResponseObject = JSON.parse(jsonMatch[0]);
      } catch (e) {
        finalResponseObject = {
          responseText: textResponseString.replace(/```json\n|```/g, ""),
          resultData: null,
        };
      }
    } else {
      finalResponseObject = {
        responseText: textResponseString,
        resultData: null,
      };
    }

    // Simpan penolakan ke riwayat
    await knex("chat_history").insert({
      // <-- PERBAIKAN TYPO 'knx'
      chat_id: chatId,
      role: "model",
      content: finalResponseObject.responseText,
    });
    logger.info(`[Chat] Menyimpan respons fallback/rejection ke DB.`, {
      chatId,
      content: finalResponseObject.responseText,
    });

    // Kirim kembali
    logger.info(`[Chat] Mengirim respons fallback/rejection ke klien.`, {
      chatId,
      finalResponse: finalResponseObject,
    });
    return res.json({
      ...finalResponseObject,
      chatId: chatId,
    });
  } catch (error) {
    logger.error("[Chat] Terjadi error fatal di handleChat:", {
      chatId,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Chat processing failed." });
  }
};

module.exports = {
  handleChat,
};
