import crypto from "crypto";

const SECRET_KEY = Buffer.from(process.env.ENCRYPTION_KEY); // 32 bytes
const IV = crypto.randomBytes(16); // Random IV for AES-256-CBC

export function encryptURL(url) {
  const cipher = crypto.createCipheriv("aes-256-cbc", SECRET_KEY, IV);
  let encrypted = cipher.update(url, "utf8", "base64");
  encrypted += cipher.final("base64");
  return IV.toString("base64") + ":" + encrypted; // combine IV + ciphertext
}

export function decryptURL(encrypted) {
  try {
    const [ivStr, encryptedData] = encrypted.split(":");
    const iv = Buffer.from(ivStr, "base64");
    const decipher = crypto.createDecipheriv("aes-256-cbc", SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedData, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}
