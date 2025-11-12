import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Takes an Instagram reel URL and returns a downloadable media link.
 * @param {string} reelUrl - The Instagram reel URL.
 * @returns {Promise<string>} - The direct video download URL.
 */
export async function getInstagramReelDownloadLink(reelUrl) {
  try {
    // 1️⃣ Send POST request to Snapsave API (more stable than SaveInsta)
    const { data: html } = await axios.post(
      "https://snapsave.app/action.php?lang=en",
      new URLSearchParams({ url: reelUrl }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );

    // 2️⃣ Parse the returned HTML
    const $ = cheerio.load(html);

    // 3️⃣ Extract the first download link
    const downloadLink = $("a[target='_blank']").attr("href");

    if (downloadLink && downloadLink.startsWith("https")) {
      return downloadLink;
    } else {
      throw new Error("No valid download link found in response.");
    }
  } catch (error) {
    console.error("❌ Error fetching Instagram reel download link:", error.message);
    throw new Error("Failed to retrieve reel media link.");
  }
}
