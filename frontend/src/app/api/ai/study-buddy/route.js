import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-2.0-flash").trim();
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const aiRate = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

function withLatestVariant(model) {
  if (!model) return [];
  const normalized = model.trim();
  if (normalized.endsWith("-latest")) return [normalized];
  return [normalized, `${normalized}-latest`];
}

async function callGemini(question, mode, history = []) {
  if (!GEMINI_API_KEY) {
    const err = new Error("Gemini API key not configured");
    err.statusCode = 503;
    throw err;
  }

  const prefixMap = {
    answer:
      "At its core, the role of an AI assistant in an adaptive learning environment is to act as a personalized tutor — guiding, assessing, and supporting each learner based on their unique pace, strengths, and weaknesses. Provide a direct answer first, then a short explanation.",
    explain:
      "At its core, the role of an AI assistant in an adaptive learning environment is to act as a personalized tutor — guiding, assessing, and supporting each learner based on their unique pace, strengths, and weaknesses. Explain the concept step-by-step with a simple analogy.",
    practice:
      "At its core, the role of an AI assistant in an adaptive learning environment is to act as a personalized tutor — guiding, assessing, and supporting each learner based on their unique pace, strengths, and weaknesses. Provide the solution then 2 follow-up practice questions (hide answers after a label like Answer: ).",
    remediation:
      "At its core, the role of an AI assistant in an adaptive learning environment is to act as a personalized tutor — guiding, assessing, and supporting each learner based on their unique pace, strengths, and weaknesses. Recommend ONE high-quality YouTube learning resource. Respond ONLY with compact minified JSON using keys \"searchQuery\", \"titleHint\", and \"summary\". The searchQuery must contain 4-8 focused keywords we can pass to the YouTube Data API. Keep summary under 200 characters. Do not include any URLs, markdown, code fences, or commentary outside the JSON.",
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

  const modelCandidates = Array.from(new Set(withLatestVariant(GEMINI_MODEL))).filter(Boolean);
  let lastErrorText = null;

  for (const model of modelCandidates) {
    let abortOuter = false;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: mode === "remediation" ? 512 : 1024,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates?.[0];
          const parts = candidate?.content?.parts || [];
          const combined = parts
            .map((part) => (typeof part?.text === "string" ? part.text : ""))
            .filter(Boolean)
            .join("\n")
            .trim();

          if (combined) {
            return combined;
          }

          return "No answer generated.";
        }

        const text = await response.text();
        lastErrorText = `Gemini error ${response.status}: ${text.slice(0, 200)}`;

        // Retry with next candidate only when the model is missing/unsupported (404 / 400)
        if (response.status !== 404 && response.status !== 400) {
          abortOuter = true;
          break;
        }
        // stop retry loop if model unsupported, switch to next candidate
        break;
      } catch (networkError) {
        lastErrorText = `Gemini network error: ${networkError.message}`;
        if (attempt === 0) {
          await sleep(300);
          continue;
        }
      }
    }
    if (abortOuter) {
      break;
    }
  }

  const err = new Error(lastErrorText || "Gemini request failed");
  err.statusCode = 502;
  throw err;
}

function coerceTrimmedString(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join(" ");
    return joined.length ? joined : null;
  }
  return null;
}

function extractJsonObject(text) {
  if (!text) return null;
  let working = String(text).trim();

  if (!working.length) return null;

  if (working.startsWith("```")) {
    working = working.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "");
  }

  const firstBrace = working.indexOf("{");
  const lastBrace = working.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const candidate = working.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(candidate);
  } catch (error) {
    try {
      return JSON.parse(candidate.replace(/\n+/g, " "));
    } catch (error2) {
      return null;
    }
  }
}

function truncate(text, maxLength) {
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  const slicePoint = Math.max(0, maxLength - 3);
  return `${cleaned.slice(0, slicePoint)}...`;
}

async function searchYouTubeVideo(searchQuery) {
  if (!YOUTUBE_API_KEY) {
    const err = new Error("YouTube API key not configured");
    err.statusCode = 503;
    throw err;
  }

  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    part: "snippet",
    type: "video",
    maxResults: "1",
    safeSearch: "strict",
    videoEmbeddable: "true",
    videoSyndicated: "true",
    relevanceLanguage: "en",
    q: searchQuery,
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);

  if (!response.ok) {
    const text = await response.text();
    const err = new Error(`YouTube search failed (${response.status})`);
    err.statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
    err.details = text.slice(0, 200);
    throw err;
  }

  const payload = await response.json();
  const item = payload.items?.[0];

  if (!item?.id?.videoId) {
    const err = new Error("No relevant YouTube result found");
    err.statusCode = 404;
    throw err;
  }

  return {
    videoId: item.id.videoId,
    title: coerceTrimmedString(item.snippet?.title) || "Suggested review video",
    description: coerceTrimmedString(item.snippet?.description) || "",
    channelTitle: coerceTrimmedString(item.snippet?.channelTitle) || null,
    thumbnails: item.snippet?.thumbnails || null,
  };
}

async function buildRemediationPayload(answer, fallbackQuery) {
  const parsed = extractJsonObject(answer);

  let fallbackSearch = null;
  if (fallbackQuery) {
    const lines = String(fallbackQuery)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const extractAfterColon = (label) => {
      const match = lines.find((line) => line.toLowerCase().startsWith(label));
      if (!match) return null;
      const [, ...rest] = match.split(":");
      return coerceTrimmedString(rest.join(":"));
    };

    const question = extractAfterColon("question:");
    const topic = extractAfterColon("topic:");
    const subTopic = extractAfterColon("sub-topic:");
    const correctAnswer = extractAfterColon("correct answer:");
    const optionsRaw = extractAfterColon("options:");
    const incorrectAnswer = extractAfterColon("incorrect answer chosen:");

    const optionKeywords = optionsRaw
      ? optionsRaw
          .split("|")
          .map((part) => part.replace(/^[A-Z]\./i, "").trim())
          .filter(Boolean)
          .slice(0, 3)
          .join(" ")
      : null;

    const fallbackPieces = [question, optionKeywords, correctAnswer, incorrectAnswer, subTopic, topic];
    fallbackSearch = coerceTrimmedString(fallbackPieces.filter(Boolean));
  }

  const searchQuery =
    coerceTrimmedString(parsed?.searchQuery) ||
    coerceTrimmedString(parsed?.query) ||
    coerceTrimmedString(parsed?.keywords) ||
    fallbackSearch;

  if (!searchQuery) {
    const err = new Error("AI response did not include a usable search query");
    err.statusCode = 422;
    throw err;
  }

  const sanitizedQuery = searchQuery.length > 120 ? searchQuery.slice(0, 120) : searchQuery;

  const video = await searchYouTubeVideo(sanitizedQuery);

  const summarySource = coerceTrimmedString(parsed?.summary) || video.description;
  const title = coerceTrimmedString(parsed?.titleHint) || video.title;

  return {
    title,
    url: `https://www.youtube.com/watch?v=${video.videoId}`,
  summary: truncate(summarySource || "Watch this short video to reinforce the concept.", 180),
    channel: video.channelTitle,
    thumbnails: video.thumbnails,
    searchQuery: sanitizedQuery,
  };
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

    if (mode === "remediation") {
      try {
        const remediation = await buildRemediationPayload(answer, trimmed);
        return NextResponse.json({ answer, mode, remediation });
      } catch (remediationError) {
        console.error("Remediation error", remediationError);
        const status = remediationError.statusCode || 502;
        return NextResponse.json(
          { error: remediationError.message || "Unable to fetch a remediation video." },
          { status }
        );
      }
    }

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
