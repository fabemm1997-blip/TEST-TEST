export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL fehlt" });

  try {
    // Try to fetch the page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de-CH,de;q=0.9",
      },
    });

    if (!response.ok) {
      return res.status(200).json({ success: false, error: `HTTP ${response.status}`, html: null });
    }

    const html = await response.text();

    // Try to extract schema.org/Recipe JSON-LD
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    let recipeData = null;

    if (jsonLdMatch) {
      for (const block of jsonLdMatch) {
        try {
          const inner = block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "");
          const parsed = JSON.parse(inner);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of items) {
            if (item["@type"] === "Recipe" || (Array.isArray(item["@type"]) && item["@type"].includes("Recipe"))) {
              recipeData = item;
              break;
            }
            // Check @graph
            if (item["@graph"]) {
              const recipe = item["@graph"].find(g => g["@type"] === "Recipe");
              if (recipe) { recipeData = recipe; break; }
            }
          }
        } catch {}
        if (recipeData) break;
      }
    }

    if (recipeData) {
      return res.status(200).json({
        success: true,
        method: "schema.org",
        name: recipeData.name || null,
        ingredients: recipeData.recipeIngredient || [],
        servings: recipeData.recipeYield || null,
      });
    }

    // Fallback: return truncated HTML for Claude to parse
    const truncated = html.slice(0, 8000);
    return res.status(200).json({
      success: true,
      method: "html",
      html: truncated,
    });

  } catch (err) {
    return res.status(200).json({ success: false, error: err.message, html: null });
  }
}
