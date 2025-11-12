import { writeFile } from "fs/promises";
export async function wirteit(filename, data) {
  try {
    // Convert data (like object) to string
    const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);

    await writeFile(filename, content, "utf-8");
    console.log(`✅ File saved: ${filename}`);
  } catch (err) {
    console.error("❌ Error writing file:", err);
  }
}