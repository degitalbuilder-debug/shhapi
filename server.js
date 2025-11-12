import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import fetch from "node-fetch";
import { pipeline } from "stream";
import { promisify } from "util";
import rateLimit from "express-rate-limit";
import { getAktuResultHTML } from "./funtions/getAktuResult.js";


const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 requests per minute per IP
  message: { error: "Too many requests, please slow down." },
});


const streamPipeline = promisify(pipeline);

dotenv.config();
const app = express();

/* ----------------------- 🔧 Middleware ----------------------- */
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use("/api/", limiter);

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "x-secure-token"],
  })
);

app.use(express.json());

/* ----------------------- 🔑 Constants ----------------------- */
const SECRET = process.env.SECRET_KEY;
const WORKER_PROXIES = [
  "https://empty-flower-b1d6.720mukeshmehta.workers.dev",
];

/* ----------------------- ⚙️ Utilities ----------------------- */
// Generate short HMAC token
function generateShortHmac(timestamp, domain) {
  const secret = process.env.HASH_SECRET_KEY;
  const payload = `${timestamp}_${domain}`;
  const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return hash.substring(0, 8);
}

// Extract domain from URL
function getDomain(urlString) {
  try {
    return new URL(urlString).hostname;
  } catch {
    return urlString;
  }
}

/* ----------------------- 🎬 Fetch Video ----------------------- */
async function fetchVideoMetadata(teraboxUrl) {
  const timestamp = Math.floor(Date.now() / 1000);
  const domain = getDomain("https://www.downterabox.com/");
  const token = generateShortHmac(timestamp, domain);
  const apiUrl = `https://www.downterabox.com/api/fetch-video?token=${token}&t=${timestamp}`;

  const body = {
    url: teraboxUrl,
    captchaToken: "bypass",
    saveToR2: false,
    fetchType: "both",
  };

  const headers = {
    accept: "*/*",
    "accept-encoding": "gzip, deflate, br, zstd",
    "accept-language": "en-IN,en;q=0.9",
    "content-type": "application/json",
    origin: "https://www.downterabox.com",
    referer: "https://www.downterabox.com/",
    "user-agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  };

  console.log("🚀 Requesting metadata:", apiUrl);

  const res = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.log(`❌ Fetch failed [${res.status}] →`, text.slice(0, 150));
    return null;
  }

  const data = JSON.parse(text);
  if (data?.list?.length) { 
    const video = data.list[0];
    const total_size = data.total_files;
    const streamUrl =
      video.fast_stream_url ||
      video.m3u8_url ||
      video.stream_url ||
      video.m3u8;
    console.log("✅ Stream URL found:", streamUrl);
    return { video,streamUrl, total_size,data };
  }

  throw new Error("No valid video info returned");
}

/* ----------------------- 🛰️ Worker Proxy ----------------------- */
async function fetchViaWorker(originalUrl) {
  if (!originalUrl) throw new Error("No URL to proxy");
  const proxy =
    WORKER_PROXIES[Math.floor(Math.random() * WORKER_PROXIES.length)];
  const workerUrl = `${proxy}?url=${encodeURIComponent(originalUrl)}`;

  console.log("🌐 Fetching via worker:", workerUrl);
  const res = await fetch(workerUrl);
  if (!res.ok)
    throw new Error(`Worker fetch failed (${res.status}) — ${workerUrl}`);

  return await res.text();
}

/* ----------------------- 🎥 Full Process ----------------------- */
async function fetchTeraboxVideo(teraboxUrl) {
  try {
    const { video,streamUrl, total_size,data } = await fetchVideoMetadata(teraboxUrl);
    const workerContent = await fetchViaWorker(streamUrl);
    // console.log("✅ Worker content :",workerContent)
    console.log("✅ Worker responded, length:", workerContent.length);
    return { data };
  } catch (err) {
    console.error("❌ Video fetch error:", err.message);
    return null;
  }
}

/* ----------------------- 🔐 JWT Middleware ----------------------- */
function verifyJWT(req, res, next) {
  const token = req.headers["x-secure-token"];
  if (!token) return res.status(403).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, SECRET);
    req.tokenPayload = payload;
    console.log("✅ JWT verified");
    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    res.status(403).json({ error: "Invalid or expired token" });
  }
}

/* ----------------------- 📡 Routes ----------------------- */

// Step 1: Get secure stream URL
app.post("/api/secure", verifyJWT, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing url" });

    console.log("📩 Received URL:", url);
    const result = await fetchTeraboxVideo(url);
    if (!result) throw new Error("Failed to fetch stream");

    return res.json({ success: true, result });
  } catch (err) {
    console.error("Fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch video stream" });
  }
});

app.post("/api/result", verifyJWT, async (req, res) => {
  try {
    const { rollNo } = req.body;  
    const result = await getAktuResultHTML(rollNo);
    if (!result) throw new Error("Failed to fetch result");
    return res.json({ success: true, result });
  }
  catch(err){
    console.error("Fetch error:", err.message);
  }
})
 

/* ----------------------- 🚀 Start Server ----------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Secure API running on port ${PORT} (with Helmet 🛡️)`)
);

