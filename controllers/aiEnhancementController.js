const { VertexAI } = require("@google-cloud/vertexai");
const logger = require("../config/logger");

// --- 1. Inisialisasi Klien AI ---
// Kita akan menggunakan model 'gemini-1.5-flash' karena bisa menangani teks (untuk toko)
// dan multimodal (teks + gambar) untuk produk.
const vertex_ai = new VertexAI({
  project: process.env.GCLOUD_PROJECT_ID,
  location: "us-central1",
});

const generativeModel = vertex_ai.getGenerativeModel({
  model: "gemini-2.5-flash",
});

// --- 2. Helper Cerdas untuk AI (Membuat Konten) ---
/**
 * Memanggil Gemini untuk menghasilkan konten AI (nama, deskripsi, dll.)
 * @param {string} prompt - Instruksi teks untuk AI.
 * @param {string} [imageBase64] - (Opsional) Data gambar base64 untuk analisis multimodal.
 * @param {string} [mimeType] - (Opsional) Tipe MIME dari gambar (misal: 'image/png').
 * @returns {Promise<object>} Objek JSON yang diparsing dari respons AI.
 */
const generateAiContent = async (prompt, imageBase64, mimeType) => {
  try {
    const parts = [{ text: prompt }];

    // Tambahkan gambar jika ada (untuk addProduct)
    if (imageBase64 && mimeType) {
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      });
      // Tambahkan teks prompt lagi agar AI tahu apa yang harus dilakukan dengan gambar
      parts.push({
        text: "Gunakan gambar di atas dan teks prompt pertama untuk menghasilkan respons JSON.",
      });
    }

    // Instruksikan AI untuk SELALU merespons dalam JSON
    const request = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const result = await generativeModel.generateContent(request);
    
    if (
      !result.response ||
      !result.response.candidates ||
      !result.response.candidates[0] ||
      !result.response.candidates[0].content ||
      !result.response.candidates[0].content.parts ||
      !result.response.candidates[0].content.parts[0] ||
      !result.response.candidates[0].content.parts[0].text
    ) {
      logger.error("Invalid Gemini response structure", { response: result.response });
      throw new Error("Invalid or empty response from Gemini API.");
    }
    
    const aiResponseText = result.response.candidates[0].content.parts[0].text;
    return JSON.parse(aiResponseText);
  } catch (error) {
    logger.error("Error calling Gemini API:", {
      message: error.message,
      stack: error.stack,
    });
    throw new Error(`Gemini API call failed: ${error.message}`);
  }
};

module.exports = {
  generateAiContent,
};