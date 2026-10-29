import { findSeries, itunesDuration } from "../../../../data/podcast";
import { listPodcastEpisodes } from "../../../../lib/content/store";

/**
 * Feed RSS 2.0 del podcast, con las etiquetas de iTunes para que Apple Podcasts
 * y Spotify lo acepten.
 *
 * Regla: solo se publican episodios con archivo de audio y tamaño declarado
 * (`feedReady`). Un <enclosure> sin `length` real hace que las apps rechacen el
 * episodio, así que preferimos un feed vacío y honesto antes que uno con enlaces
 * que no descargan.
 */

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absoluteUrl(site: string, maybeRelative: string): string {
  return maybeRelative.startsWith("http") ? maybeRelative : `${site}${maybeRelative}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ serie: string }> }
) {
  const { serie } = await params;
  const series = findSeries(serie);

  if (!series) {
    return new Response("Serie no encontrada", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  const site = (process.env.PODCAST_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  const dynamicEpisodes = await listPodcastEpisodes();
  const episodios = (dynamicEpisodes && dynamicEpisodes.length > 0 ? dynamicEpisodes : series.episodes)
    .filter(ep => ep.feedReady);
  const selfUrl = `${site}/api/podcast/${series.id}`;
  const imagen = series.imageUrl ? absoluteUrl(site, series.imageUrl) : null;

  const items = episodios
    .map(episodio => {
      const lineas = [
        "    <item>",
        `      <title>${xmlEscape(episodio.title)}</title>`,
        `      <description>${xmlEscape(episodio.description)}</description>`,
        `      <itunes:summary>${xmlEscape(episodio.description)}</itunes:summary>`,
        `      <link>${xmlEscape(`${site}/#ep-${episodio.id}`)}</link>`,
        `      <guid isPermaLink="false">${xmlEscape(episodio.id)}</guid>`,
        `      <enclosure url="${xmlEscape(episodio.audioUrl ?? "")}" length="${episodio.audioBytes ?? 0}" type="audio/mpeg" />`,
        `      <itunes:episode>${episodio.number}</itunes:episode>`,
        `      <itunes:explicit>false</itunes:explicit>`
      ];

      const duracion = itunesDuration(episodio.durationSeconds);
      if (duracion) lineas.push(`      <itunes:duration>${duracion}</itunes:duration>`);
      if (episodio.publishedAt) {
        lineas.push(`      <pubDate>${new Date(episodio.publishedAt).toUTCString()}</pubDate>`);
      }

      lineas.push("    </item>");
      return lineas.join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(series.title)}</title>
    <link>${xmlEscape(site)}</link>
    <description>${xmlEscape(series.description)}</description>
    <language>${xmlEscape(series.language)}</language>
    <atom:link href="${xmlEscape(selfUrl)}" rel="self" type="application/rss+xml" />
    <itunes:author>${xmlEscape(series.author)}</itunes:author>
    <itunes:summary>${xmlEscape(series.description)}</itunes:summary>
    <itunes:type>episodic</itunes:type>
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="${xmlEscape(series.category)}" />${imagen ? `\n    <itunes:image href="${xmlEscape(imagen)}" />` : ""}
    <!-- Episodios publicables: ${episodios.length} de ${series.episodes.length}. Los que no tienen audio no se publican. -->
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60"
    }
  });
}
