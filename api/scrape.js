export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.method === "POST" ? req.body : req.query;
  if (!url) {
    // Show test UI
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Scrape Test</title>
  <style>
    body { font-family: sans-serif; max-width: 700px; margin: 40px auto; padding: 0 16px; background: #0f1117; color: #e8eaf6; }
    input { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #2e3250; background: #1a1d27; color: #e8eaf6; font-size: 14px; box-sizing: border-box; margin-top: 8px; }
    button { margin-top: 10px; padding: 10px 24px; border-radius: 8px; border: none; background: #6c8fff; color: #fff; font-size: 14px; cursor: pointer; }
    pre { background: #1a1d27; border: 1px solid #2e3250; border-radius: 8px; padding: 16px; overflow-x: auto; font-size: 12px; white-space: pre-wrap; word-break: break-all; margin-top: 12px; }
    .status { margin-top: 10px; font-size: 13px; }
    .ok { color: #4caf82; } .err { color: #ff6b6b; }
  </style>
</head>
<body>
  <h2>🔍 Rezept URL Scrape Test</h2>
  <input id="url" type="text" placeholder="https://www.fooby.ch/de/rezepte/..." />
  <button onclick="test()">Testen</button>
  <div class="status" id="status"></div>
  <pre id="result" style="display:none"></pre>
  <script>
    async function test() {
      const url = document.getElementById("url").value.trim();
      if (!url) return;
      document.getElementById("status").textContent = "⏳ Lade…";
      document.getElementById("status").className = "status";
      document.getElementById("result").style.display = "none";
      try {
        const r = await fetch("/api/scrape?url=" + encodeURIComponent(url));
        const data = await r.json();
        document.getElementById("status").textContent = data.success ? "✅ Erfolg – " + data.method : "❌ " + data.error;
        document.getElementById("status").className = "status " + (data.success ? "ok" : "err");
        document.getElementById("result").style.display = "block";
        document.getElementById("result").textContent = JSON.stringify(data, null, 2);
      } catch(e) {
        document.getElementById("status").textContent = "❌ " + e.message;
        document.getElementById("status").className = "status err";
      }
    }
  </script>
</body>
</html>`);
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "de-CH,de;q=0.9",
      },
    });

    if (!response.ok) return res.status(200).json({ success: false, error: `HTTP ${response.status}` });

    const html = await response.text();
    const jsonLdBlocks = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
    let recipeData = null;

    for (const block of jsonLdBlocks) {
      try {
        const inner = block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "");
        const parsed = JSON.parse(inner);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (item["@type"] === "Recipe") { recipeData = item; break; }
          if (Array.isArray(item["@type"]) && item["@type"].includes("Recipe")) { recipeData = item; break; }
          if (item["@graph"]) {
            const r = item["@graph"].find(g => g["@type"] === "Recipe");
            if (r) { recipeData = r; break; }
          }
        }
      } catch {}
      if (recipeData) break;
    }

    if (recipeData) {
      return res.status(200).json({
        success: true,
        method: "schema.org/Recipe",
        name: recipeData.name,
        servings: recipeData.recipeYield,
        ingredients: recipeData.recipeIngredient || [],
      });
    }

    return res.status(200).json({ success: false, error: "Kein schema.org/Recipe JSON-LD gefunden", htmlLength: html.length });
  } catch (err) {
    return res.status(200).json({ success: false, error: err.message });
  }
}
