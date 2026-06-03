import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import detectPokemonHandler from "./src/api/detect-pokemon.js";

function geminiDevApiPlugin() {
  return {
    name: "gemini-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/detect-pokemon", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        let body = "";

        req.on("data", (chunk) => {
          body += chunk;
        });

        req.on("end", async () => {
          try {
            req.body = body ? JSON.parse(body) : {};

            const mockRes = {
              status(code) {
                res.statusCode = code;
                return this;
              },
              json(data) {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(data));
              },
            };

            await detectPokemonHandler(req, mockRes);
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: err.message || "Dev API error",
              })
            );
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;

  console.log(
    "[Gemini]",
    env.GEMINI_API_KEY
      ? "GEMINI_API_KEY loaded"
      : "GEMINI_API_KEY missing"
  );

  return {
    plugins: [react(), geminiDevApiPlugin()],
  };
});