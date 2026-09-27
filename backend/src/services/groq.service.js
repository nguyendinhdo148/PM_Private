import Groq from "groq-sdk";
import { ANALYST_SYSTEM_PROMPT } from "../prompts/analyst.prompt.js";

const resolveGroqApiKey = () => {
  const key = process.env.GROQ_API_KEY || process.env.GROQ_CLOUD_API_KEY || process.env.GroqCloud_API_KEY;
  return key && key.trim() ? key.trim() : undefined;
};

const groqApiKey = resolveGroqApiKey();
const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

const PRIMARY_MODEL = process.env.GROQ_MODEL_PRIMARY || "openai/gpt-oss-120b";
const FALLBACK_MODEL = process.env.GROQ_MODEL_FALLBACK || "openai/gpt-oss-120b";
const MAX_TOKENS = Number(process.env.AI_MAX_TOKENS) || 800;
const TEMPERATURE = Number(process.env.AI_TEMPERATURE) || 0.2;

/**
 * Nén context: nếu context quá lớn sẽ vượt TPM của Groq.
 * Chỉ giữ những gì cần cho phân tích.
 */
function compressContext(context) {
  if (!context || typeof context !== "object") return context;

  const compact = { ...context };

  // Giới hạn topDays / worstDays còn 3 mỗi loại
  if (Array.isArray(compact.topDays)) compact.topDays = compact.topDays.slice(0, 3);
  if (Array.isArray(compact.worstDays)) compact.worstDays = compact.worstDays.slice(0, 3);
  if (Array.isArray(compact.byDayOfWeek)) compact.byDayOfWeek = compact.byDayOfWeek.slice(0, 7);
  if (Array.isArray(compact.weekly)) compact.weekly = compact.weekly.slice(0, 6);

  // Bỏ các trường undefined / null
  Object.keys(compact).forEach((k) => {
    if (compact[k] === undefined || compact[k] === null) delete compact[k];
  });

  return compact;
}

/**
 * Gọi Groq với 1 model cụ thể. Ném lỗi có gắn code để controller phân loại.
 */
async function callGroq(model, params) {
  if (!groq) {
    const err = new Error("Groq API key chưa được cấu hình. Thiết lập GROQ_API_KEY hoặc GroqCloud_API_KEY.");
    err.code = "AI_AUTH";
    throw err;
  }

  const { question, context, history = [] } = params;
  const compacted = compressContext(context);

  const messages = [
    { role: "system", content: ANALYST_SYSTEM_PROMPT },
    ...history.slice(-6), // giữ tối đa 6 lượt gần nhất để tránh phình token
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
  });

  const answer = completion.choices?.[0]?.message?.content?.trim() || "";
  if (!answer) {
    const err = new Error("Groq trả về nội dung rỗng");
    err.code = "EMPTY_RESPONSE";
    throw err;
  }

  return {
    answer,
    model,
    usage: completion.usage
      ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        }
      : undefined,
  };
}

/**
 * Gọi chính. Nếu model primary fail (rate-limit / 5xx) → thử fallback.
 */
export async function askAnalyst(params) {
  try {
    return await callGroq(PRIMARY_MODEL, params);
  } catch (err) {
    const status = err?.status || err?.response?.status;
    const isRetryable =
      status === 429 ||
      status === 503 ||
      status === 500 ||
      status === 502 ||
      status === 504;

    if (isRetryable && PRIMARY_MODEL !== FALLBACK_MODEL) {
      console.warn(
        `[Groq] Primary model ${PRIMARY_MODEL} failed (${status}). Fallback → ${FALLBACK_MODEL}`
      );
      return await callGroq(FALLBACK_MODEL, params);
    }
    throw err;
  }
}