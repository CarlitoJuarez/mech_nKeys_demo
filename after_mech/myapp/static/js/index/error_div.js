
function parseJsonScript(id) {
  const el = document.getElementById(id);
  if (!el) return null;

  // Get raw text and normalize common junk that breaks JSON.parse
  let raw = (el.textContent || "").trim();

  // Strip BOM if present
  raw = raw.replace(/^\uFEFF/, "");

  // (Optional) strip HTML comment wrappers if anything injected them
  raw = raw.replace(/^<!--/, "").replace(/-->$/, "").trim();

  try {
    return JSON.parse(raw);
  } catch (e) {
    // console.error("JSON.parse failed:", e);
    // console.log("RAW >>>", raw, "<<<");
    // console.log(
    //   "CHARCODES (first 80):",
    //   Array.from(raw.slice(0, 80)).map(ch => ch.charCodeAt(0))
    // );
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const obj = parseJsonScript("reset_confirm_errors");
  if (!obj) return;

  const msgs = [];
  for (const items of Object.values(obj)) {
    if (!Array.isArray(items)) continue;
    for (const it of items) {
      if (it && typeof it === "object" && it.message) msgs.push(it.message);
      else msgs.push(String(it));
    }
  }

  const errorDiv = document.getElementById("error_div");
  if (errorDiv && msgs.length) {
    errorDiv.innerHTML = msgs.map(m => `<p>${m}</p>`).join("");
    errorDiv.classList.remove("hide");
    errorDiv.classList.add("show");
  }
});
