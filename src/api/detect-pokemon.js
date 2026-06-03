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
    console.log("=================================");
    console.log("Gemini Detect API");
    console.log(
      "API KEY =",
      process.env.GEMINI_API_KEY ? "FOUND" : "MISSING"
    );
    console.log("=================================");

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY not set",
      });
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

const prompt = `
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

    console.log("Sending request to Gemini...");

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt,
                },
                {
                  inline_data: {
                    mime_type: mediaType,
                    data: image,
                  },
                },
              ],
            },
          ],

generationConfig: {
  temperature: 0,
  maxOutputTokens: 50
}
        }),
      }
    );

    const data = await geminiRes.json();
console.log(
  "Gemini Text =",
  data?.candidates?.[0]?.content?.parts?.[0]?.text
);
    console.log("=================================");
    console.log("Gemini Status =", geminiRes.status);
    console.log(
      "Gemini Response =",
      JSON.stringify(data, null, 2)
    );
    console.log("=================================");

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({
        error:
          data?.error?.message ||
          `Gemini API error ${geminiRes.status}`,
        details: data,
      });
    }

    const parts =
      data?.candidates?.[0]?.content?.parts || [];

    console.log(
      "PARTS =",
      JSON.stringify(parts, null, 2)
    );

    const raw =
      parts?.[0]?.text?.trim() ||
      data?.text ||
      "unknown";

    const name = normalizePokemonName(raw);

    console.log("Raw AI Result =", raw);
    console.log("Normalized =", name);
    console.log("=================================");

    return res.status(200).json({
      success: true,
      name,
      raw,
      debug: {
        model: data?.modelVersion,
        finishReason:
          data?.candidates?.[0]?.finishReason,
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