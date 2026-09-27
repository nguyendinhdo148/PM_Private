import Groq from "groq-sdk";
import { ANALYST_SYSTEM_PROMPT } from "../prompts/analyst.prompt.js";

const resolveGroqApiKey = () => {
  const key = process.env.GROQ_API_KEY || process.env.GROQ_CLOUD_API_KEY || process.env.GroqCloud_API_KEY;
  return key && key.trim() ? key.trim() : undefined;
};

const groqApiKey = resolveGroqApiKey();
const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

// ============================================================
// CONFIG — TĂNG MAX_TOKENS
// ============================================================
const PRIMARY_MODEL = "openai/gpt-oss-120b";
const FALLBACK_MODEL = "openai/gpt-oss-20b";
const MAX_TOKENS = 4000;
const TEMPERATURE = 0.3;

// ============================================================
// HELPERS
// ============================================================
function compressContext(context) {
  if (!context || typeof context !== "object") return context;
  const compact = { ...context };

  if (Array.isArray(compact.topDays)) compact.topDays = compact.topDays.slice(0, 3);
  if (Array.isArray(compact.worstDays)) compact.worstDays = compact.worstDays.slice(0, 3);
  if (Array.isArray(compact.byDayOfWeek)) compact.byDayOfWeek = compact.byDayOfWeek.slice(0, 7);
  if (Array.isArray(compact.weekly)) compact.weekly = compact.weekly.slice(0, 6);
  if (Array.isArray(compact.months)) compact.months = compact.months.slice(0, 12);

  // Rút gọn allMonths: chỉ giữ field cần thiết
  if (Array.isArray(compact.allMonths)) {
    compact.allMonths = compact.allMonths.slice(0, 24).map((m) => ({
      monthKey: m.monthKey,
      title: m.title,
      daysCount: m.daysCount,
      totalGross: m.totalGross,
      preTax: m.preTax,
      guest: m.guest,
      bill: m.bill,
      avgPerGuest: m.avgPerGuest,
      avgPerBill: m.avgPerBill,
      food: m.food,
      drink: m.drink,
      other: m.other,
      totalExpense: m.totalExpense,
      profitAfterFixed: m.profitAfterFixed,
      profitMargin: m.profitMargin,
    }));
  }

  Object.keys(compact).forEach((k) => {
    if (compact[k] === undefined || compact[k] === null) delete compact[k];
  });

  return compact;
}

async function callGroq(model, { question, context, history = [] }) {
  if (!groq) {
    const err = new Error("Groq API key chưa được cấu hình. Thiết lập GROQ_API_KEY hoặc GroqCloud_API_KEY.");
    err.code = "AI_AUTH";
    throw err;
  }

  const compacted = compressContext(context);

  const messages = [
    { role: "system", content: ANALYST_SYSTEM_PROMPT },
    ...history.slice(-6),
    {
      role: "user",
      content:
        `CONTEXT (JSON):\n${JSON.stringify(compacted)}\n\n` +
        `CÂU HỎI: ${question}`,
    },
  ];

  const completion = await groq.chat.completions.create({
    model,
    messages,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    top_p: 0.9,
    stream: false,
    reasoning_effort: "low",
  });

  const choice = completion.choices?.[0];
  const msg = choice?.message || {};
  const answer = (msg.content || "").trim();
  const finishReason = choice?.finish_reason;

  if (finishReason === "length") {
    console.warn(`[Groq] ⚠️ Câu trả lời bị cắt vì hết token (max_tokens=${MAX_TOKENS}).`);
  }

  if (!answer) {
    console.warn("[Groq] content rỗng. Full message:", JSON.stringify(msg).slice(0, 500));
    const err = new Error("Groq trả về nội dung rỗng. Thử tăng max_tokens hoặc dùng model khác.");
    err.code = "EMPTY_RESPONSE";
    throw err;
  }

  return {
    answer,
    model,
    finishReason,
    usage: completion.usage
      ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        }
      : undefined,
  };
}

async function askAnalyst(params) {
  try {
    console.log(`[Groq] Calling ${PRIMARY_MODEL}…`);
    return await callGroq(PRIMARY_MODEL, params);
  } catch (err) {
    const status = err?.status || err?.response?.status;
    const msg = err?.message || "";

    const isRetryable =
      status === 429 || status === 503 || status === 500 ||
      status === 502 || status === 504;

    const isModelNotFound =
      status === 404 || /model_not_found|does not exist/i.test(msg);

    const isEmptyResponse = err?.code === "EMPTY_RESPONSE";

    if ((isRetryable || isModelNotFound || isEmptyResponse) && PRIMARY_MODEL !== FALLBACK_MODEL) {
      console.warn(
        `[Groq] Primary "${PRIMARY_MODEL}" failed (${status || err?.code}). Fallback → "${FALLBACK_MODEL}"`
      );
      return await callGroq(FALLBACK_MODEL, params);
    }
    throw err;
  }
}

// ============================================================
// CONTROLLER
// ============================================================
export async function askAnalystController(req, res) {
  const start = Date.now();

  try {
    const { question, context, history } = req.body || {};

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Thiếu câu hỏi (question).",
      });
    }

    if (question.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Câu hỏi quá dài (tối đa 1000 ký tự).",
      });
    }

    if (!context || typeof context !== "object") {
      return res.status(400).json({
        success: false,
        message: "Thiếu context dữ liệu báo cáo.",
      });
    }

    const result = await askAnalyst({
      question: question.trim(),
      context,
      history: Array.isArray(history) ? history : [],
    });

    const elapsed = Date.now() - start;
    console.log(
      `[AI] ✅ ${result.model} · ${result.usage?.totalTokens ?? "?"} tokens · ${elapsed}ms · finish=${result.finishReason || "stop"}`
    );

    return res.json({
      success: true,
      data: {
        answer: result.answer,
        model: result.model,
        usage: result.usage,
        elapsedMs: elapsed,
        finishReason: result.finishReason,
      },
    });
  } catch (err) {
    const status = err?.status || err?.response?.status || 500;
    const message =
      err?.error?.message || err?.message || "Lỗi không xác định khi gọi AI";

    console.error("[AI] ❌ Error:", { status, message, code: err?.code });

    if (status === 429) {
      return res.status(429).json({
        success: false,
        message: "AI đang quá tải (rate limit). Vui lòng thử lại sau vài giây.",
        code: "RATE_LIMIT",
      });
    }

    if (status === 401 || status === 403 || err?.code === "AI_AUTH") {
      return res.status(500).json({
        success: false,
        message: "Cấu hình AI không hợp lệ. Kiểm tra API key ở server.",
        code: "AI_AUTH",
      });
    }

    if (err?.code === "EMPTY_RESPONSE") {
      return res.status(502).json({
        success: false,
        message: "AI trả về nội dung rỗng. Vui lòng thử lại hoặc đặt câu hỏi khác.",
        code: "EMPTY_RESPONSE",
      });
    }

    if (status === 400 && message.toLowerCase().includes("token")) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu gửi lên AI quá lớn. Vui lòng hỏi câu ngắn hơn.",
        code: "TOKEN_LIMIT",
      });
    }

    return res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      message,
      code: err?.code || "AI_UNKNOWN",
    });
  }
}