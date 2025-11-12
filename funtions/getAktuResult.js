// npm install node-fetch
import fetch from "node-fetch";

export async function getAktuResultHTML(rollNo) {
  const base = "https://oneview.aktu.ac.in";
  const postUrl = `${base}/WebPages/AKTU/OneView.aspx`;

  const headers = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Content-Type": "application/x-www-form-urlencoded",
    "Origin": base,
    "Referer": `${base}/WebPages/AKTU/OneView.aspx`,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  };

  const payload = new URLSearchParams({
    "__EVENTTARGET": "",
    "__EVENTARGUMENT": "",
    "__VIEWSTATE": "/wEPDwULLTExMDg0MzM4NTIPZBYCAgMPZBYEAgMPZBYEAgkPDxYCHgdWaXNpYmxlaGRkAgsPDxYCHwBnZBYCAgEPZBYEAgMPDxYCHgdFbmFibGVkaGRkAgUPFgIfAWhkAgkPZBYCAgEPZBYCZg9kFgICAQ88KwARAgEQFgAWABYADBQrAABkGAEFEmdyZFZpZXdDb25mbGljdGlvbg9nZEj7pHjMdpqzXPMViMldFkeGjx3IpdUVid7sjedCGPPI",
    "__VIEWSTATEGENERATOR": "FF2D60E4",
    "__EVENTVALIDATION":
      "/wEdAAWjieCZ6D3jJPRsYhIb4WL1WB/t8XsfPbhKtaDxBSD9L47U3Vc0WZ+wxclqyPFfzmNKpf/A83qpx8oXSYxifk/OuqJzdLRkOMLOoT0zZmF15DWzOb+YJ8ghyo6LVCa9G/Z8aT4v6Aejt4yzYIiEWTI1",
    txtRollNo: rollNo,
    "g-recaptcha-response": "",
    btnSearch: "खोजें",
    hidForModel: "",
  });

  try {
    // Step 1: POST roll number
    const res = await fetch(postUrl, {
      method: "POST",
      headers,
      body: payload.toString(),
      redirect: "manual",
    });

    const body = await res.text();
    const match = body.match(/href="([^"]+OVEngine\.aspx\?enc=[^"]+)"/i);

    if (!match) {
      throw new Error("ENC redirect link not found.");
    }

    const encUrl = new URL(match[1], base).toString();

    // Step 2: GET result page
    const getHeaders = {
      ...headers,
      Referer: postUrl,
      Cookie: res.headers.get("set-cookie") || "",
    };

    const result = await fetch(encUrl, {
      method: "GET",
      headers: getHeaders,
    });

    const html = await result.text();
    console.log("✅ HTML fetched successfully. Length:", html.length);
    return html;
  } catch (err) {
    console.error("❌ Error fetching result:", err.message);
    return null;
  }
}

// Example usage:
// const rollNo = "2300541539001";
// getAktuResultHTML(rollNo).then((html) => {
//   if (html) {
//     console.log("Result page length:", html.length);
//   }
// });
