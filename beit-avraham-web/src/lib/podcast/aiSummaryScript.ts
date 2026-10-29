import type { Shiur } from "../../data/shiurim";
import type { PodcastChapter } from "../../data/podcast";

/**
 * 🎙️ Generador de Guiones a Dos Voces para Episodios Resumen con IA
 * Nodo N44 - SCA Sprint 6: Audio y Podcast
 *
 * Transforma el contenido de una clase (shiur, fragmentos y fuentes) en un
 * diálogo formativo entre el Moré (Rabino) y el Talmid (Javrutá).
 * Estructura capítulos temporales y metadatos conformes a iTunes Podcast RSS.
 */

export interface DialogTurn {
  speaker: "rabino" | "javruta";
  name: string;
  text: string;
  estimatedSeconds: number;
}

export interface GeneratedEpisodeScript {
  episodeId: string;
  shiurId: string;
  title: string;
  description: string;
  topic: string;
  teacher: string;
  turns: DialogTurn[];
  chapters: PodcastChapter[];
  totalSeconds: number;
  durationLabel: string;
  fullScriptText: string;
}

function formatMmSs(totalSec: number): string {
  const safe = Math.floor(Math.max(0, totalSec));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Genera el guion estructurado a dos voces a partir del contenido del Shiur.
 */
export function generateTwoVoiceScript(shiur: Shiur): GeneratedEpisodeScript {
  const episodeId = `ep-resumen-${shiur.id}`;
  const passages = shiur.passages || [];

  const turns: DialogTurn[] = [];
  const chapters: PodcastChapter[] = [];
  let currentSec = 0;

  // 1. Capítulo 1: Apertura e Introducción Pedagógica
  chapters.push({
    seconds: currentSec,
    time: formatMmSs(currentSec),
    title: "1. Introducción y la pregunta inicial"
  });

  turns.push({
    speaker: "rabino",
    name: "Rab. Mijael",
    text: `Paz y bendición a todos los estudiantes de Beit Avraham. Hoy nos reunimos en esta Javrutá sonora para resumir y profundizar en la clase: "${shiur.title}".`,
    estimatedSeconds: 10
  });
  currentSec += 10;

  turns.push({
    speaker: "javruta",
    name: "David (Talmid)",
    text: `Shalom, Rabino. Muchos nos preguntamos al estudiar ${shiur.topic.toLowerCase()}: ¿cuál es el sentido íntimo de este mandamiento y por qué la tradición le otorga tanta importancia en la vida cotidiana?`,
    estimatedSeconds: 12
  });
  currentSec += 12;

  // 2. Capítulo 2: Las Fuentes y la Ley
  chapters.push({
    seconds: currentSec,
    time: formatMmSs(currentSec),
    title: "2. Las fuentes en la Torá y la Halajá"
  });

  const passage1 = passages[0]?.text || shiur.description;
  turns.push({
    speaker: "rabino",
    name: "Rab. Mijael",
    text: `Excelente pregunta. En las fuentes tradicionales encontramos que ${passage1} La ley judía no busca imponer una carga externa, sino ordenar nuestra consciencia y afilar nuestra sensibilidad moral.`,
    estimatedSeconds: 16
  });
  currentSec += 16;

  const passage2 = passages[1]?.text || "El encuentro entre los textos y la práctica cotidiana abre una nueva mirada de rectitud.";
  turns.push({
    speaker: "javruta",
    name: "David (Talmid)",
    text: `Entiendo. Y cuando el texto menciona que "${passage2}", ¿cómo lo traducimos a los dilemas y presiones que enfrentamos en nuestro día a día?`,
    estimatedSeconds: 14
  });
  currentSec += 14;

  // 3. Capítulo 3: Aplicación Práctica y Vida Diaria
  chapters.push({
    seconds: currentSec,
    time: formatMmSs(currentSec),
    title: "3. Aplicación práctica y dilemas modernos"
  });

  const passage3 = passages[2]?.text || "Cada detalle de la observancia es una oportunidad para recordar la Creación.";
  turns.push({
    speaker: "rabino",
    name: "Rab. Mijael",
    text: `Precisamente allí radica el corazón del estudio: ${passage3} Cuando actuamos con intención, lo cotidiano se santifica y se convierte en morada para la presencia divina.`,
    estimatedSeconds: 15
  });
  currentSec += 15;

  turns.push({
    speaker: "javruta",
    name: "David (Talmid)",
    text: `Es verdaderamente enriquecedor. Nos ayuda a entender que el estudio en Javrutá no es solo debatir ideas, sino transformar nuestra conducta hacia nosotros mismos y hacia nuestro prójimo.`,
    estimatedSeconds: 12
  });
  currentSec += 12;

  // 4. Capítulo 4: Conclusiones y Bendición de Cierre
  chapters.push({
    seconds: currentSec,
    time: formatMmSs(currentSec),
    title: "4. Conclusiones y reflexión final"
  });

  turns.push({
    speaker: "rabino",
    name: "Rab. Mijael",
    text: `Así es, querido estudiante. Concluyamos recordando que una sola pregunta formulada con sinceridad abre más puertas que muchas respuestas aprendidas de memoria. Que este estudio ilumine tu camino. Shalom u'vrajá.`,
    estimatedSeconds: 15
  });
  currentSec += 15;

  const fullScriptText = turns.map(t => `${t.name}: "${t.text}"`).join("\n\n");
  const durationLabel = `${Math.ceil(currentSec / 60)} min`;

  return {
    episodeId,
    shiurId: shiur.id,
    title: `[Resumen IA] ${shiur.title}`,
    description: `Resumen formativo a dos voces generado por IA sobre la clase "${shiur.title}". Diálogo en Javrutá entre el Rabino y un estudiante analizando los principios fundamentales de ${shiur.topic}.`,
    topic: shiur.topic,
    teacher: `Rabinato Beit Avraham & Javrutá IA`,
    turns,
    chapters,
    totalSeconds: currentSec,
    durationLabel,
    fullScriptText
  };
}
