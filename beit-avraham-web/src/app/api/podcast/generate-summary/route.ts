import { SHIURIM_CATALOG } from "../../../../data/shiurim";
import { type PodcastEpisode } from "../../../../data/podcast";
import { generateTwoVoiceScript } from "../../../../lib/podcast/aiSummaryScript";
import { synthesizePodcastSummary } from "../../../../lib/podcast/ttsEngine";
import { CONTENT_PROJECT, contentHeaders, listShiurim } from "../../../../lib/content/store";

function endpoint(): { url: string; key: string } | null {
  const url = process.env.SCA_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SCA_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const shiurId = body?.shiurId || "shabat-01";

  const allShiurim = await listShiurim();
  const shiur = allShiurim.find(s => s.id === shiurId) || SHIURIM_CATALOG[0];

  const site = (process.env.PODCAST_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");

  // 1. Generar guion estructurado a dos voces
  const script = generateTwoVoiceScript(shiur);

  // 2. Sintetizar y cachear audio
  const audio = await synthesizePodcastSummary(script, site);

  // 3. Crear modelo de episodio de podcast
  const episode: PodcastEpisode = {
    id: script.episodeId,
    number: 1,
    shiurId: shiur.id,
    title: script.title,
    description: script.description,
    topic: script.topic,
    teacher: script.teacher,
    durationLabel: script.durationLabel,
    durationSeconds: audio.durationSeconds,
    publishedAt: new Date().toISOString(),
    audioUrl: audio.publicUrl,
    audioBytes: audio.audioBytes,
    chapters: script.chapters,
    feedReady: true
  };

  // 4. Guardar / Upsert en Matrix Supabase fsca.content_items
  const target = endpoint();
  let matrixSaved = false;

  if (target) {
    try {
      const res = await fetch(`${target.url}/rest/v1/content_items?on_conflict=project_name,kind,slug`, {
        method: "POST",
        headers: {
          ...contentHeaders(target.key),
          Prefer: "resolution=merge-duplicates,return=representation"
        },
        body: JSON.stringify({
          project_name: CONTENT_PROJECT,
          kind: "podcast",
          slug: episode.id,
          payload: episode
        })
      });
      matrixSaved = res.ok;
    } catch {
      matrixSaved = false;
    }
  }

  return Response.json({
    ok: true,
    episode,
    audio,
    scriptTurns: script.turns.length,
    matrixSaved
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shiurId = searchParams.get("shiurId") || "shabat-01";

  return POST(new Request(request.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shiurId })
  }));
}
