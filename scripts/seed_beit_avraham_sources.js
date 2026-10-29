const crypto = require('node:crypto');
const { localWriter } = require('./model_cost_cli');
const { loadEnvironment } = require('./sca_runtime');

loadEnvironment(__dirname + '/..');
const writer = localWriter(process.env.SCA_SUPABASE_URL, process.env.SCA_LOCAL_STACK || 'SCA_Matrix');

/**
 * Genera un vector determinista de 768 dimensiones normalizado L2
 * a partir del texto de entrada, asegurando similitud por coseno consistente.
 * @param {string} text
 * @returns {number[]}
 */
function deterministicEmbedding(text) {
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

  // Normalización L2
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  const result = new Array(dim);
  for (let i = 0; i < dim; i++) result[i] = Number((vec[i] / norm).toFixed(6));
  return result;
}

const HALAJIC_SOURCES = [
  {
    source_file: "Mishná Shabat 7:2",
    content: `Mishná Shabat 7:2 — Las labores principales prohibidas en Shabat son cuarenta menos una (39 melajot):
Sembrar, arar, segar, atar gavillas, trillar, aventar, seleccionar, moler, cerner, amasar y hornear...
Estas labores derivan de los trabajos realizados para la construcción del Tabernáculo (Mishkán). En Shabat nos abstenemos de alterar creativamente la naturaleza para reconocer la Creación Divina.`
  },
  {
    source_file: "Talmud Babli, Shabat 118b",
    content: `Talmud Babli, Shabat 118b — Dijo Rabí Yojanan en nombre de Rabí Shimón bar Yojai:
Si todo el pueblo de Israel guardara dos Shabatot según su ley, inmediatamente serían redimidos.
El Shabat no es una carga de prohibiciones, sino una isla en el tiempo, un santuario de paz, dignidad y encuentro comunitario.`
  },
  {
    source_file: "Shulján Aruj, Oraj Jayim 1:1",
    content: `Shulján Aruj, Oraj Jayim 1:1 — Se fortalecerá como un león al levantarse por la mañana para servir a su Creador.
Inmediatamente al despertar dirá: "Modo aní lefaneja mélej jay vekayam..." (Te agradezco, Rey viviente y eterno, que me has devuelto mi alma con misericordia; grande es Tu fidelidad).
La gratitud precede a cualquier petición.`
  },
  {
    source_file: "Rambam, Mishné Torá, Hiljot Shabat 30:1",
    content: `Rambam, Mishné Torá, Leyes de Shabat 30:1 — Cuatro cosas se dijeron sobre el Shabat: dos de la Torá y dos de los sabios según los profetas.
De la Torá: "Recuerda" (Zajor) y "Guarda" (Shamor).
De los profetas: Honor (Kavod) y Deleite (Oneg).
Kavod implica lavarse, vestirse con ropas limpias y preparar la mesa; Oneg implica disfrutar de comidas sabrosas y descanso sereno del espíritu.`
  },
  {
    source_file: "Hagadá de Pésaj - Maguid",
    content: `Hagadá de Pésaj — En cada generación cada ser humano debe considerarse a sí mismo como si él personalmente hubiese salido de Egipto (Mitzráyim).
No solo a nuestros antepasados redimió el Santo, bendito sea, sino también a nosotros junto con ellos.
Por tanto, estamos obligados a agradecer, alabar, ensalzar y glorificar.`
  },
  {
    source_file: "Pirké Avot 1:14",
    content: `Pirké Avot 1:14 — Hillel solía decir:
Si yo no soy para mí, ¿quién será para mí?
Y si soy solo para mí, ¿qué soy yo?
Y si no es ahora, ¿cuándo?
El estudio de la Torá y la Halajá debe equilibrar la auto-superación personal con la responsabilidad infinita hacia el prójimo.`
  },
  {
    source_file: "Séfer Yetzirá 1:1-2",
    content: `Séfer Yetzirá 1:1-2 — Con treinta y dos senderos misteriosos de sabiduría grabó Yah, Señor de los Ejércitos, Dios vivo y Rey del universo.
Creó Su universo mediante tres libros (Sefer): la escritura (Sofer), el número (Sefar) y el relato (Sipur).
Diez Sefirot de la nada (Bli-má) y veintidós letras de fundamento. Diez Sefirot como el número de los diez dedos, cinco frente a cinco, y el pacto de la unidad dispuesto en el medio.`
  },
  {
    source_file: "Zóhar, Parashat Bereshit 15a",
    content: `Zóhar, Parashat Bereshit 15a — En el comienzo de la voluntad del Rey, una chispa de oscuridad primordial emanó del Infinito (Ein Sof), dentro de lo oculto de lo oculto.
No era ni blanca ni negra, ni roja ni verde, sin color alguno.
Cuando midió con un cordel de medida, produjo colores para iluminar hacia adentro.
Desde el interior del punto más íntimo brotó un manantial del cual se expandieron las diez coronas santas de la revelación divina.`
  }
];

async function seedSources() {
  console.log("🌱 Sembrando corpus halájico de Beit Avraham en fsca.knowledge_base...");

  // Limpiar fuentes previas del proyecto para idempotencia
  await writer.schema('fsca').from('knowledge_base').delete().eq('project_name', 'Beit Avraham');

  let insertedCount = 0;
  for (const src of HALAJIC_SOURCES) {
    const embedding = deterministicEmbedding(src.content);
    const { error } = await writer.schema('fsca').from('knowledge_base').insert({
      project_name: 'Beit Avraham',
      source_file: src.source_file,
      content: src.content,
      embedding
    });

    if (error) {
      console.error(`Error al insertar ${src.source_file}:`, error.message);
    } else {
      insertedCount++;
      console.log(`✅ [${insertedCount}/${HALAJIC_SOURCES.length}] Indexado: ${src.source_file}`);
    }
  }

  console.log(`\n🎉 Semillero completado: ${insertedCount} fuentes indexadas para Beit Avraham.`);
}

module.exports = { deterministicEmbedding, HALAJIC_SOURCES, seedSources };

if (require.main === module) {
  seedSources().catch(err => {
    console.error('Fallo en semillero:', err);
    process.exit(1);
  });
}
