/**
 * 🌱 Sembrador Idempotente de Contenido Editorial (fsca.content_items)
 * Nodo N46 - SCA Sprint 7: ABM de Contenido
 */

const path = require('node:path');
const { localWriter } = require('./model_cost_cli');
const { loadEnvironment } = require('./sca_runtime');
const { CANONICAL_SOURCES } = require('./reindex_knowledge_base');

const root = path.resolve(__dirname, '..');
loadEnvironment(root);

const SHIURIM = [
  {
    id: "shabat-01",
    title: "¿De dónde proviene el mandamiento de cumplir con el Shabat?",
    topic: "HALAJÁ & SHABAT",
    subtitle: "Introducción al curso de Shabat: fuentes de la Torá, las preguntas y el sentido sagrado del día.",
    teacher: "Rabinato Beit Avraham",
    duration: "45 min",
    videoUrl: "https://www.youtube-nocookie.com/embed/MvF15g_3Fek?enablejsapi=1",
    sourceType: "embed",
    description: "Una exploración de los fundamentos del mandamiento de Shabat desde la perspectiva bíblica y talmúdica, y su vivencia cotidiana en comunidad.",
    tags: ["Shabat", "Fuentes clásicas", "Mandamientos", "Estudio en español"],
    passages: [
      {
        seconds: 0,
        time: "00:00",
        title: "Una pregunta para comenzar",
        text: "¿Qué hace que un día sea distinto a los demás? En este espacio, cada clase será una invitación a detenernos, escuchar y estudiar juntos.",
        tags: ["Introducción"]
      },
      {
        seconds: 45,
        time: "00:45",
        title: "Aprender desde las fuentes",
        text: "Estudiar Shabat nos invita a explorar los textos, comprender su contexto y formular nuevas preguntas. El encuentro entre una clase y sus fuentes abre un camino de aprendizaje.",
        tags: ["Shabat", "Fuentes"]
      },
      {
        seconds: 90,
        time: "01:30",
        title: "El valor de la conversación",
        text: "La Javrutá es un compañero de estudio: una oportunidad para preguntar, contrastar ideas y volver al texto con una mirada más atenta.",
        tags: ["Javrutá"]
      }
    ]
  },
  {
    id: "berajot-01",
    title: "La fuerza de la primera palabra: Gratitud al despertar",
    topic: "PLEGARIA & CONCIENCIA",
    subtitle: "El Modo Aní y el despertar judío: cómo la bendición transforma la cotidianidad.",
    teacher: "Rabinato Beit Avraham",
    duration: "38 min",
    videoUrl: "https://www.youtube-nocookie.com/embed/7X8II6J-6mU?enablejsapi=1",
    sourceType: "embed",
    description: "La primera plegaria del día no pide nada: agradece. Reflexión sobre la gratitud como postura ante la existencia según el Talmud y el Shulján Aruj.",
    tags: ["Tefilá", "Gratitud", "Modo Aní", "Bendiciones"],
    passages: [
      {
        seconds: 0,
        time: "00:00",
        title: "Despertar y reconocer",
        text: "Antes de cualquier solicitud, la tradición sitúa el agradecimiento. El Modo Aní nos recuerda que el alma devuelta es una muestra de confianza divina.",
        tags: ["Gratitud", "Inicio"]
      },
      {
        seconds: 60,
        time: "01:00",
        title: "Como un león por la mañana",
        text: "El Shulján Aruj abre con la imagen de fortalecerse como un león. No se trata de fuerza física, sino de decisión interior para servir con alegría.",
        tags: ["Halajá", "Actitud"]
      }
    ]
  },
  {
    id: "pesaj-01",
    title: "De la servidumbre a la libertad interior: Filosofía de Pésaj",
    topic: "FIESTAS & CICLO JUDÍO",
    subtitle: "El relato del Éxodo (Hagadá) como proceso pedagógico de liberación perpetua.",
    teacher: "Rabinato Beit Avraham",
    duration: "52 min",
    videoUrl: "https://www.youtube-nocookie.com/embed/kJQP7kiw5Fk?enablejsapi=1",
    sourceType: "embed",
    description: "En cada generación, el deber es sentirse saliendo de Egipto. Análisis de las cuatro preguntas y la estructura del Séder.",
    tags: ["Pésaj", "Libertad", "Hagadá", "Mitzráyim"],
    passages: [
      {
        seconds: 0,
        time: "00:00",
        title: "La noche de las preguntas",
        text: "El Séder es ante todo una lección de pedagogía activa: los niños preguntan, los adultos responden, la mesa se convierte en aula viva.",
        tags: ["Pedagogía", "Preguntas"]
      },
      {
        seconds: 75,
        time: "01:15",
        title: "En cada generación",
        text: "No conmemoramos un hecho del pasado remoto; reactualizamos la salida de nuestras propias limitaciones personales.",
        tags: ["Memoria viva"]
      }
    ]
  },
  {
    id: "cabala-01",
    title: "Las 10 Sefirot y el Árbol de la Vida: Introducción a la Mística Judía",
    topic: "CÁBALA & PENSAMIENTO",
    subtitle: "Emanación, equilibrio y el mapa del alma según el Zóhar y el Séfer Yetzirá.",
    teacher: "Rabinato Beit Avraham",
    duration: "60 min",
    sourceType: "text-only",
    description: "Un recorrido introductorio y riguroso por la estructura del Árbol de la Vida (Etz Jayim). Exploramos cómo las diez Sefirot describen la revelación divina desde el Infinito (Ein Sof) y el trabajo ético interior de Tikún Olam.",
    tags: ["Cábala", "Zóhar", "Sefirot", "Mística", "Tikún Olam"],
    passages: [
      {
        seconds: 0,
        time: "00:00",
        title: "Más allá de las palabras: El Infinito (Ein Sof)",
        text: "La mística judía comienza donde el lenguaje se detiene. Antes de toda forma existe Ein Sof, la Luz Infinita incognoscible, que en su infinito amor decide emanar y hacer lugar para la existencia.",
        tags: ["Ein Sof", "Fundamento"]
      },
      {
        seconds: 50,
        time: "00:50",
        title: "Las 10 Sefirot: Luces, vasijas y atributos",
        text: "Diez dimensiones de la nada (Bli-má). Las tres superiores conectan con el pensamiento puro, y las siete inferiores con la acción, el amor y la justicia.",
        tags: ["Sefirot", "Emanación"]
      },
      {
        seconds: 100,
        time: "01:40",
        title: "Tikún Olam: La reparación y la ética cotidiana",
        text: "El propósito de la Cábala nunca es la abstracción teórica desapegada. El Séfer Yetzirá y el Zóhar nos enseñan que cada ser humano es socio del Creador para unificar el cielo y la tierra.",
        tags: ["Tikún Olam", "Ética"]
      }
    ]
  }
];

const FUENTES = [
  {
    id: "mishna-shabat-7-2",
    source: "Mishná Shabat 7:2",
    category: "Mishná / Halajá",
    era: "Tanaíta (c. 200 EC)",
    hebrewRef: "משנה שבת ז:ב",
    summary: "Las 39 labores principales (Melajot) prohibidas en Shabat y su relación con el Mishkán.",
    content: `Mishná Shabat 7:2 — Las labores principales prohibidas en Shabat son cuarenta menos una (39 melajot):
Sembrar, arar, segar, atar gavillas, trillar, aventar, seleccionar, moler, cerner, amasar y hornear...
Estas labores derivan de los trabajos realizados para la construcción del Tabernáculo (Mishkán). En Shabat nos abstenemos de alterar creativamente la naturaleza para reconocer la Creación Divina.`
  },
  {
    id: "talmud-shabat-118b",
    source: "Talmud Babli, Shabat 118b",
    category: "Guemará / Agadá",
    era: "Amoraíta (c. 500 EC)",
    hebrewRef: "תלמוד בבלי שבת קיח:ב",
    summary: "El valor cósmico del Shabat como santuario en el tiempo y redención comunitaria.",
    content: `Talmud Babli, Shabat 118b — Dijo Rabí Yojanan en nombre de Rabí Shimón bar Yojai:
Si todo el pueblo de Israel guardara dos Shabatot según su ley, inmediatamente serían redimidos.
El Shabat no es una carga de prohibiciones, sino una isla en el tiempo, un santuario de paz, dignidad y encuentro comunitario.`
  },
  {
    id: "shuljan-aruj-oh-1-1",
    source: "Shulján Aruj, Oraj Jayim 1:1",
    category: "Código Halájico",
    era: "Ajaronim (Rabí Yosef Karo, 1565 EC)",
    hebrewRef: "שולחן ערוך אורח חיים א:א",
    summary: "El despertar matutino, la fuerza del león y la plegaria de gratitud Modo Aní.",
    content: `Shulján Aruj, Oraj Jayim 1:1 — Se fortalecerá como un león al levantarse por la mañana para servir a su Creador.
Inmediatamente al despertar dirá: "Modo aní lefaneja mélej jay vekayam..." (Te agradezco, Rey viviente y eterno, que me has devuelto mi alma con misericordia; grande es Tu fidelidad).
La gratitud precede a cualquier petición.`
  },
  {
    id: "rambam-shabat-30-1",
    source: "Rambam, Mishné Torá, Hiljot Shabat 30:1",
    category: "Codificación / Filosofía",
    era: "Rishonim (Maimónides, c. 1180 EC)",
    hebrewRef: "רמב\"ם משנה תורה הלכות שבת ל:א",
    summary: "Los cuatro pilares de Shabat: Zajor, Shamor, Kavod y Oneg.",
    content: `Rambam, Mishné Torá, Leyes de Shabat 30:1 — Cuatro cosas se dijeron sobre el Shabat: dos de la Torá y dos de los sabios según los profetas.
De la Torá: "Recuerda" (Zajor) y "Guarda" (Shamor).
De los profetas: Honor (Kavod) y Deleite (Oneg).
Kavod implica lavarse, vestirse con ropas limpias y preparar la mesa; Oneg implica disfrutar de comidas sabrosas y descanso sereno del espíritu.`
  },
  {
    id: "pesaj-maguid",
    source: "Hagadá de Pésaj - Maguid",
    category: "Liturgia / Tradición",
    era: "Geonim / Época Clásica",
    hebrewRef: "הגדה של פסח - מגיד",
    summary: "El deber pedagógico de sentirse saliendo personalmente de Egipto en cada generación.",
    content: `Hagadá de Pésaj — En cada generación cada ser humano debe considerarse a sí mismo como si él personalmente hubiese salido de Egipto (Mitzráyim).
No solo a nuestros antepasados redimió el Santo, bendito sea, sino también a nosotros junto con ellos.
Por tanto, estamos obligados a agradecer, alabar, ensalzar y glorificar.`
  },
  {
    id: "avot-1-14",
    source: "Pirké Avot 1:14",
    category: "Mishná / Ética",
    era: "Tanaíta (Hillel el Anciano, c. 30 AEC)",
    hebrewRef: "משנה אבות א:יד",
    summary: "El equilibrio entre auto-realización personal y responsabilidad comunitaria.",
    content: `Pirké Avot 1:14 — Hillel solía decir:
Si yo no soy para mí, ¿quién será para mí?
Y si soy solo para mí, ¿qué soy yo?
Y si no es ahora, ¿cuándo?
El estudio de la Torá y la Halajá debe equilibrar la auto-superación personal con la responsabilidad infinita hacia el prójimo.`
  },
  {
    id: "sefer-yetzira-1-1",
    source: "Séfer Yetzirá 1:1-2",
    category: "Cábala / Mística Temprana",
    era: "Mística Tardoantigua (Atribuido a Abraham / Rabí Akiva)",
    hebrewRef: "ספר יצירה א:א-ב",
    summary: "Los 32 senderos de sabiduría, las diez Sefirot de la nada y las 22 letras fundamentales.",
    content: `Séfer Yetzirá 1:1-2 — Con treinta y dos senderos misteriosos de sabiduría grabó Yah, Señor de los Ejércitos, Dios vivo y Rey del universo.
Creó Su universo mediante tres libros (Sefer): la escritura (Sofer), el número (Sefar) y el relato (Sipur).
Diez Sefirot de la nada (Bli-má) y veintidós letras de fundamento. Diez Sefirot como el número de los diez dedos, cinco frente a cinco, y el pacto de la unidad dispuesto en el medio.`
  },
  {
    id: "zohar-bereshit-15a",
    source: "Zóhar, Parashat Bereshit 15a",
    category: "Cábala / Comentario Místico",
    era: "Mística Medieval (Rabí Shimón bar Yojai / Moshe de León, c. 1280 EC)",
    hebrewRef: "זוהר בראשית טו:א",
    summary: "La chispa primordial de oscuridad (Butzina deKardinuta) y la emanación de las diez coronas.",
    content: `Zóhar, Parashat Bereshit 15a — En el comienzo de la voluntad del Rey, una chispa de oscuridad primordial emanó del Infinito (Ein Sof), dentro de lo oculto de lo oculto.
No era ni blanca ni negra, ni roja ni verde, sin color alguno.
Cuando midió con un cordel de medida, produjo colores para iluminar hacia adentro.
Desde el interior del punto más íntimo brotó un manantial del cual se expandieron las diez coronas santas de la revelación divina.`
  }
];

async function seedContentItems() {
  console.log("🌱 Sembrando contenido editorial en fsca.content_items...");
  const writer = localWriter(process.env.SCA_SUPABASE_URL, process.env.SCA_LOCAL_STACK || 'SCA_Matrix');

  let insertedCount = 0;

  // 1. Sembrar Shiurim
  for (const shiur of SHIURIM) {
    const { error } = await writer.schema('fsca').from('content_items').upsert({
      project_name: "Beit Avraham",
      kind: "shiur",
      slug: shiur.id,
      payload: shiur
    }, { onConflict: 'project_name,kind,slug' });

    if (error) {
      console.error(`❌ Error al sembrar shiur ${shiur.id}:`, error.message);
    } else {
      insertedCount++;
      console.log(`   📚 Shiur sembrado: ${shiur.id}`);
    }
  }

  // 2. Sembrar Fuentes Halájicas
  for (const fuente of FUENTES) {
    const { error } = await writer.schema('fsca').from('content_items').upsert({
      project_name: "Beit Avraham",
      kind: "fuente",
      slug: fuente.id,
      payload: fuente
    }, { onConflict: 'project_name,kind,slug' });

    if (error) {
      console.error(`❌ Error al sembrar fuente ${fuente.id}:`, error.message);
    } else {
      insertedCount++;
      console.log(`   📜 Fuente sembrada: ${fuente.id}`);
    }
  }

  console.log(`✨ Total registros sembrados idempotentemente: ${insertedCount}`);
  return insertedCount;
}

if (require.main === module) {
  seedContentItems().catch(e => {
    console.error(e.message);
    process.exitCode = 1;
  });
}

module.exports = { seedContentItems, SHIURIM, FUENTES };
