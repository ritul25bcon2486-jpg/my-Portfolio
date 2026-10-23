"use strict";

// TODO: Verify the current model name in the provider docs.
const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_MESSAGE_CHARS = 500;
const MAX_HISTORY_TURNS = 6;
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

const GROUNDING_CONTEXT =
  "You are an AI assistant representing [Your Full Name]. Answer ONLY using the portfolio context below. Background: Computer Science student skilled in Python, JavaScript, HTML/CSS, Git, Vercel, and Cursor AI. Project 1 (Python Programs Collection): Implemented Factorial, Fibonacci sequence generator, and structure-to-dict parser. Project 2 (Messy Python Code Improvement): Took an unstructured, un-commented Python file and improved readability, modularity, and PEP 8 compliance using Cursor AI. Project 3 (Bug Fixing Using Cursor AI): Identified edge-case logic defects and exceptions in a program, documented the bugs, and fixed them using AI prompts. Project 4 (Interactive Quiz App): Lecture 10 project featuring score counters, dynamic question rendering, and responsive styling. Project 5 (Book Reading List App): Lecture 11 project allowing users to add, update, and manage book progress with live deployment. GitHub: https://github.com/[your-username]. Keep answers friendly, concise, and professional. If you don't know something from this context, say so instead of guessing. If a question is unrelated to the portfolio, politely steer back to the projects.";

export default async function handler(req, res) {
  setJsonHeaders(res);

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    return endJson(res, { error: "Method not allowed." });
  }

  const body = parseBody(req.body);
  if (!body) {
    res.statusCode = 400;
    return endJson(res, { error: "Invalid JSON body." });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    res.statusCode = 400;
    return endJson(res, { error: "Message is required." });
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    res.statusCode = 400;
    return endJson(res, { error: "Message must be 500 characters or fewer." });
  }

  const history = sanitizeHistory(body.history);
  const apiKey = process.env.CHATBOT_API_KEY;
  if (!apiKey) {
    console.error("CHATBOT_API_KEY is not set.");
    res.statusCode = 500;
    return endJson(res, { error: "Assistant is not configured yet." });
  }

  const model = process.env.CHATBOT_MODEL || DEFAULT_MODEL;
  const url = GEMINI_ENDPOINT + "/" + model + ":generateContent";

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: GROUNDING_CONTEXT }],
        },
        contents: historyToContents(history, message),
      }),
    });

    const upstreamText = await upstream.text();

    if (!upstream.ok) {
      console.error("Upstream chat error status:", upstream.status);
      console.error("Upstream chat error body:", upstreamText);
      if (upstream.status === 429) {
        res.statusCode = 429;
        return endJson(res, {
          error: "The assistant is busy. Please try again shortly.",
        });
      }
      res.statusCode = 502;
      return endJson(res, {
        error: "The assistant could not complete that request.",
      });
    }

    let payload;
    try {
      payload = JSON.parse(upstreamText);
    } catch (parseError) {
      console.error("Failed to parse upstream JSON.");
      console.error("Upstream chat error body:", upstreamText);
      res.statusCode = 502;
      return endJson(res, { error: "The assistant returned an unreadable reply." });
    }

    const reply = extractReply(payload);
    if (!reply) {
      console.error("Upstream returned no candidates or empty text.");
      console.error("Upstream chat error body:", upstreamText);
      res.statusCode = 502;
      return endJson(res, { error: "The assistant had nothing to say. Try again." });
    }

    res.statusCode = 200;
    return endJson(res, { reply: reply });
  } catch (networkError) {
    console.error("Chat proxy network failure.");
    console.error(
      "Chat proxy error:",
      networkError && networkError.message ? networkError.message : networkError
    );
    res.statusCode = 502;
    return endJson(res, {
      error: "Could not reach the assistant. Please try again.",
    });
  }
}

function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
}

function endJson(res, data) {
  res.end(JSON.stringify(data));
}

function parseBody(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(raw)) {
    try {
      return JSON.parse(raw.toString("utf8"));
    } catch (e) {
      return null;
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  return null;
}

function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(function (turn) {
      if (!turn || typeof turn !== "object") return false;
      var role = turn.role;
      var content = turn.content || turn.text;
      var validRole = role === "user" || role === "assistant" || role === "model";
      return validRole && typeof content === "string" && content.trim();
    })
    .slice(-MAX_HISTORY_TURNS)
    .map(function (turn) {
      return {
        role: turn.role === "user" ? "user" : "model",
        content: String(turn.content || turn.text).slice(0, MAX_MESSAGE_CHARS),
      };
    });
}

function historyToContents(history, message) {
  var contents = history.map(function (turn) {
    return {
      role: turn.role,
      parts: [{ text: turn.content }],
    };
  });
  contents.push({
    role: "user",
    parts: [{ text: message }],
  });
  return contents;
}

function extractReply(payload) {
  var candidates = payload && payload.candidates;
  if (!Array.isArray(candidates) || !candidates.length) return "";
  var parts = candidates[0].content && candidates[0].content.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map(function (part) {
      return part && part.text ? part.text : "";
    })
    .join("\n")
    .trim();
}
