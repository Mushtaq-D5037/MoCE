// Server-side proxy in front of two possible LLM providers: Anthropic
// (Claude) and OpenAI (gpt-4o-mini). The browser always calls this route;
// this route is the only place that ever talks to api.anthropic.com or
// api.openai.com, and the only place that ever sees a "real" server-held
// API key.
//
// Provider selection:
// - The client may optionally send its own keys via the x-anthropic-key /
//   x-openai-key headers (set from the chat widget's settings gear icon,
//   held in sessionStorage). Those take priority over the server's env
//   vars for that request only — nothing is written to server storage.
// - Default priority is Anthropic first, then OpenAI's gpt-4o-mini, unless
//   the request body's `provider` field pins one explicitly ("anthropic" |
//   "openai"), in which case that provider is required to have a key or
//   the request fails with a clear error instead of silently falling back.
// - If no key is available for the resolved provider, the request fails
//   with a message telling the operator to configure one.

const OPENAI_MODEL = "gpt-4o-mini";
// Cheaper/smaller models (e.g. gpt-4o-mini) don't always reproduce the exact
// name="X">{...}</use_tool> syntax verbatim — this only needs to detect that
// the model attempted a tool call at all; the widget's own extractToolCall
// does the more forgiving parsing of name/args.
const TOOL_CALL_RE = /<use_tool\s+name="/;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function resolveProvider(preferred, anthropicKey, openaiKey) {
  if (preferred === "anthropic") {
    if (!anthropicKey) {
      return { error: "Anthropic is set as the preferred provider, but no Anthropic API key is configured." };
    }
    return { provider: "anthropic" };
  }
  if (preferred === "openai") {
    if (!openaiKey) {
      return { error: "OpenAI (gpt-4o-mini) is set as the preferred provider, but no OpenAI API key is configured." };
    }
    return { provider: "openai" };
  }
  if (anthropicKey) return { provider: "anthropic" };
  if (openaiKey) return { provider: "openai" };
  return {
    error:
      "No API key configured for LLM inferencing. Set ANTHROPIC_API_KEY or OPENAI_API_KEY on the server, or add a key via the chat settings (gear icon).",
  };
}

async function callAnthropic(apiKey, { model, max_tokens, system, stop_sequences, messages }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens, system, stop_sequences, messages }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { status: res.status, error: data?.error?.message || "Anthropic API error." };
  }
  return { status: res.status, data };
}

async function callOpenAI(apiKey, { max_tokens, system, stop_sequences, messages }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens,
      stop: stop_sequences,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { status: res.status, error: data?.error?.message || "OpenAI API error." };
  }
  const text = data.choices?.[0]?.message?.content || "";
  const stop_reason = TOOL_CALL_RE.test(text) ? "stop_sequence" : "end_turn";
  return { status: res.status, data: { content: [{ type: "text", text }], stop_reason } };
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const anthropicKey = req.headers.get("x-anthropic-key") || process.env.ANTHROPIC_API_KEY || "";
  const openaiKey = req.headers.get("x-openai-key") || process.env.OPENAI_API_KEY || "";
  const preferred = body.provider === "anthropic" || body.provider === "openai" ? body.provider : "auto";

  const resolved = resolveProvider(preferred, anthropicKey, openaiKey);
  if (resolved.error) return json(500, { error: resolved.error });

  const { model, max_tokens, system, stop_sequences, messages } = body;
  const result =
    resolved.provider === "anthropic"
      ? await callAnthropic(anthropicKey, { model, max_tokens, system, stop_sequences, messages })
      : await callOpenAI(openaiKey, { max_tokens, system, stop_sequences, messages });

  if (result.error) return json(result.status, { error: result.error });
  return json(result.status, result.data);
}
