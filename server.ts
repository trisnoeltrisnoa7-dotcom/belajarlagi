import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { generateSmartQuestionsFallback } from "./src/utils/questionGeneratorFallback.ts";

if (process.env.CLOUDFLARE_WORKERS !== "1") {
  dotenv.config();
}

// Safe resolution for __dirname in both ESM and CJS environments
const safeDirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : process.cwd();

// Production & Cloud Run environment detection
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.argv.some((arg) => arg.includes("dist") || arg.includes("server.cjs") || arg.includes("server.js")) ||
  fs.existsSync(path.join(process.cwd(), "dist", "index.html"));

if (isProduction && process.env.NODE_ENV !== "production") {
  process.env.NODE_ENV = "production";
}

// Global safety error handlers are useful in Node/VM deployments.
// Workers has its own request/runtime error handling, so do not register
// process-level Node handlers there.
if (process.env.CLOUDFLARE_WORKERS !== "1") {
  process.on("unhandledRejection", (reason, promise) => {
    console.warn("Unhandled Rejection at:", promise, "reason:", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
  });
}

// Initialize server-side Gemini client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Heuristic diagnostic generator for results analysis when AI model is temporarily unavailable (503/429)
function generateHeuristicDiagnostic(resultSummary: any, targetPtn?: string, targetMajor?: string) {
  const subtests: any[] = resultSummary?.subtestScores || [];
  const totalIrt = resultSummary?.totalIrtScore || 600;
  const accuracy = resultSummary?.accuracy || 70;

  // Sort subtests by score
  const sorted = [...subtests].sort((a, b) => (b.score || 0) - (a.score || 0));
  const strongest = sorted.slice(0, 2).map((s) => s.name || "Kemampuan Penalaran");
  const weakest = sorted.slice(-2).reverse().map((s) => s.name || "Penalaran Kuantitatif");

  if (strongest.length === 0) strongest.push("Literasi Bahasa Indonesia", "Penalaran Umum");
  if (weakest.length === 0) weakest.push("Pengetahuan Kuantitatif", "Penalaran Matematika");

  let summary = "";
  if (accuracy >= 80) {
    summary = `Performa luar biasa! Anda mencapai akurasi ${accuracy}% dengan skor IRT ${totalIrt}. Penguasaan konsep Anda sangat matang dan siap bersaing di tingkat nasional.`;
  } else if (accuracy >= 60) {
    summary = `Hasil tryout menunjukkan fondasi yang baik dengan skor IRT ${totalIrt} (akurasi ${accuracy}%). Fokus perbaikan pada subtes berbobot tinggi akan mendongkrak peringkat Anda secara signifikan.`;
  } else {
    summary = `Hasil tryout awal adalah pijakan evaluasi yang berharga (skor ${totalIrt}). Dengan strategi latihan terarah dan drill soal HOTS, peningkatan skor 100+ poin sangat dapat dicapai.`;
  }

  const ptn = targetPtn || "PTN Favorit";
  const major = targetMajor || "Program Studi Pilihan";

  return {
    overallSummary: summary,
    strongestSubjects: strongest,
    areasToImprove: weakest,
    recommendedSchedule: [
      `Senin - Rabu: Drill 25 butir soal fokus pada ${weakest[0] || "Penalaran Matematika"} dan telaah pembahasan konsep.`,
      `Kamis - Jumat: Latihan penguatan kecepatan membaca pada ${weakest[1] || "Literasi Bahasa"} dengan target 1.5 menit/soal.`,
      `Sabtu: Simulasi CBT Mandiri penuh (Full Tryout) dengan suasana ujian sebenarnya.`,
      `Minggu: Evaluasi berkala lembar pengerjaan & review Bank Soal untuk mengunci pemahaman.`,
    ],
    targetAdvice: `Untuk target ${major} di ${ptn}, pertahankan kekuatan di ${strongest[0]} dan tingkatkan skor ${weakest[0]} minimal 40-70 poin agar peluang lolos semakin optimal di kuota SNBT.`,
  };
}

// Heuristic Tutor Reply
function generateHeuristicTutorReply(questionData: any, userAnswer: any, userPrompt?: string) {
  const subtest = questionData?.subtestName || "UTBK";
  const correct = questionData?.correctAnswer || "A";
  const explanation = questionData?.explanation;
  const steps = explanation?.steps?.length ? explanation.steps.join("\n- ") : "Pahami stimulus, eliminasi opsi yang tidak relevan, dan tentukan jawaban berdasarkan fakta logis.";
  const concept = explanation?.concept || "Prinsip Penalaran Kritis & Pemahaman Konsep Dasar";
  const fastTrick = explanation?.fastTrick || "Perhatikan kata kunci pertanyaan dan jangan terjebak opsi pengecoh yang memuat pernyataan terlalu ekstrem.";

  return `### 🧑‍🏫 Pembahasan Master Tutor (${subtest})

**Kunci Jawaban Benar:** **Opsi ${correct}**
${userAnswer ? `**Jawaban Anda:** Opsi ${JSON.stringify(userAnswer)}` : "**Status:** Belum dijawab"}

---

#### 📌 Konsep Inti:
${concept}

#### 💡 Langkah Penyelesaian Sistematis:
- ${steps}

#### ⚡ Trik Cepat / Logika Cerdas:
${fastTrick}

${explanation?.summary ? `\n> **Catatan:** ${explanation.summary}` : ""}

*Tetap semangat! Pertajam analisis pola soal serupa di bank latihan untuk meningkatkan akurasi dan kecepatan saat ujian sesungguhnya.*`;
}

// In-memory cache to prevent redundant Gemini API calls and stay within rate limits
const apiResponseCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

function getCachedResponse(key: string): string | null {
  const item = apiResponseCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    apiResponseCache.delete(key);
    return null;
  }
  return item.data;
}

function setCachedResponse(key: string, data: string): void {
  if (apiResponseCache.size > 200) {
    const firstKey = apiResponseCache.keys().next().value;
    if (firstKey) apiResponseCache.delete(firstKey);
  }
  apiResponseCache.set(key, { data, timestamp: Date.now() });
}

// Safe helper to call Gemini with cache, smart retry, & model fallback
async function generateContentSafe(
  ai: GoogleGenAI | null,
  prompt: string,
  config: any = {},
  options: { bypassCache?: boolean } = {}
): Promise<string | null> {
  if (!ai) return null;

  const bypassCache = !!options.bypassCache;
  const cacheKey = `gemini_${prompt}_${JSON.stringify(config)}`;

  // Check cache first (unless bypassed)
  if (!bypassCache) {
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Model fallback chain: primary standard text model -> lightweight model -> latest flash
  const modelsToTry = [
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
  ];

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });
      if (response && response.text) {
        if (!bypassCache) {
          setCachedResponse(cacheKey, response.text);
        }
        return response.text;
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isQuotaOrRateLimit =
        err?.status === 429 ||
        errMsg.includes("429") ||
        errMsg.includes("quota") ||
        errMsg.includes("RESOURCE_EXHAUSTED");
      const isUnavailable =
        err?.status === 503 ||
        errMsg.includes("503") ||
        errMsg.includes("UNAVAILABLE") ||
        errMsg.includes("high demand");

      console.warn(`[Gemini API] Model ${model} returned: ${isQuotaOrRateLimit ? '429 Quota/Rate Limit' : isUnavailable ? '503 Unavailable/High Demand' : errMsg.slice(0, 120)}`);

      // If 503 high demand or quota, try a fast backoff before moving to lightweight model
      if ((isUnavailable || isQuotaOrRateLimit) && model === "gemini-3.8-flash") {
        try {
          await new Promise((res) => setTimeout(res, 600));
          const retryRes = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: prompt,
            config,
          });
          if (retryRes && retryRes.text) {
            if (!bypassCache) {
              setCachedResponse(cacheKey, retryRes.text);
            }
            return retryRes.text;
          }
        } catch {
          // Proceed to next in loop
        }
      }
      continue;
    }
  }
  return null;
}

// Track DeepSeek auth state to avoid repeated 401/403 requests if key is invalid
let isDeepSeekAuthInvalid = false;

// Safe helper to call DeepSeek API (DeepSeek V3 / DeepSeek R1 Reasoner)
async function callDeepSeekSafe(
  prompt: string,
  model: string = "deepseek-chat", // "deepseek-chat" (V3) or "deepseek-reasoner" (R1)
  config: any = {}
): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  // DeepSeek official API keys typically start with 'sk-' and are at least 20 chars long
  const isValidFormat = typeof apiKey === "string" && apiKey.trim().startsWith("sk-") && apiKey.trim().length >= 20;
  if (!apiKey || !isValidFormat || isDeepSeekAuthInvalid) {
    return null;
  }

  const actualModel = model.includes("r1") || model.includes("reasoner") ? "deepseek-reasoner" : "deepseek-chat";
  const cacheKey = `deepseek_${actualModel}_${prompt}_${JSON.stringify(config)}`;
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000);

    const isJsonRequested = config.responseMimeType === "application/json" || prompt.includes("JSON");
    const isReasoner = actualModel === "deepseek-reasoner";

    const systemPrompt = isJsonRequested
      ? "Anda adalah AI Expert Pembuat Soal Ujian Nasional SMA, UTBK-SNBT, dan Kurikulum Merdeka. Anda WAJIB menjawab HANYA dalam format JSON valid tanpa format markdown tambahan selain array/objek JSON yang diminta."
      : "Anda adalah AI Asisten Guru dan Master Tutor UTBK-SNBT yang cerdas, sistematis, ramah, dan mendidik.";

    const bodyPayload: any = {
      model: actualModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    };

    if (!isReasoner) {
      bodyPayload.temperature = config.temperature ?? 0.7;
      if (config.responseMimeType === "application/json") {
        bodyPayload.response_format = { type: "json_object" };
      }
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        isDeepSeekAuthInvalid = true;
        console.warn(`[DeepSeek API] Authentication failed (Status ${response.status}). Automatically disabling DeepSeek and routing AI requests to Google Gemini.`);
      } else {
        const errText = await response.text();
        console.warn(`[DeepSeek API] Status ${response.status}: ${errText.slice(0, 150)}`);
      }
      return null;
    }

    const data: any = await response.json();
    let text = data?.choices?.[0]?.message?.content || "";

    if (isJsonRequested && typeof text === "string") {
      text = text.trim();
      if (text.startsWith("```json")) {
        text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (text.startsWith("```")) {
        text = text.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
    }

    if (text) {
      setCachedResponse(cacheKey, text);
      return text;
    }
  } catch (err: any) {
    console.warn(`[DeepSeek API] Call error: ${err?.message || err}`);
  }
  return null;
}

// Unified Multi-Model AI Dispatcher (Gemini & DeepSeek with seamless automatic fallbacks)
async function generateUnifiedAIContentSafe(
  ai: GoogleGenAI | null,
  prompt: string,
  options: {
    aiEngine?: 'gemini' | 'deepseek_v3' | 'deepseek_r1' | string;
    config?: any;
    bypassCache?: boolean;
  } = {}
): Promise<{ text: string | null; usedEngine: 'gemini' | 'deepseek_v3' | 'deepseek_r1' | 'fallback' }> {
  const { aiEngine = 'gemini', config = {}, bypassCache = false } = options;

  if (aiEngine === 'deepseek_v3' || aiEngine === 'deepseek_r1') {
    const modelName = aiEngine === 'deepseek_r1' ? 'deepseek-reasoner' : 'deepseek-chat';
    const deepseekText = await callDeepSeekSafe(prompt, modelName, config);
    if (deepseekText) {
      return { text: deepseekText, usedEngine: aiEngine };
    }
    // Seamless fallback to Google Gemini if DeepSeek key is absent or limited
    console.warn(`[AI Engine] ${aiEngine} unavailable or unconfigured, falling back to Google Gemini.`);
    const geminiText = await generateContentSafe(ai, prompt, config, { bypassCache });
    if (geminiText) {
      return { text: geminiText, usedEngine: 'gemini' };
    }
    return { text: null, usedEngine: 'fallback' };
  }

  // Default: Gemini first
  const geminiText = await generateContentSafe(ai, prompt, config, { bypassCache });
  if (geminiText) {
    return { text: geminiText, usedEngine: 'gemini' };
  }

  // Secondary backup to DeepSeek if available
  const deepseekBackup = await callDeepSeekSafe(prompt, 'deepseek-chat', config);
  if (deepseekBackup) {
    return { text: deepseekBackup, usedEngine: 'deepseek_v3' };
  }

  return { text: null, usedEngine: 'fallback' };
}

async function startServer() {
  const app = express();
  
  // Infrastructure Port Configuration:
  // Port 3000 is hardcoded by the Cloud Run container infrastructure and Nginx reverse proxy.
  // All external and ingress traffic is routed exclusively through Nginx (port 8080) to http://localhost:3000.
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Health check endpoints for container probes and Cloud Run deployment health checks
  app.get(["/api/health", "/health", "/_health", "/healthz"], (_req, res) => {
    res.status(200).json({ status: "ok", port: PORT, production: isProduction, timestamp: new Date().toISOString() });
  });

  // Server-authoritative exam mode and tokens. Never trust mode/token values
  // supplied by the browser for an actual exam. Configure EXAM_MODE and
  // EXAM_TOKENS_JSON in the deployment environment.
  const serverExamMode = (process.env.EXAM_MODE || "normal").toLowerCase() === "free" ? "free" : "normal";
  let examTokens: Record<string, string> = {};
  try {
    const raw = process.env.EXAM_TOKENS_JSON || "{}";
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      examTokens = Object.fromEntries(
        Object.entries(parsed).filter(
          (entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string"
        )
      );
    }
  } catch {
    console.warn("Invalid EXAM_TOKENS_JSON; normal-mode token verification will fail closed.");
  }

  const tokenAttempts = new Map<string, { count: number; resetAt: number }>();
  const allowTokenAttempt = (key: string, max = 20, windowMs = 60_000) => {
    const now = Date.now();
    const current = tokenAttempts.get(key);
    if (!current || now >= current.resetAt) {
      tokenAttempts.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (current.count >= max) return false;
    current.count += 1;
    return true;
  };

  // Dedicated middleware for exam-token endpoints: Enforce strict anti-cache headers for Safari & Mobile devices
  app.use("/api/exam-token", (_req, res, next) => {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
      "Surrogate-Control": "no-store",
    });
    next();
  });

  // GET /api/exam-token/status: server-authoritative mode. Query parameters cannot
  // switch an exam into free mode.
  app.get("/api/exam-token/status", (_req, res) => {
    res.json({
      status: "ok",
      isTokenRequired: serverExamMode === "normal",
      serverTimestamp: Date.now(),
      mode: serverExamMode,
    });
  });

  // POST /api/exam-token/status is intentionally disabled unless a deployment
  // provides a private server-side supervisor key. Never put this key in VITE_*.
  app.post("/api/exam-token/status", (req, res) => {
    const configuredKey = process.env.SUPERVISOR_API_KEY;
    if (!configuredKey) return res.status(503).json({ status: "disabled", error: "Supervisor API is not configured." });
    const supplied = String(req.header("x-supervisor-api-key") || "");
    const valid = supplied.length === configuredKey.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(configuredKey));
    if (!valid) return res.status(401).json({ status: "unauthorized" });
    // Mode is deployment-controlled; this endpoint intentionally does not accept
    // a client-selected token value. Change EXAM_MODE through the server environment.
    return res.json({ status: "ok", isTokenRequired: serverExamMode === "normal", serverTimestamp: Date.now() });
  });

  // POST /api/exam-token/verify: token is compared only with the server-side
  // token registry. The browser must never send an expected token.
  app.post("/api/exam-token/verify", (req, res) => {
    const key = `${req.ip}:${String(req.body?.packageId || "")}`;
    if (!allowTokenAttempt(key)) {
      return res.status(429).json({ isValid: false, errorMessage: "Terlalu banyak percobaan token. Silakan tunggu satu menit." });
    }

    if (serverExamMode === "free") {
      return res.json({ isValid: true, isTokenMandatory: false, serverTimestamp: Date.now() });
    }

    const packageId = String(req.body?.packageId || "").trim();
    const inputToken = String(req.body?.inputToken || "").trim().toUpperCase();
    const expected = String(examTokens[packageId] || "").trim().toUpperCase();

    if (!packageId || !expected) {
      return res.status(503).json({
        isValid: false,
        isTokenMandatory: true,
        serverTimestamp: Date.now(),
        errorMessage: "Token ujian belum dikonfigurasi di server untuk paket ini. Hubungi administrator.",
      });
    }
    if (!inputToken) {
      return res.json({ isValid: false, isTokenMandatory: true, serverTimestamp: Date.now(), errorMessage: "Token Ujian wajib diisi." });
    }
    const isValid = inputToken.length === expected.length && crypto.timingSafeEqual(Buffer.from(inputToken), Buffer.from(expected));
    return res.json({
      isValid,
      isTokenMandatory: true,
      serverTimestamp: Date.now(),
      ...(isValid ? {} : { errorMessage: "Token Ujian tidak sesuai. Silakan periksa kembali token resmi dari pengawas." }),
    });
  });

  // AI Tutor explanation endpoint
  app.post("/api/ai/ask-tutor", async (req, res) => {
    try {
      const { questionData, userAnswer, userPrompt, chatHistory, aiEngine = "gemini" } = req.body;
      const ai = getGeminiClient();

      const prompt = `
Anda adalah Guru Tutor Master UTBK & SNBT Nasional yang ramah, sangat cerdas, jelas, dan memberikan penjelasan komprehensif berbobot tinggi dalam Bahasa Indonesia.

Informasi Soal Ujian:
- Subtes: ${questionData?.subtestName || "TPS/TKA"} (${questionData?.category || "UTBK"})
- Topik: ${questionData?.topic || "General"}
- Tipe Soal: ${questionData?.type || "Pilihan Ganda"}
- Teks Stimulus/Wacana: ${questionData?.stimulus || "Tidak ada wacana tambahan"}
- Soal: ${questionData?.questionText || ""}
- Pilihan Opsi: ${JSON.stringify(questionData?.options || [])}
- Kunci Jawaban Resmi: ${JSON.stringify(questionData?.correctAnswer || "")}
- Pembahasan Resmi: ${JSON.stringify(questionData?.explanation || "")}
- Jawaban Siswa: ${JSON.stringify(userAnswer || "Tidak dijawab")}

Pertanyaan/Keluhan Siswa:
"${userPrompt || "Tolong jelaskan konsep dasar dan cara tercepat menyelesaikan soal ini step-by-step."}"

Riwayat Diskusi Sebelumnya:
${JSON.stringify(chatHistory || [])}

Tugas Anda:
1. Jawab pertanyaan siswa dengan nada suportif, mendidik, dan mudah dimengerti.
2. Berikan analisis kenapa jawaban yang benar itu tepat, dan jika jawaban siswa salah, jelaskan letak kesalahpahamannya tanpa menghakimi.
3. Berikan "TRIK CEPAT / LOGIKA PRAKTIS" (The King/Super Solution) jika relevan untuk menghemat waktu saat ujian real UTBK.
4. Gunakan format markdown yang rapi dengan poin-poin jelas dan penekanan kata penting.
`;

      const { text: aiText, usedEngine } = await generateUnifiedAIContentSafe(ai, prompt, {
        aiEngine,
        config: { temperature: 0.7 },
      });

      if (aiText) {
        return res.json({ reply: aiText, aiEngine: usedEngine });
      }

      const fallbackReply = generateHeuristicTutorReply(questionData, userAnswer, userPrompt);
      res.json({ reply: fallbackReply, aiEngine: "fallback" });
    } catch (error: any) {
      console.error("Error in /api/ai/ask-tutor:", error);
      const fallbackReply = generateHeuristicTutorReply(req.body?.questionData, req.body?.userAnswer, req.body?.userPrompt);
      res.json({ reply: fallbackReply, aiEngine: "fallback" });
    }
  });

  // AI Comprehensive Diagnostic & Learning Plan generator
  app.post("/api/ai/analyze-results", async (req, res) => {
    try {
      const { resultSummary, targetPtn, targetMajor } = req.body;
      const ai = getGeminiClient();

      const heuristicResult = generateHeuristicDiagnostic(resultSummary, targetPtn, targetMajor);

      const prompt = `
Anda adalah Konsultan Pakar Masuk PTN & Analis Data Ujian SNBT/UTBK Nasional.
Analisis data hasil pengerjaan tryout siswa berikut:
${JSON.stringify(resultSummary, null, 2)}

Target Siswa:
- PTN Impian: ${targetPtn || "Perguruan Tinggi Negeri Favorit"}
- Jurusan / Program Studi: ${targetMajor || "Program Studi Pilihan"}

Berikan output dalam format JSON valid dengan struktur:
{
  "overallSummary": "Ringkasan performa menyeluruh (2-3 kalimat tajam dan memotivasi)",
  "strongestSubjects": ["Subtes 1", "Subtes 2"],
  "areasToImprove": ["Subtes/Topik yang perlu diperbaiki 1", "Topik 2"],
  "recommendedSchedule": [
    "Rencana aksi belajar spesifik 1",
    "Rencana aksi belajar spesifik 2",
    "Rencana aksi belajar spesifik 3",
    "Rencana aksi belajar spesifik 4"
  ],
  "targetAdvice": "Analisis peluang kelulusan pada target PTN dan strategi mengejar passing grade."
}
`;

      const aiText = await generateContentSafe(ai, prompt, {
        responseMimeType: "application/json",
        temperature: 0.6,
      });

      if (aiText) {
        try {
          const jsonResult = JSON.parse(aiText);
          if (jsonResult.overallSummary) {
            return res.json(jsonResult);
          }
        } catch (e) {
          console.warn("Could not parse AI JSON output, using heuristic report:", e);
        }
      }

      res.json(heuristicResult);
    } catch (error: any) {
      console.error("Error in /api/ai/analyze-results:", error);
      const fallbackResult = generateHeuristicDiagnostic(req.body?.resultSummary, req.body?.targetPtn, req.body?.targetMajor);
      res.json(fallbackResult);
    }
  });

  // Dynamic Drill Generator by AI
  app.post("/api/ai/generate-drill", async (req, res) => {
    try {
      const { subtest, topic, count = 3, difficulty = "Sedang" } = req.body;
      const ai = getGeminiClient();

      const prompt = `
Buatkan ${count} butir soal latihan format UTBK SNBT asli berkualitas tinggi untuk:
- Subtes: ${subtest}
- Topik: ${topic || "General Topic"}
- Tingkat Kesulitan: ${difficulty} (Mudah / Sedang / Sulit / HOTS)

Format harus JSON valid berupa Array of Question objects:
[
  {
    "id": "drill-${Date.now()}-1",
    "subtestId": "${(subtest || "tps").toLowerCase().replace(/\\s+/g, "_")}",
    "subtestName": "${subtest || "TPS UTBK"}",
    "category": "TPS",
    "type": "multiple_choice",
    "stimulus": "Teks bacaan atau wacana pendukung jika diperlukan (opsional)",
    "questionText": "Pertanyaan yang jelas dan menantang sesuai standar SNBT...",
    "options": [
      {"id": "A", "label": "A", "text": "Pilihan A"},
      {"id": "B", "label": "B", "text": "Pilihan B"},
      {"id": "C", "label": "C", "text": "Pilihan C"},
      {"id": "D", "label": "D", "text": "Pilihan D"},
      {"id": "E", "label": "E", "text": "Pilihan E"}
    ],
    "correctAnswer": "A",
    "explanation": {
      "summary": "Ringkasan kunci jawaban dan alasan",
      "steps": ["Langkah 1: Analisis...", "Langkah 2: Perhitungan/Penyimpulan..."],
      "concept": "Konsep dasar materi",
      "fastTrick": "Trik cepat pengerjaan"
    },
    "difficulty": "${difficulty}",
    "irtWeight": 85,
    "topic": "${topic || subtest}"
  }
]
`;

      const aiText = await generateContentSafe(ai, prompt, {
        responseMimeType: "application/json",
        temperature: 0.7,
      });

      if (aiText) {
        try {
          const questions = JSON.parse(aiText);
          if (Array.isArray(questions) && questions.length > 0) {
            return res.json({ questions });
          }
        } catch (e) {
          console.warn("Failed to parse drill questions JSON:", e);
        }
      }

      const mockDrills = Array.from({ length: count }).map((_, i) => ({
        id: `drill-fallback-${Date.now()}-${i + 1}`,
        subtestId: (subtest || "tps").toLowerCase().replace(/\\s+/g, "_"),
        subtestName: subtest || "Kemampuan Penalaran Umum",
        category: "TPS",
        type: "multiple_choice",
        stimulus: `Latihan Pemahaman Topik: ${topic || subtest}. Perhatikan hubungan logis dan argumen yang disajikan.`,
        questionText: `Berdasarkan prinsip materi ${topic || subtest}, manakah kesimpulan yang paling valid di bawah ini?`,
        options: [
          { id: "A", label: "A", text: `Pernyataan A merupakan implikasi logis yang benar secara konsisten.` },
          { id: "B", label: "B", text: `Pernyataan B menyimpang dari asumsi dasar materi.` },
          { id: "C", label: "C", text: `Pernyataan C mengandung kontradiksi pada variabel kedua.` },
          { id: "D", label: "D", text: `Pernyataan D tidak memiliki korelasi dengan kondisi yang diberikan.` },
          { id: "E", label: "E", text: `Pernyataan E mengabaikan batasan nilai parameter.` },
        ],
        correctAnswer: "A",
        explanation: {
          summary: `Kunci jawaban A tepat karena premis mendukung secara logis kesimpulan opsi A.`,
          steps: [
            `Langkah 1: Identifikasi topik latihan (${topic || subtest}).`,
            `Langkah 2: Uji validitas tiap alternatif jawaban.`,
            `Langkah 3: Opsi A terbukti valid dan memenuhi kriteria kebenaran.`,
          ],
          concept: `Logika Penalaran & Konsep Inti ${topic || subtest}`,
          fastTrick: `Cari opsi yang tidak melakukan over-generalisasi dan relevan langsung dengan data.`,
        },
        difficulty: difficulty || "Sedang",
        irtWeight: difficulty === "HOTS" ? 90 : 80,
        topic: topic || subtest,
      }));

      res.json({ questions: mockDrills });
    } catch (error: any) {
      console.error("Error in /api/ai/generate-drill:", error);
      res.json({ questions: [] });
    }
  });

  // Dynamic SMA Subject Question Generator by AI
  app.post("/api/ai/generate-sma-questions", async (req, res) => {
    try {
      const {
        subject = "Fisika",
        grade = "11",
        major = "MIPA",
        chapter = "Dinamika Gerak",
        examType = "Sumatif Tengah Semester (STS / PTS)",
        difficulty = "Sedang",
        count = 3,
        questionFormat = "multiple_choice",
        mediaType = "text_only",
        minWordCount = 0,
        aiEngine = "gemini",
      } = req.body;

      const ai = getGeminiClient();

      const formatLabels: Record<string, string> = {
        multiple_choice: "Pilihan Ganda (1 Jawaban Benar)",
        multi_select_choice: "Pilihan Ganda Banyak Jawaban (Bisa Memilih Lebih dari 1 Opsi)",
        complex_multiple_choice: "Pilihan Ganda Kompleks (Tabel Pernyataan Benar/Salah)",
        short_numeric: "Isian Singkat (Angka Pasti / Kata Singkat)",
        long_essay: minWordCount && Number(minWordCount) > 0 
          ? `Isian Panjang / Soal Uraian (Batasan Minimal ${minWordCount} Kata)`
          : "Isian Panjang / Soal Uraian Komprehensif",
        cause_reason: "Sebab Akibat (Pernyataan (1) dan Alasan (2))",
      };

      const mediaLabels: Record<string, string> = {
        text_only: "Cukup Teks Saja (Tanpa Media Khusus)",
        with_image: "Ada Gambarnya / Ilustrasi Visual",
        with_audio: "Ada Audio / Listening Soal",
        with_chart_curve: "Ada Kurva dan Grafik / Diagram Data",
      };

      const fallbackQuestions = generateSmartQuestionsFallback({
        subject,
        grade,
        major,
        chapter,
        examType,
        difficulty,
        count,
        questionFormat,
        mediaType,
        minWordCount: Number(minWordCount) || 0,
        aiEngine,
      });

      let jsonFormatTemplate = "";
      if (questionFormat === "complex_multiple_choice") {
        jsonFormatTemplate = `[
  {
    "id": "sma-${Date.now()}-1",
    "subtestId": "sma_${subject.toLowerCase().replace(/[^a-z0-9]/g, "_")}",
    "subtestName": "${subject} SMA",
    "category": "${major === "MIPA" ? "SMA_MIPA" : major === "IPS" ? "SMA_IPS" : "SMA_UMUM"}",
    "grade": "${grade}",
    "major": "${major}",
    "subject": "${subject}",
    "chapter": "${chapter}",
    "examType": "${examType}",
    "type": "complex_multiple_choice",
    "stimulusTitle": "Judul Konteks",
    "stimulus": "Teks wacana / data ilmiah / stimulus...",
    "stimulusImage": ${mediaType === "with_image" ? '"https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=600&q=80"' : 'null'},
    "stimulusAudio": ${mediaType === "with_audio" ? '"https://actions.google.com/sounds/v1/science/morse_code.ogg"' : 'null'},
    "questionText": "Berdasarkan wacana di atas, tentukan apakah masing-masing pernyataan berikut bernilai BENAR atau SALAH!",
    "complexStatements": [
      {"id": "stmt1", "text": "Pernyataan analisis 1...", "correctAnswer": true},
      {"id": "stmt2", "text": "Pernyataan analisis 2...", "correctAnswer": false},
      {"id": "stmt3", "text": "Pernyataan analisis 3...", "correctAnswer": true}
    ],
    "correctAnswer": {"stmt1": true, "stmt2": false, "stmt3": true},
    "explanation": {
      "summary": "Uraian ringkas validasi setiap pernyataan ilmiah...",
      "steps": ["Pernyataan 1: Terbukti BENAR karena...", "Pernyataan 2: SALAH karena...", "Pernyataan 3: BENAR karena..."],
      "concept": "Konsep Inti ${subject}",
      "fastTrick": "Trik cepat uji pernyataan"
    },
    "difficulty": "${difficulty}",
    "irtWeight": 90,
    "topic": "${chapter}",
    "isUserCreated": true,
    "createdAt": "${new Date().toISOString()}"
  }
]`;
      } else if (questionFormat === "short_numeric") {
        jsonFormatTemplate = `[
  {
    "id": "sma-${Date.now()}-1",
    "subtestId": "sma_${subject.toLowerCase().replace(/[^a-z0-9]/g, "_")}",
    "subtestName": "${subject} SMA",
    "category": "${major === "MIPA" ? "SMA_MIPA" : major === "IPS" ? "SMA_IPS" : "SMA_UMUM"}",
    "grade": "${grade}",
    "major": "${major}",
    "subject": "${subject}",
    "chapter": "${chapter}",
    "examType": "${examType}",
    "type": "short_numeric",
    "stimulusTitle": "Judul Konteks",
    "stimulus": "Teks pengantar atau konteks permasalahan...",
    "stimulusImage": ${mediaType === "with_image" ? '"https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=600&q=80"' : 'null'},
    "stimulusAudio": ${mediaType === "with_audio" ? '"https://actions.google.com/sounds/v1/science/morse_code.ogg"' : 'null'},
    "questionText": "Berdasarkan data di atas, hitunglah nilai... (Tuliskan jawaban akhir dalam bentuk angka pasti atau kata singkat)",
    "correctAnswer": "42",
    "explanation": {
      "summary": "Hasil perhitungan numerik diperoleh nilai pasti 42.",
      "steps": ["Langkah 1: Identifikasi besaran dari stimulus...", "Langkah 2: Substitusi ke formula dasar...", "Langkah 3: Diperoleh hasil akhir 42."],
      "concept": "Konsep Inti ${subject}",
      "fastTrick": "Trik cepat perhitungan"
    },
    "difficulty": "${difficulty}",
    "irtWeight": 85,
    "topic": "${chapter}",
    "isUserCreated": true,
    "createdAt": "${new Date().toISOString()}"
  }
]`;
      } else if (questionFormat === "long_essay") {
        const targetWords = Number(minWordCount) > 0 ? Number(minWordCount) : 50;
        jsonFormatTemplate = `[
  {
    "id": "sma-${Date.now()}-1",
    "subtestId": "sma_${subject.toLowerCase().replace(/[^a-z0-9]/g, "_")}",
    "subtestName": "${subject} SMA",
    "category": "${major === "MIPA" ? "SMA_MIPA" : major === "IPS" ? "SMA_IPS" : "SMA_UMUM"}",
    "grade": "${grade}",
    "major": "${major}",
    "subject": "${subject}",
    "chapter": "${chapter}",
    "examType": "${examType}",
    "type": "long_essay",
    "minWordCount": ${targetWords},
    "stimulusTitle": "Wacana Analisis Komprehensif",
    "stimulus": "Teks wacana atau studi kasus kontekstual materi...",
    "stimulusImage": ${mediaType === "with_image" ? '"https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=600&q=80"' : 'null'},
    "stimulusAudio": ${mediaType === "with_audio" ? '"https://actions.google.com/sounds/v1/science/morse_code.ogg"' : 'null'},
    "questionText": "Jelaskan dan analisislah secara mendalam materi ${chapter} dalam konteks ${subject}! Uraikan prinsip ilmiah, mekanisme keterkaitan antar variabel, serta contoh implementasi konkretnya. (Ketentuan: Tuliskan penjelasan analitis secara runtut dengan minimal ${targetWords} kata).",
    "correctAnswer": "Model jawaban uraian komprehensif yang memuat: (1) Definisi dan konsep dasar secara presisi, (2) Mekanisme atau pembuktian analisis ilmiah secara runtut, (3) Contoh konkret atau solusi aplikatif, dan (4) Kesimpulan argumentatif yang logis.",
    "explanation": {
      "summary": "Rubrik penilaian esai panjang mencakup ketepatan konsep ilmiah, keruntutan analisis, contoh aplikatif, dan pemenuhan batas minimal ${targetWords} kata.",
      "steps": [
        "Aspek 1 (Konseptual): Ketepatan definisi dan landasan hukum/teori ilmiah.",
        "Aspek 2 (Analisis & Pembuktian): Keruntutan logika pembuktian atau analisis fenomena.",
        "Aspek 3 (Aplikasi & Solusi): Kualitas contoh kontekstual atau pemecahan masalah nyata.",
        "Aspek 4 (Kerapian & Kuantitas): Struktur kalimat ilmiah yang efektif dan pemenuhan batasan kata minimal ${targetWords} kata."
      ],
      "concept": "Konsep Inti ${subject}",
      "fastTrick": "Gunakan kerangka PES (Poin Teori, Eksplanasi, Sintesis Solusi) untuk uraian terstruktur"
    },
    "difficulty": "${difficulty}",
    "irtWeight": 95,
    "topic": "${chapter}",
    "isUserCreated": true,
    "createdAt": "${new Date().toISOString()}"
  }
]`;
      } else if (questionFormat === "cause_reason") {
        jsonFormatTemplate = `[
  {
    "id": "sma-${Date.now()}-1",
    "subtestId": "sma_${subject.toLowerCase().replace(/[^a-z0-9]/g, "_")}",
    "subtestName": "${subject} SMA",
    "category": "${major === "MIPA" ? "SMA_MIPA" : major === "IPS" ? "SMA_IPS" : "SMA_UMUM"}",
    "grade": "${grade}",
    "major": "${major}",
    "subject": "${subject}",
    "chapter": "${chapter}",
    "examType": "${examType}",
    "type": "cause_reason",
    "stimulusTitle": "Judul Konteks",
    "stimulus": "Teks wacana pendukung...",
    "stimulusImage": ${mediaType === "with_image" ? '"https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=600&q=80"' : 'null'},
    "stimulusAudio": ${mediaType === "with_audio" ? '"https://actions.google.com/sounds/v1/science/morse_code.ogg"' : 'null'},
    "questionText": "Petunjuk Soal Sebab-Akibat (UTBK):\\\\n\\\\nPERNYATAAN:\\\\n[Kalimat pernyataan materi...]\\\\n\\\\nSEBAB\\\\n\\\\nALASAN:\\\\n[Kalimat alasan/penjelasan...]",
    "options": [
      {"id": "A", "label": "A", "text": "Pernyataan BENAR, Alasan BENAR, dan keduanya menunjukkan hubungan sebab akibat."},
      {"id": "B", "label": "B", "text": "Pernyataan BENAR, Alasan BENAR, tetapi keduanya TIDAK menunjukkan hubungan sebab akibat."},
      {"id": "C", "label": "C", "text": "Pernyataan BENAR dan Alasan SALAH."},
      {"id": "D", "label": "D", "text": "Pernyataan SALAH dan Alasan BENAR."},
      {"id": "E", "label": "E", "text": "Pernyataan dan Alasan keduanya SALAH."}
    ],
    "correctAnswer": "A",
    "explanation": {
      "summary": "Analisis kebenaran kalimat pernyataan dan alasan serta hubungan sebab-akibatnya...",
      "steps": ["Langkah 1: Telaah kalimat pernyataan...", "Langkah 2: Telaah kalimat alasan...", "Langkah 3: Uji relasi sebab akibat..."],
      "concept": "Konsep Inti ${subject}",
      "fastTrick": "Hubungkan dengan kata 'karena' untuk menguji kausalitas"
    },
    "difficulty": "${difficulty}",
    "irtWeight": 90,
    "topic": "${chapter}",
    "isUserCreated": true,
    "createdAt": "${new Date().toISOString()}"
  }
]`;
      } else if (questionFormat === "multi_select_choice") {
        jsonFormatTemplate = `[
  {
    "id": "sma-${Date.now()}-1",
    "subtestId": "sma_${subject.toLowerCase().replace(/[^a-z0-9]/g, "_")}",
    "subtestName": "${subject} SMA",
    "category": "${major === "MIPA" ? "SMA_MIPA" : major === "IPS" ? "SMA_IPS" : "SMA_UMUM"}",
    "grade": "${grade}",
    "major": "${major}",
    "subject": "${subject}",
    "chapter": "${chapter}",
    "examType": "${examType}",
    "type": "multi_select_choice",
    "stimulusTitle": "Judul Konteks",
    "stimulus": "Teks wacana pengantar...",
    "stimulusImage": ${mediaType === "with_image" ? '"https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=600&q=80"' : 'null'},
    "stimulusAudio": ${mediaType === "with_audio" ? '"https://actions.google.com/sounds/v1/science/morse_code.ogg"' : 'null'},
    "questionText": "Berdasarkan kajian materi di atas, manakah pernyataan berikut yang BENAR? (Pilihlah lebih dari satu jawaban yang sesuai)",
    "options": [
      {"id": "A", "label": "A", "text": "Pilihan A..."},
      {"id": "B", "label": "B", "text": "Pilihan B..."},
      {"id": "C", "label": "C", "text": "Pilihan C..."},
      {"id": "D", "label": "D", "text": "Pilihan D..."},
      {"id": "E", "label": "E", "text": "Pilihan E..."}
    ],
    "correctAnswer": ["A", "C"],
    "explanation": {
      "summary": "Pilihan yang benar adalah opsi A dan C karena memenuhi hukum...",
      "steps": ["Langkah 1: Uji opsi A...", "Langkah 2: Uji opsi B...", "Langkah 3: Kesimpulan..."],
      "concept": "Konsep Inti ${subject}",
      "fastTrick": "Uji tiap pilihan secara mandiri"
    },
    "difficulty": "${difficulty}",
    "irtWeight": 90,
    "topic": "${chapter}",
    "isUserCreated": true,
    "createdAt": "${new Date().toISOString()}"
  }
]`;
      } else {
        jsonFormatTemplate = `[
  {
    "id": "sma-${Date.now()}-1",
    "subtestId": "sma_${subject.toLowerCase().replace(/[^a-z0-9]/g, "_")}",
    "subtestName": "${subject} SMA",
    "category": "${major === "MIPA" ? "SMA_MIPA" : major === "IPS" ? "SMA_IPS" : "SMA_UMUM"}",
    "grade": "${grade}",
    "major": "${major}",
    "subject": "${subject}",
    "chapter": "${chapter}",
    "examType": "${examType}",
    "type": "multiple_choice",
    "stimulusTitle": "Judul Konteks",
    "stimulus": "Teks wacana pengantar...",
    "stimulusImage": ${mediaType === "with_image" ? '"https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=600&q=80"' : 'null'},
    "stimulusAudio": ${mediaType === "with_audio" ? '"https://actions.google.com/sounds/v1/science/morse_code.ogg"' : 'null'},
    "questionText": "Kalimat pertanyaan yang jelas dan menguji penalaran...",
    "options": [
      {"id": "A", "label": "A", "text": "Pilihan A..."},
      {"id": "B", "label": "B", "text": "Pilihan B..."},
      {"id": "C", "label": "C", "text": "Pilihan C..."},
      {"id": "D", "label": "D", "text": "Pilihan D..."},
      {"id": "E", "label": "E", "text": "Pilihan E..."}
    ],
    "correctAnswer": "A",
    "explanation": {
      "summary": "Penjelasan ilmiah kunci jawaban...",
      "steps": ["Langkah 1: Identifikasi...", "Langkah 2: Evaluasi opsi...", "Langkah 3: Kesimpulan..."],
      "concept": "Konsep Inti ${subject}",
      "fastTrick": "Trik cepat pengerjaan"
    },
    "difficulty": "${difficulty}",
    "irtWeight": 85,
    "topic": "${chapter}",
    "isUserCreated": true,
    "createdAt": "${new Date().toISOString()}"
  }
]`;
      }

      const prompt = `
Anda adalah Pakar Pembuat Soal Ujian Nasional & Guru Berpengalaman Tingkat SMA di Indonesia.
Buatkan ${count} butir soal ujian berkualitas tinggi sesuai standar Kurikulum Merdeka & Kurikulum 2013:
- Mata Pelajaran: ${subject}
- Tingkat Kelas: Kelas ${grade} SMA
- Jurusan / Peminatan: ${major}
- Bab / Topik: ${chapter || "Umum"}
- Tipe Ujian: ${examType}
- Bentuk Soal (Question Format): ${questionFormat} (${formatLabels[questionFormat] || questionFormat})
- Media / Stimulus Soal: ${mediaType} (${mediaLabels[mediaType] || mediaType})
- Tingkat Kesulitan: ${difficulty} (Mudah / Sedang / Sulit / HOTS)

Ketentuan Khusus sesuai Bentuk Soal:
1. Jika "multiple_choice" -> "options" berisi A, B, C, D, E. "correctAnswer" adalah string huruf e.g. "A".
2. Jika "multi_select_choice" -> "options" berisi A, B, C, D, E. "correctAnswer" adalah Array of string huruf pilihan benar e.g. ["A", "C", "D"].
3. Jika "complex_multiple_choice" -> "complexStatements" berisi array minimal 3 pernyataan: [{"id":"stmt1","text":"Pernyataan 1...","correctAnswer":true/false}, ...]. "correctAnswer" adalah object Record e.g. {"stmt1": true, "stmt2": false, "stmt3": true}.
4. Jika "short_numeric" -> Pertanyaan menuntut jawaban angka pasti atau istilah kata singkat tanpa opsi pilihan. "correctAnswer" adalah angka atau kata ringkas e.g. "42" atau "Mitokondria".
5. Jika "long_essay" -> Soal merupakan Isian Panjang / Uraian Esai Komprehensif (minimal ${Number(minWordCount) || 50} kata). Siswa diminta menguraikan penjelasan analitis mendalam, argumen ilmiah, atau pemecahan kasus secara komprehensif. Pada stimulus atau pertanyaan wajib cantumkan petunjuk: "(Ketentuan: Tuliskan jawaban penjelasan secara mendalam dengan minimal ${Number(minWordCount) || 50} kata)". Sediakan "correctAnswer" berupa model jawaban guru yang lengkap dan berkualitas tinggi, dan "explanation.steps" berupa 4 aspek rubrik penilaian esai (konseptual, analisis, aplikasi/konteks, kerapian bahasa). Sertakan "minWordCount": ${Number(minWordCount) || 50} pada setiap objek butir soal.
6. Jika "cause_reason" -> Format teks soal memiliki PERNYATAAN (1) dan SEBAB ALASAN (2). Opsi A: Pernyataan Benar, Alasan Benar berhubungan sebab akibat; B: Pernyataan Benar, Alasan Benar tidak berhubungan; C: Pernyataan Benar, Alasan Salah; D: Pernyataan Salah, Alasan Benar; E: Keduanya Salah. "correctAnswer" adalah "A" / "B" / "C" / "D" / "E".

Ketentuan Khusus Media / Stimulus:
- Jika "with_chart_curve": Sertakan narasi kurva, pembacaan titik koordinat grafik, atau tabel data yang jelas pada "stimulus".
- Jika "with_audio": Buatkan wacana teks naskah audio listening pada "stimulus" dan tandai "stimulusAudio": "https://actions.google.com/sounds/v1/science/morse_code.ogg".
- Jika "with_image": Berikan deskripsi gambar/diagram pada stimulus dan tandai "stimulusImage": "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=600&q=80".
- Jika "text_only": Cukup teks stimulus dan pertanyaan tanpa url media.

Ketentuan format output:
Format JSON murni berupa Array of Question objects (${count} butir soal).
Wajib ikuti persis struktur format berikut untuk jenis soal "${questionFormat}":
${jsonFormatTemplate}

PENTING:
- Hasilkan ${count} butir soal yang BERVARIASI, BERBEDA satu sama lain, tidak monoton, dan TIDAK MENGULANG kalimat soal yang sama.
- Seluruh isi stimulus, pertanyaan, opsi jawaban, dan pembahasan HARUS secara spesifik dan mendalam membahas materi "${chapter}" untuk mata pelajaran "${subject}" Kelas ${grade} (${major}).
- Pastikan semua kunci jawaban 100% akurat secara akademis, tidak ada kesalahan logika, dan pembahasannya mendidik.
- JANGAN sertakan markdown formatting selain JSON (atau cukup bungkus dalam array JSON).
`;

      const { text: aiText, usedEngine } = await generateUnifiedAIContentSafe(ai, prompt, {
        aiEngine,
        bypassCache: true,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      if (aiText) {
        try {
          const cleanJson = aiText.replace(/^```(?:json)?\\s*/i, "").replace(/\\s*```$/i, "").trim();
          const questions = JSON.parse(cleanJson);
          if (Array.isArray(questions) && questions.length > 0) {
            const formatted = questions.map((q: any, idx: number) => {
              const targetType = questionFormat || q.type || "multiple_choice";
              const questionObj: any = {
                ...q,
                id: q.id || `sma-ai-${Date.now()}-${idx + 1}`,
                subtestId: q.subtestId || `sma_${subject.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
                subtestName: q.subtestName || `${subject} SMA`,
                category: q.category || (major === "MIPA" ? "SMA_MIPA" : major === "IPS" ? "SMA_IPS" : "SMA_UMUM"),
                grade: q.grade || grade,
                major: q.major || major,
                subject: q.subject || subject,
                chapter: q.chapter || chapter,
                examType: q.examType || examType,
                type: targetType,
                topic: q.topic || chapter,
                difficulty: q.difficulty || difficulty,
                irtWeight: q.irtWeight || (difficulty === "HOTS" ? 95 : 85),
                isUserCreated: true,
                createdAt: q.createdAt || new Date().toISOString(),
                aiEngine: usedEngine !== "fallback" ? usedEngine : (aiEngine as any),
              };

              if (Number(minWordCount) > 0) {
                questionObj.minWordCount = Number(minWordCount);
              }

              if (mediaType === "with_image" && !questionObj.stimulusImage) {
                questionObj.stimulusImage = "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=600&q=80";
              }
              if (mediaType === "with_audio" && !questionObj.stimulusAudio) {
                questionObj.stimulusAudio = "https://actions.google.com/sounds/v1/science/morse_code.ogg";
              }

              if (targetType === "complex_multiple_choice") {
                if (!Array.isArray(questionObj.complexStatements) || questionObj.complexStatements.length === 0) {
                  questionObj.complexStatements = [
                    { id: "stmt1", text: `Pernyataan 1 terkait konsep ${chapter} bernilai valid sesuai hukum yang berlaku.`, correctAnswer: true },
                    { id: "stmt2", text: `Pernyataan 2 mengabaikan pengaruh parameter eksternal sistem.`, correctAnswer: false },
                    { id: "stmt3", text: `Pernyataan 3 terkonfirmasi melalui observasi eksperimental.`, correctAnswer: true },
                  ];
                  questionObj.correctAnswer = { stmt1: true, stmt2: false, stmt3: true };
                }
              } else if (targetType === "multiple_choice" || targetType === "multi_select_choice" || targetType === "cause_reason") {
                if (!Array.isArray(questionObj.options) || questionObj.options.length === 0) {
                  questionObj.options = [
                    { id: "A", label: "A", text: `Pilihan A selaras dengan kaidah konsep ${chapter}.` },
                    { id: "B", label: "B", text: `Pilihan B bertentangan dengan asumsi dasar sistem.` },
                    { id: "C", label: "C", text: `Pilihan C tidak memperhitungkan variabel penting.` },
                    { id: "D", label: "D", text: `Pilihan D menunjukkan korelasi terbalik.` },
                    { id: "E", label: "E", text: `Pilihan E tidak relevan dengan topik bahasan.` },
                  ];
                }
              }

              return questionObj;
            });
            return res.json({ questions: formatted });
          }
        } catch (e) {
          console.warn("Failed to parse SMA questions JSON from AI:", e);
        }
      }

      res.json({ questions: fallbackQuestions });
    } catch (error: any) {
      console.error("Error in /api/ai/generate-sma-questions:", error);
      const fallbackQuestions = generateSmartQuestionsFallback({
        subject: req.body?.subject || "Fisika",
        grade: req.body?.grade || "11",
        major: req.body?.major || "MIPA",
        chapter: req.body?.chapter || "Materi Kurikulum",
        examType: req.body?.examType || "Sumatif Tengah Semester (STS / PTS)",
        difficulty: req.body?.difficulty || "Sedang",
        count: req.body?.count || 3,
        questionFormat: req.body?.questionFormat || "multiple_choice",
        mediaType: req.body?.mediaType || "text_only",
        minWordCount: Number(req.body?.minWordCount) || 0,
        aiEngine: req.body?.aiEngine || "auto",
      });
      res.json({ questions: fallbackQuestions });
    }
  });

  // AI Auto-Complete Explanation Helper
  app.post("/api/ai/complete-explanation", async (req, res) => {
    try {
      const { subject, questionText, options, correctAnswer, stimulus } = req.body;
      const ai = getGeminiClient();

      const fallbackExplanation = {
        summary: `Kunci jawaban yang tepat adalah opsi ${correctAnswer || "A"}. Opsi ini selaras dengan prinsip konsep fundamental materi ${subject || "SMA"}.`,
        steps: [
          "1. Pahami premis utama dan konteks yang disajikan pada soal.",
          `2. Identifikasi opsi yang tepat (${correctAnswer || "A"}) dengan menerapkan konsep kaidah materi terkait.`,
          "3. Periksa kembali kesesuaian unit, kaidah logika, dan definisi konsep.",
        ],
        concept: `Materi Pokok ${subject || "Mata Pelajaran SMA"}`,
        fastTrick: "Fokus pada kata kunci pertanyaan dan gunakan teknik eliminasi opsi yang kontradiktif.",
      };

      const prompt = `
Sebagai Guru Master ${subject || "SMA"} Indonesia, tolong buatkan pembahasan lengkap terstruktur untuk butir soal berikut:

- Wacana/Stimulus: ${stimulus || "Tidak ada"}
- Pertanyaan: ${questionText}
- Pilihan Jawaban: ${JSON.stringify(options || [])}
- Kunci Jawaban Benar: ${JSON.stringify(correctAnswer)}

Hasilkan JSON dengan struktur:
{
  "summary": "Ringkasan penjelasan padat dan jelas mengapa kunci jawaban tersebut benar",
  "steps": [
    "Langkah 1: ...",
    "Langkah 2: ...",
    "Langkah 3: ..."
  ],
  "concept": "Nama rumus atau konsep teori yang diuji",
  "fastTrick": "Trik cepat / cara praktis / logika cerdas untuk menjawab lebih cepat"
}
`;

      const aiText = await generateContentSafe(ai, prompt, {
        responseMimeType: "application/json",
        temperature: 0.6,
      });

      if (aiText) {
        try {
          const parsed = JSON.parse(aiText);
          if (parsed.summary) {
            return res.json({ explanation: parsed });
          }
        } catch (e) {
          console.warn("Failed to parse explanation JSON:", e);
        }
      }

      res.json({ explanation: fallbackExplanation });
    } catch (error: any) {
      console.error("Error in /api/ai/complete-explanation:", error);
      res.json({
        explanation: {
          summary: `Kunci jawaban yang tepat adalah opsi ${req.body?.correctAnswer || "A"}.`,
          steps: ["1. Analisis soal.", "2. Terapkan rumus/konsep.", "3. Simpulkan jawaban."],
          concept: "Konsep Dasar",
          fastTrick: "Eliminasi pilihan salah",
        },
      });
    }
  });

  // AI Question Update & Refresh Analyzer (Review & Propose Updates)
  app.post("/api/ai/update-sma-question", async (req, res) => {
    try {
      const { question, targetDifficulty, updateInstruction, aiEngine = "gemini" } = req.body;
      const ai = getGeminiClient();

      if (!question) {
        return res.status(400).json({ error: "Objek butir soal (question) wajib dikirimkan." });
      }

      const activeDifficulty = targetDifficulty || question.difficulty || "Sedang";
      const subject = question.subject || "Mata Pelajaran SMA";
      const chapter = question.chapter || question.topic || "Materi Kurikulum";

      const prompt = `
Anda adalah Pakar Asesmen Kurikulum Merdeka & Validator Pembuat Soal Ujian Nasional SMA di Indonesia.
Tugas Anda adalah meninjau butir soal yang sudah ada, mengevaluasi apakah butir soal ini membutuhkan pembaruan (pemutakhiran kurikulum, kontekstualisasi AKM, penyempurnaan distraktor/pilihan, kejelasan stimulus, serta pembahasan langkah demi langkah HOTS).

Data Soal Saat Ini:
- ID Soal: ${question.id}
- Mata Pelajaran: ${subject} (Kelas ${question.grade || "11"} SMA, Jurusan ${question.major || "MIPA"})
- Bab / Topik: ${chapter}
- Tipe Bentuk Soal: ${question.type || "multiple_choice"}
- Tingkat Kesulitan Saat Ini: ${question.difficulty || "Sedang"} -> Target: ${activeDifficulty}
- Wacana / Stimulus: ${question.stimulus || "(Belum memiliki stimulus wacana)"}
- Kalimat Pertanyaan: ${question.questionText}
- Opsi Pilihan: ${JSON.stringify(question.options || [])}
- Kunci Jawaban: ${JSON.stringify(question.correctAnswer)}
- Pembahasan Saat Ini: ${JSON.stringify(question.explanation || {})}
${updateInstruction ? `- Instruksi Tambahan Pembaruan: ${updateInstruction}` : ""}

Instruksi Analisis Pembaruan:
1. Evaluasi apakah butir soal ini dapat ditingkatkan/diperbarui:
   - Membuat stimulus lebih kontekstual, menarik, berbasis data nyata/studi kasus Kurikulum Merdeka.
   - Menyempurnakan kalimat pertanyaan agar lugas tanpa ambiguitas.
   - Memastikan opsi distraktor (A, B, C, D, E) seimbang, ilmiah, dan tidak menjebak secara curang.
   - Menyempurnakan pembahasan: ringkasan ilmiah, langkah demi langkah, nama konsep, dan trik cepat penyelesaian.
2. Tuliskan "changelog" berupa array ringkas (2 sampai 4 kalimat singkat) mengenai poin-poin yang diperbarui.
3. Tetapkan "hasUpdates": true (atau false jika soal sudah 100% sempurna tanpa perlu pembaruan).

Hasilkan JSON murni dengan format:
{
  "hasUpdates": true,
  "changelog": [
    "Stimulus wacana disempurnakan dengan konteks studi kasus aktual Kurikulum Merdeka",
    "Opsi pilihan jawaban diperbaiki agar opsi distraktor lebih rasional dan mendidik",
    "Pembahasan dilengkapi uraian langkah penyelesaian ilmiah dan trik cepat"
  ],
  "updatedQuestion": {
    "id": "${question.id}",
    "subtestId": "${question.subtestId || 'sma_' + subject.toLowerCase().replace(/[^a-z0-9]/g, '_')}",
    "subtestName": "${question.subtestName || subject + ' SMA'}",
    "category": "${question.category || 'SMA_UMUM'}",
    "grade": "${question.grade || '11'}",
    "major": "${question.major || 'MIPA'}",
    "subject": "${subject}",
    "chapter": "${chapter}",
    "examType": "${question.examType || 'Sumatif Tengah Semester (STS / PTS)'}",
    "type": "${question.type || 'multiple_choice'}",
    ${question.minWordCount ? `"minWordCount": ${question.minWordCount},` : ""}
    "stimulusTitle": "${question.stimulusTitle || 'Konteks Materi ' + chapter}",
    "stimulus": "Teks stimulus yang disempurnakan...",
    "stimulusImage": ${question.stimulusImage ? JSON.stringify(question.stimulusImage) : "null"},
    "stimulusAudio": ${question.stimulusAudio ? JSON.stringify(question.stimulusAudio) : "null"},
    "questionText": "Teks pertanyaan yang telah diperbaiki...",
    "options": [
      {"id": "A", "label": "A", "text": "Pilihan A..."},
      {"id": "B", "label": "B", "text": "Pilihan B..."},
      {"id": "C", "label": "C", "text": "Pilihan C..."},
      {"id": "D", "label": "D", "text": "Pilihan D..."},
      {"id": "E", "label": "E", "text": "Pilihan E..."}
    ],
    "complexStatements": ${question.complexStatements ? JSON.stringify(question.complexStatements) : "null"},
    "correctAnswer": ${JSON.stringify(question.correctAnswer)},
    "explanation": {
      "summary": "Ringkasan konsep kebenaran jawaban yang diperbarui",
      "steps": ["Langkah 1: Identifikasi...", "Langkah 2: Terapkan rumus/konsep...", "Langkah 3: Kesimpulan..."],
      "concept": "Nama konsep atau rumus materi ${subject}",
      "fastTrick": "Trik cepat penyelesaian"
    },
    "difficulty": "${activeDifficulty}",
    "irtWeight": ${question.irtWeight || (activeDifficulty === 'HOTS' ? 95 : 85)},
    "topic": "${chapter}",
    "isUserCreated": true,
    "updatedAt": "${new Date().toISOString()}"
  }
}
`;

      const { text: aiText, usedEngine } = await generateUnifiedAIContentSafe(ai, prompt, {
        aiEngine,
        config: {
          responseMimeType: "application/json",
          temperature: 0.6,
        },
      });

      if (aiText) {
        try {
          const parsed = JSON.parse(aiText);
          if (parsed && parsed.updatedQuestion) {
            return res.json({
              hasUpdates: parsed.hasUpdates !== false,
              changelog: Array.isArray(parsed.changelog) && parsed.changelog.length > 0
                ? parsed.changelog
                : [
                    "Stimulus wacana dan redaksi pertanyaan diperbarui sesuai standar Kurikulum Merdeka",
                    "Pilihan distraktor disesuaikan agar lebih proporsional",
                    "Pembahasan dilengkapi langkah penyelesaian bertahap",
                  ],
              updatedQuestion: {
                ...question,
                ...parsed.updatedQuestion,
                id: question.id,
                difficulty: activeDifficulty,
                aiEngine: usedEngine !== "fallback" ? usedEngine : aiEngine,
                updatedAt: new Date().toISOString(),
              },
            });
          }
        } catch (e) {
          console.warn("Failed to parse update question JSON from AI:", e);
        }
      }

      const fallbackUpdatedQuestion = {
        ...question,
        difficulty: activeDifficulty,
        stimulus: question.stimulus || `Wacana Materi ${subject} (Kelas ${question.grade || "11"}): Konsep dan prinsip penting pada pembahasan ${chapter}.`,
        explanation: {
          summary: question.explanation?.summary || `Kunci jawaban ${typeof question.correctAnswer === "object" ? JSON.stringify(question.correctAnswer) : question.correctAnswer} memenuhi prinsip ilmiah materi ${chapter}.`,
          steps: question.explanation?.steps && question.explanation.steps.length > 0
            ? question.explanation.steps
            : [
                `Langkah 1: Identifikasi variabel pokok pada materi ${chapter}.`,
                `Langkah 2: Uji keselarasan premis dengan kaidah materi ${subject}.`,
                `Langkah 3: Simpulkan pilihan yang paling akurat.`,
              ],
          concept: question.explanation?.concept || `Konsep ${subject}: ${chapter}`,
          fastTrick: question.explanation?.fastTrick || `Fokus pada kata kunci pertanyaan dan gunakan metode eliminasi opsi yang tidak relevan.`,
        },
        updatedAt: new Date().toISOString(),
      };

      res.json({
        hasUpdates: true,
        changelog: [
          `Penyempurnaan stimulus wacana untuk topik ${chapter}`,
          `Penyempurnaan opsi pilihan jawaban dan distraktor`,
          `Penyempurnaan struktur langkah pembahasan dan trik cepat`,
        ],
        updatedQuestion: fallbackUpdatedQuestion,
      });
    } catch (error: any) {
      console.error("Error in /api/ai/update-sma-question:", error);
      res.status(500).json({ error: "Gagal memproses pembaruan soal dengan AI." });
    }
  });

  // Vite integration in development, static files in production
  if (!isProduction && process.env.CLOUDFLARE_WORKERS !== "1") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.CLOUDFLARE_WORKERS !== "1") {
    // Node/VM production: serve the Vite build directly from the local filesystem.
    const distPath = fs.existsSync(path.join(process.cwd(), "dist", "index.html"))
      ? path.join(process.cwd(), "dist")
      : fs.existsSync(path.join(safeDirname, "index.html"))
      ? safeDirname
      : path.resolve(process.cwd(), "dist");

    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send("<!DOCTYPE html><html><head><title>UTBK CBT App</title></head><body><div id=\"root\"></div></body></html>");
      }
    });
  }
  // On Cloudflare Workers, static assets are served by Wrangler's assets binding.
  // Only /api/* is routed to this Express application.

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`UTBK CBT Online Exam Server running on port ${PORT} (production: ${isProduction})`);
  });
}

startServer();
