import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const aiRate = new Map();

function aiRateGuard(ip) {
  const now = Date.now();
  const record = aiRate.get(ip) || { count: 0, start: now };
  if (now - record.start > 60000) {
    record.count = 0;
    record.start = now;
  }
  record.count += 1;
  aiRate.set(ip, record);
  if (record.count > 30) {
    const error = new Error("Too many AI requests, slow down.");
    error.statusCode = 429;
    throw error;
  }
}

async function callGemini(question, mode, history = []) {
  if (!GEMINI_API_KEY) {
    const err = new Error("Gemini API key not configured");
    err.statusCode = 503;
    throw err;
  }

  const prefixMap = {
    answer: "You are a concise STEM tutor. Provide a direct answer first, then a short explanation.",
    explain: "You are a patient STEM instructor. Explain the concept step-by-step with a simple analogy.",
    practice:
      "You are a STEM coach. Provide the solution then 2 follow-up practice questions (hide answers after a label like Answer: ).",
  };
  const system = prefixMap[mode] || prefixMap.answer;
  const prompt = `${system}\n\nStudent question: ${question}`;

  const contents = [
    ...history
      .slice(-8)
      .map((entry) => ({
        role: entry.role === "user" ? "user" : "model",
        parts: [{ text: String(entry.content || "").slice(0, 4000) }],
      })),
    { role: "user", parts: [{ text: String(prompt).slice(0, 8000) }] },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 512,
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    const err = new Error(`Gemini error ${response.status}: ${text.slice(0, 200)}`);
    err.statusCode = 502;
    throw err;
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No answer generated.";
}

export async function POST(request) {
  try {
    const { question, mode = "answer", history = [] } = await request.json();
    const trimmed = question?.trim();

    if (!trimmed) {
      return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
    }
    if (trimmed.length < 3) {
      return NextResponse.json(
        { error: "Add a little more detail so I can help (min 3 characters)." },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    aiRateGuard(ip);

    console.log(
      `[AI] mode=${mode} len=${trimmed.length} sample="${trimmed
        .slice(0, 40)
        .replace(/\n/g, " ")}"`
    );

    const answer = await callGemini(trimmed, mode, Array.isArray(history) ? history : []);
    return NextResponse.json({ answer, mode });
  } catch (error) {
    console.error("AI error", error);
    if (error.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (/Gemini error/i.test(error.message || "")) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ error: error.message || "Unknown AI error" }, { status: 500 });
  }
}
