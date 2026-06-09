function normalizePokemonName(text) {
  if (!text) return "unknown";

  let n = String(text)
    .toLowerCase()
    .trim()
    .replace(/["'`.]/g, "")
    .replace(/\n/g, " ")
    .trim();

  const aliases = {
    mr: "mr-mime",
    mrmime: "mr-mime",
    mimejr: "mime-jr",
    mime: "mr-mime",
    "farfetch’d": "farfetchd",
    "farfetch'd": "farfetchd",
    "sirfetch’d": "sirfetchd",
    "sirfetch'd": "sirfetchd",
    "nidoran♀": "nidoran-f",
    "nidoran♂": "nidoran-m",
  };

  const firstWord = n.split(/\s+/)[0];

  if (aliases[firstWord]) {
    return aliases[firstWord];
  }

  return firstWord.replace(/\s+/g, "-");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    // Collect all available API keys (rotate when quota exceeded)
    const API_KEYS = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
    ].filter(Boolean);

    console.log("=================================");
    console.log("Gemini Detect API");
    console.log("API keys available =", API_KEYS.length);
    console.log("=================================");

    if (!API_KEYS.length) {
      return res.status(500).json({ error: "GEMINI_API_KEY not set" });
    }

    const { image, mediaType = "image/jpeg" } = req.body || {};

    console.log("Image received =", !!image);
    console.log("Image length =", image?.length || 0);
    console.log("Media type =", mediaType);

    if (!image) {
      return res.status(400).json({
        error: "Missing image",
      });
    }

const isAudio = (mediaType || "").startsWith("audio/");

const prompt = isAudio ? `
You are listening to an audio recording of a Pokémon cry — the iconic sound effects each Pokémon makes in the games and anime.

Identify which Pokémon is making this cry.

Rules:
- Reply ONLY with the Pokémon English name.
- One word only. Use hyphen for special names: mr-mime, ho-oh, farfetchd, porygon-z.
- No explanation, no punctuation, no extra words.
- If no Pokémon cry is audible, or you cannot identify it with reasonable confidence, reply exactly: unknown

Examples of valid replies:
pikachu
charizard
mewtwo
mr-mime
unknown
` : `
What Pokemon is shown in this image?

Rules:
- Reply ONLY with the Pokemon English name.
- One word only.
- No explanation.
- No punctuation.
- Examples:
pikachu
charizard
bulbasaur
unknown
`;

    // Try every key × model combination until success or all quota-out
    const MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];

    const requestBody = JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mediaType, data: image } },
        ],
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 50 },
    });

    let geminiRes, data, usedModel;
    let done = false;

    for (const apiKey of API_KEYS) {
      if (done) break;
      for (const model of MODELS) {
        console.log(`Trying key[${API_KEYS.indexOf(apiKey) + 1}] + ${model}`);
        geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: requestBody }
        );
        data = await geminiRes.json();
        usedModel = model;

        if (geminiRes.ok) { done = true; break; }

        const isQuota = geminiRes.status === 429 ||
          (data?.error?.message || "").toLowerCase().includes("quota") ||
          (data?.error?.message || "").toLowerCase().includes("rate");

        console.log(`  → ${geminiRes.status} isQuota=${isQuota}`);
        if (!isQuota) { done = true; break; } // auth/bad-request — stop immediately
        // quota → continue to next model, then next key
      }
    }

    console.log("Used model =", usedModel);
    console.log("Gemini Status =", geminiRes.status);
    console.log("Gemini Text =", data?.candidates?.[0]?.content?.parts?.[0]?.text);

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({
        error: data?.error?.message || `Gemini API error ${geminiRes.status}`,
        details: data,
      });
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const raw = parts?.[0]?.text?.trim() || data?.text || "unknown";
    const name = normalizePokemonName(raw);

    console.log("Raw AI Result =", raw);
    console.log("Normalized =", name);

    return res.status(200).json({
      success: true,
      name,
      raw,
      debug: {
        model: usedModel,
        finishReason: data?.candidates?.[0]?.finishReason,
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message || "Server error",
      stack: err.stack,
    });
  }
}