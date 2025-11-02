import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import axios from "axios";
import qs from "qs";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs:60*1000, max: 60 }));

// In-memory session store (for demo). Use Redis or DB in production.
const sessions = new Map();
// session structure: { key: Buffer, expiresAt: number, usedNonces: Set }

const SESSION_TTL_MS = 60 * 1000; // 60 seconds

// create a new session key and id
app.post("/api/session", (req, res) => {
  const id = uuidv4();
  const key = crypto.randomBytes(32); // 256-bit session key
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(id, { key, expiresAt, usedNonces: new Set() });
  // return key in base64 (transported over TLS)
  res.json({ ok: true, sessionId: id, sessionKey: key.toString("base64"), ttl: SESSION_TTL_MS / 1000 });
});

// helper: decrypt payload produced by WebCrypto (ciphertext includes tag at the end)
function decryptWithKeyEnvelope(envelopeB64, keyBuffer) {
  try {
    const envelopeJson = Buffer.from(envelopeB64, "base64").toString("utf8");
    const env = JSON.parse(envelopeJson);
    const iv = Buffer.from(env.iv, "base64");
    const ciphertextAndTag = Buffer.from(env.ciphertext, "base64"); // ciphertext + tag (WebCrypto returns tag appended)
    // separate tag (last 16 bytes)
    const tagLen = 16;
    if (ciphertextAndTag.length < tagLen) throw new Error("ciphertext too short");
    const tag = ciphertextAndTag.slice(ciphertextAndTag.length - tagLen);
    const ciphertext = ciphertextAndTag.slice(0, ciphertextAndTag.length - tagLen);

    const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv, { authTagLength: 16});
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const data = JSON.parse(pt.toString("utf8"));
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// TERABOX fetch function (your same function)
async function fetchTeraboxData(url) {
  const endpoint = "https://teradownloadr.com/wp-admin/admin-ajax.php";
  const payload = qs.stringify({
    action: "terabox_fetch",
    url,
    nonce: "77deb4f191",
  });
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Origin": "https://teradownloadr.com",
    "Referer": "https://teradownloadr.com/",
    "User-Agent": "Mozilla/5.0",
  };
  const response = await axios.post(endpoint, payload, { headers, responseType: "json", validateStatus: null });
  return response.data;
}

// main endpoint: accepts { sessionId, payload }
app.post("/api/terabox", async (req, res) => {
  try {
    const { sessionId, payload } = req.body;
    if (!sessionId || !payload) return res.status(400).json({ ok: false, message: "Missing sessionId or payload" });

    const session = sessions.get(sessionId);
    if (!session) return res.status(401).json({ ok: false, message: "Invalid or expired session" });

    if (Date.now() > session.expiresAt) {
      sessions.delete(sessionId);
      return res.status(401).json({ ok: false, message: "Session expired" });
    }

    // decrypt payload using session key
    const dec = decryptWithKeyEnvelope(payload, session.key);
    if (!dec.ok) return res.status(401).json({ ok: false, message: "Decryption failed" });

    const { url, ts, nonce } = dec.data;
    if (!url || !ts || !nonce) return res.status(400).json({ ok: false, message: "Missing url|ts|nonce" });

    // check timestamp freshness
    const MAX_DRIFT = 2 * 60 * 1000; // 2 minutes
    if (Math.abs(Date.now() - ts) > MAX_DRIFT) return res.status(401).json({ ok: false, message: "Stale request" });

    // check nonce uniqueness to prevent replay
    if (session.usedNonces.has(nonce)) return res.status(401).json({ ok: false, message: "Replay detected (nonce used)" });
    session.usedNonces.add(nonce);

    // Optionally delete session now to make single-use:
    // sessions.delete(sessionId);

    // Validate url (example: restrict to teraboxapp.com)
    if (!url.startsWith("https://teraboxapp.com/")) return res.status(400).json({ ok: false, message: "Invalid URL domain" });

    // Perform external fetch
    const result = await fetchTeraboxData(url);
    return res.json({ ok: true, data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Server error", details: err.message });
  }
});

// cleanup expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) if (s.expiresAt < now) sessions.delete(id);
}, 30 * 1000);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));



