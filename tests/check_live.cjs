async function run() {
  const r1 = await fetch("https://beit-avraham-web-five.vercel.app/api/contenido");
  const d1 = await r1.json();
  console.log("/api/contenido status:", r1.status, "items:", d1.items?.length, "fallback:", d1.fallback);

  const html = await fetch("https://beit-avraham-web-five.vercel.app").then(r => r.text());
  const chunks = html.match(/\/static\/chunks\/[^"]+/g) || [];
  console.log("Chunks count:", chunks.length);
  for (const c of chunks) {
    const text = await fetch("https://beit-avraham-web-five.vercel.app" + c).then(r => r.text());
    if (text.includes("Julio Valdez")) console.log("Found Julio Valdez in:", c);
    if (text.includes("Daniel Rojkin")) console.log("Found Daniel Rojkin in:", c);
  }
}
run();
