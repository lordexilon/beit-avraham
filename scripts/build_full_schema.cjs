const fs = require('fs');
const crypto = require('crypto');

function generateEmbedding(text) {
  const dim = 768;
  const vec = new Float64Array(dim);
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const hash = crypto.createHash('sha256').update(words[i]).digest();
    for (let j = 0; j < 32; j++) {
      const idx = (hash[j] * 31 + j * 7) % dim;
      vec[idx] += (hash[j] - 128) / 128;
    }
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  const result = new Array(dim);
  for (let i = 0; i < dim; i++) result[i] = Number((vec[i] / norm).toFixed(6));
  return result;
}

const kbItems = [
  {
    source_file: 'mishna-shabat-7-2.md',
    content: 'Mishná Shabat 7:2 — Las labores principales prohibidas en Shabat son cuarenta menos una (39 melajot): Sembrar, arar, segar, atar gavillas, trillar, aventar, seleccionar, moler, cerner, amasar y hornear... Estas labores derivan de los trabajos realizados para la construcción del Tabernáculo (Mishkán). En Shabat nos abstenemos de alterar creativamente la naturaleza para reconocer la Creación Divina.'
  },
  {
    source_file: 'talmud-shabat-118b.md',
    content: 'Talmud Babli, Shabat 118b — Dijo Rabí Yojanan en nombre de Rabí Shimón bar Yojai: Si todo el pueblo de Israel guardara dos Shabatot según su ley, inmediatamente serían redimidos. El Shabat no es una carga de prohibiciones, sino una isla en el tiempo, un santuario de paz, dignidad y encuentro comunitario.'
  },
  {
    source_file: 'shuljan-aruj-oj-1-1.md',
    content: 'Shulján Aruj, Oraj Jayim 1:1 — Se fortalecerá como un león al levantarse por la mañana para servir a su Creador. Inmediatamente al despertar dirá: Modo aní lefaneja mélej jay vekayam... (Te agradezco, Rey viviente y eterno, que me has devuelto mi alma con misericordia; grande es Tu fidelidad). La gratitud precede a cualquier petición.'
  },
  {
    source_file: 'rambam-shabat-30-1.md',
    content: 'Rambam, Mishné Torá, Leyes de Shabat 30:1 — Cuatro cosas se dijeron sobre el Shabat: dos de la Torá y dos de los sabios según los profetas. De la Torá: Recuerda (Zajor) y Guarda (Shamor). De los profetas: Honor (Kavod) y Deleite (Oneg).'
  },
  {
    source_file: 'pirkei-avot-1-1.md',
    content: 'Pirké Avot 1:1 — Moshé recibió la Torá en el Sinaí y la transmitió a Yehoshúa, Yehoshúa a los ancianos, los ancianos a los profetas, y los profetas la transmitieron a los hombres de la Gran Asamblea. Ellos dijeron tres cosas: Sean prudentes en el juicio, formen muchos discípulos y hagan un cerco a la Torá.'
  },
  {
    source_file: 'pirkei-avot-1-14.md',
    content: 'Pirké Avot 1:14 — Hillel solía decir: Si yo no soy para mí, ¿quién será para mí? Y cuando soy para mí mismo, ¿qué soy? Y si no es ahora, ¿cuándo? El equilibrio entre la dignidad individual y la responsabilidad hacia la comunidad.'
  },
  {
    source_file: 'zohar-bereshit-sefirot.md',
    content: 'Zohar Bereshit — Las Diez Sefirot son los canales de la luz infinita (Ein Sof): Kéter (Corona), Jojmá (Sabiduría), Biná (Entendimiento), Jésed (Bondad amorosa), Guevurá (Fuerza/Rigor), Tiféret (Armonía/Belleza), Nétzaj (Victoria/Eternidad), Hod (Esplendor), Yesod (Fundamento) y Maljut (Reino). Cada una refleja un atributo divino en el alma y el cosmos.'
  },
  {
    source_file: 'bereshit-1-1-rashi.md',
    content: 'Bereshit 1:1 — En el principio creó Dios los cielos y la tierra. Comenta Rashi: No comenzó la Torá con este versículo sino para revelar que toda la tierra pertenece al Santo, Bendito Sea; Él la creó y la da a quien es recto ante Sus ojos.'
  }
];

const kbInserts = kbItems.map(item => {
  const emb = JSON.stringify(generateEmbedding(item.content));
  const safeContent = item.content.split("'").join("''");
  const safeSource = item.source_file.split("'").join("''");
  return `INSERT INTO fsca.knowledge_base (project_name, source_file, content, embedding, metadata)
VALUES ('beit-avraham', '${safeSource}', '${safeContent}', '${emb}'::vector, '{"era": "clasica"}'::jsonb);`;
}).join('\n\n');

const currentSchema = fs.readFileSync('supabase_cloud_schema.sql', 'utf8');

// Agregar sección de sembrado del corpus si no existe
let updatedSchema = currentSchema;
if (!updatedSchema.includes('Sembrado Inicial del Corpus RAG')) {
  updatedSchema += `\n\n-- -----------------------------------------------------------------------------
-- 13. Sembrado Inicial del Corpus RAG (knowledge_base)
-- -----------------------------------------------------------------------------
${kbInserts}

SELECT count(*) as total_documentos_corpus FROM fsca.knowledge_base;\n`;
}

fs.writeFileSync('supabase_cloud_schema.sql', updatedSchema);
console.log('supabase_cloud_schema.sql successfully updated with knowledge_base seeds!');
