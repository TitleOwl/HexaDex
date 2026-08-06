import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import detectPokemonHandler from "./api/detect-pokemon.js";

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

// Shared dev-mode adapter: gives Vercel-style `req.body` / `res.status().json()`
// to a serverless handler running under Vite's plain Node http server.
function createDevApiHandler(loadHandler) {
  const respond = async (req, res) => {
    try {
      const handler = (await loadHandler()).default;
      res.status = (code) => { res.statusCode = code; return res; };
      res.json = (data) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(data)); };
      await handler(req, res);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message || "Dev API error" }));
    }
  };

  return (req, res) => {
    if (req.method === "GET") {
      req.body = {};
      respond(req, res);
      return;
    }
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch {
        req.body = {};
      }
      respond(req, res);
    });
  };
}

function authDevApiPlugin() {
  const routes = {
    "/api/auth/register": () => import("./api/auth/register.js"),
    "/api/auth/login": () => import("./api/auth/login.js"),
    "/api/auth/logout": () => import("./api/auth/logout.js"),
    "/api/auth/me": () => import("./api/auth/me.js"),
    "/api/auth/profile": () => import("./api/auth/profile.js"),
    "/api/catch/increment": () => import("./api/catch/increment.js"),
    "/api/catch/leaderboard": () => import("./api/catch/leaderboard.js"),
    "/api/favorites": () => import("./api/favorites/index.js"),
  };
  return {
    name: "auth-dev-api",
    configureServer(server) {
      for (const [path, loadHandler] of Object.entries(routes)) {
        server.middlewares.use(path, createDevApiHandler(loadHandler));
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  process.env.AUTH_SECRET = env.AUTH_SECRET;
  process.env.KV_REST_API_URL = env.KV_REST_API_URL;
  process.env.KV_REST_API_TOKEN = env.KV_REST_API_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = env.UPSTASH_REDIS_REST_URL;
  process.env.UPSTASH_REDIS_REST_TOKEN = env.UPSTASH_REDIS_REST_TOKEN;

  console.log(
    "[Gemini]",
    env.GEMINI_API_KEY
      ? "GEMINI_API_KEY loaded"
      : "GEMINI_API_KEY missing"
  );
  console.log(
    "[Auth]",
    env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL
      ? "Redis credentials loaded"
      : "Redis credentials missing — login/register will fail until KV env vars are set"
  );

  return {
    plugins: [react(), geminiDevApiPlugin(), authDevApiPlugin()],
  };
});