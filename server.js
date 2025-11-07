import express from "express";
import crypto from "crypto";
import cors from "cors";
import axios from "axios";
import qs from "qs";
import dotenv from "dotenv";

import jwt from "jsonwebtoken";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// 🔑 Secret key from environment
const SECRET = process.env.SECRET_KEY;

// ---------------------- HMAC Token Verification ----------------------
 function verifyJWT(req, res, next) {
  const token = req.headers["x-secure-token"];
  if (!token) return res.status(403).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, SECRET); // auto checks expiry
    req.tokenPayload = payload; // optional
    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    res.status(403).json({ error: "kya be chirkut" });
  }
}


// ---------------------- Fetch OneView Result ----------------------
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
  return response.data;
}

// ---------------------- Routes ----------------------
app.post("/api/secure", verifyJWT, async (req, res) => {
  try {
    const { rollNo } = req.body;
    if (!rollNo) return res.status(400).json({ error: "Missing roll number" });

    const html = await fetchOneViewResult(rollNo);
    res.json({ success: true, html });
  } catch (err) {
    console.error("Fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch result" });
  }
});

// ---------------------- Start Server ----------------------
app.listen(5000, () => console.log("🚀 Secure API running on port 5000"));
