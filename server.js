import express from "express";
import crypto from "crypto";
import cors from "cors";
import axios from "axios";
import qs from "qs";
import dotenv from "dotenv";
import { load } from "cheerio";



dotenv.config();
const app = express();
app.use(cors({
  origin: ["http://localhost:3000", "https://aktubrand.vercel.app"]
}));
app.use(express.json());

// 🔑 Use .env secret for consistency
const SECRET = process.env.SECRET_KEY  ;
console.log(SECRET)
const KEY = crypto.createHash("sha256").update(SECRET).digest();

function decryptToken(token) {
  const [ivBase64, encrypted] = token.split(":");
  const iv = Buffer.from(ivBase64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}

function verifyEncryptedToken(req, res, next) {
  try {
    const token = req.headers["x-secure-token"];
    if (!token) return res.status(403).json({ error: "Missing secure token" });

    const data = decryptToken(token);
    const now = Date.now();
    if (now - data.timestamp > 2 * 60 * 1000)
      return res.status(403).json({ error: "Kya be chintu" });

    next();
  } catch (err) {
    console.error("Verification error:", err.message);
    res.status(403).json({ error: "kya be chutiye" });
  }
}

async function fetchOneViewResult(rollNo) {
  const url = "https://oneview.aktu.ac.in/WebPages/AKTU/OneView.aspx";

  const data = {
    __EVENTTARGET: "",
    __EVENTARGUMENT: "",
    __VIEWSTATE:
      "/wEPDwULLTExMDg0MzM4NTIPZBYCAgMPZBYEAgMPZBYEAgkPDxYCHgdWaXNpYmxlaGRkAgsPDxYCHwBnZBYCAgEPZBYEAgMPDxYCHgdFbmFibGVkaGRkAgUPFgIfAWhkAgkPZBYCAgEPZBYCZg9kFgICAQ88KwARAgEQFgAWABYADBQrAABkGAEFEmdyZFZpZXdDb25mbGljdGlvbg9nZEj7pHjMdpqzXPMViMldFkeGjx3IpdUVid7sjedCGPPI",
    __VIEWSTATEGENERATOR: "FF2D60E4",
    __EVENTVALIDATION:
      "/wEdAAWjieCZ6D3jJPRsYhIb4WL1WB/t8XsfPbhKtaDxBSD9L47U3Vc0WZ+wxclqyPFfzmNKpf/A83qpx8oXSYxifk/OuqJzdLRkOMLOoT0zZmF15DWzOb+YJ8ghyo6LVCa9G/Z8aT4v6Aejt4yzYIiEWTI1",
    txtRollNo: rollNo,
    "g-recaptcha-response": "",
    btnSearch: "खोजें",
    hidForModel: "",
  };

  const headers = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Content-Type": "application/x-www-form-urlencoded",
    Origin: "https://oneview.aktu.ac.in",
    Referer: "https://oneview.aktu.ac.in/WebPages/AKTU/OneView.aspx",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  };

  const response = await axios.post(url, qs.stringify(data), { headers });
  let html = response.data;
 
return html; 

 
}

app.post("/api/secure", verifyEncryptedToken, async (req, res) => {
  try {
    const { rollNo } = req.body;
    if (!rollNo) return res.status(400).json({ error: "Missing roll number" });

    const result = await fetchOneViewResult(rollNo);
    res.json({ success: true, html: result });
  } catch (err) {
    console.error("Fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch result" });
  }
});

app.listen(5000, () =>
  console.log("🚀 Secure API running on port 5000")
);
