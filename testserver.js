import crypto from "crypto";
import fetch from "node-fetch"; // npm install node-fetch@3

const WORKER_PROXIES = [
  "https://empty-flower-b1d6.720mukeshmehta.workers.dev",
];

/**
 * Generate short HMAC token (first 8 hex chars)
 */
function generateShortHmac(timestamp, domain) {
  const secret = "playterabox_secure_2025";
  const payload = `${timestamp}_${domain}`;
  const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return hash.substring(0, 8);
}

/**
 * Extract domain from URL
 */
function getDomain(urlString) {
  try {
    return new URL(urlString).hostname;
  } catch {
    return urlString;
  }
}

/**
 * 🔥 Fetch video metadata (no pseudo-headers)
 */
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

  console.log("🚀 Requesting:", apiUrl);

  const headers = {
    accept: "*/*",
    "accept-encoding": "gzip, deflate, br, zstd",
    "accept-language": "en-IN,en;q=0.9",
    "content-type": "application/json",
    dnt: "1",
    origin: "https://www.downterabox.com",
    referer: "https://www.downterabox.com/",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  };

  const res = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();

  if (!res.ok) {
    console.log(`❌ Request failed [${res.status}] →`, text.slice(0, 200));
    return null;
  }

  const data = JSON.parse(text);

  if (data?.list?.length) {
    const video = data.list[0];
    const streamUrl =
      video.fast_stream_url ||
      video.m3u8_url ||
      video.stream_url ||
      video.m3u8;

    console.log("✅ Stream URL found:", streamUrl);
    return { video, streamUrl };
  }

  throw new Error("No valid video info returned");
}

/**
 * 🌐 Fetch via Worker proxy (optional)
 */
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

/**
 * 🎬 Main function (combines both)
 */
async function fetchTeraboxVideo(teraboxUrl) {
  try {
    const { streamUrl } = await fetchVideoMetadata(teraboxUrl);
    const workerContent = await fetchViaWorker(streamUrl); // optional
    console.log("✅ Worker proxy responded, length:", workerContent.length);
    return streamUrl;
  } catch (err) {
    console.error("❌ Error:", err.message);
    return null;
  }
}

// 🧪 Example usage
(async () => {
  const url = "https://1024terabox.com/s/1NgBQOKZFhFdpxL7dsAnVBA"; // replace with real link
  const result = await fetchTeraboxVideo(url);
  console.log("\n🎬 Final Stream URL:", result);
})();
