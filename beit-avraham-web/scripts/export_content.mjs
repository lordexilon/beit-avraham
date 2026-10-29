#!/usr/bin/env node
/**
 * Exporta el contenido editorial de Matrix (fsca.content_items) a los .ts que
 * consume la app.
 *
 * Por qué existe: Matrix es la fuente de verdad editable, pero git necesita un
 * histórico legible y el sitio necesita un fallback si la base no responde.
 * Este script cierra ese círculo: Matrix -> archivos.
 *
 * Uso:
 *   node scripts/export_content.mjs                 # escribe los .ts
 *   node scripts/export_content.mjs --dry-run       # sólo muestra el resumen
 *
 * No usa dependencias: lee .env.local y habla con PostgREST por fetch.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT = "Beit Avraham";

function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

async function fetchItems(kind) {
  const url = process.env.SCA_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SCA_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Falta SCA_SUPABASE_URL o la clave en .env.local.");

  const query = new URLSearchParams({
    select: "slug,payload",
    project_name: `eq.${PROJECT}`,
    kind: `eq.${kind}`,
    order: "slug.asc"
  });

  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/content_items?${query}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Accept-Profile": "fsca"
    },
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) throw new Error(`Matrix respondió ${response.status} al pedir ${kind}.`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Respuesta inesperada de Matrix.");
  return rows.map(row => row.payload);
}

/** Reescribe sólo el arreglo, preservando interfaces y comentarios del encabezado. */
function renderFile(headerSource, marker, typeName, items) {
  const index = headerSource.indexOf(marker);
  if (index === -1) throw new Error(`No se encontró "${marker}" en el archivo destino.`);
  const header = headerSource.slice(0, index);
  const body = JSON.stringify(items, null, 2);
  return `${header}${marker}${typeName}[] = ${body};\n`;
}

async function main() {
  loadEnv();
  const dryRun = process.argv.includes("--dry-run");

  const [shiurim, fuentes] = await Promise.all([fetchItems("shiur"), fetchItems("fuente")]);

  if (shiurim.length === 0 || fuentes.length === 0) {
    throw new Error(`Matrix devolvió ${shiurim.length} shiurim y ${fuentes.length} fuentes; no se sobrescribe nada con un export vacío.`);
  }

  const targets = [
    { file: "src/data/shiurim.ts", marker: "export const SHIURIM_CATALOG: ", typeName: "Shiur", items: shiurim },
    { file: "src/data/sources.ts", marker: "export const HALAJIC_SOURCES_CATALOG: ", typeName: "HalajicSourceItem", items: fuentes }
  ];

  for (const target of targets) {
    const full = path.join(ROOT, target.file);
    const current = fs.readFileSync(full, "utf8");
    const next = renderFile(current, target.marker, target.typeName, target.items);
    if (dryRun) {
      console.log(`${target.file}: ${target.items.length} registros (dry-run, sin escribir)`);
      continue;
    }
    fs.writeFileSync(full, next, "utf8");
    console.log(`${target.file}: ${target.items.length} registros exportados`);
  }
}

main().catch(error => {
  console.error("Export falló: " + error.message);
  process.exit(1);
});
