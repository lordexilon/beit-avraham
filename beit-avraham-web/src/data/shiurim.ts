export interface ShiurPassage {
  seconds: number;
  time: string;
  title: string;
  text: string;
  tags?: string[];
}

export interface Shiur {
  id: string;
  title: string;
  topic: string;
  subtitle: string;
  teacher: string;
  duration: string;
  videoUrl?: string;
  sourceType: "embed" | "html5" | "text-only";
  description: string;
  tags: string[];
  passages: ShiurPassage[];
}

export const SHIURIM_CATALOG: Shiur[] = [
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
    id: "kashrut-01",
    title: "Leyes de Kashrut: Carne y Leche según el Talmud y el Zóhar",
    topic: "HALAJÁ & KASHRUT",
    subtitle: "Fundamentos de la alimentación judía, fuentes talmúdicas y su significado espiritual profundo.",
    teacher: "Rabinato Beit Avraham · YPS",
    duration: "32 min",
    videoUrl: "https://www.youtube-nocookie.com/embed/3zSS3yODul4?enablejsapi=1",
    sourceType: "embed",
    description: "Estudio detallado del precepto de no mezclar carne y leche según Éxodo 23:19 y el tratado talmúdico de Julín. La visión del Zóhar sobre el equilibrio entre la energía del juicio y la misericordia.",
    tags: ["Kashrut", "Halajá", "Carne y Leche", "Zóhar", "Julín"],
    passages: [
      {
        seconds: 0,
        time: "00:00",
        title: "El origen bíblico y la prohibición triple",
        text: "La Torá repite tres veces la prohibición: no cocinar, no comer y no obtener beneficio de la mezcla de carne y leche.",
        tags: ["Torá", "Halajá"]
      },
      {
        seconds: 420,
        time: "07:00",
        title: "La dimensión mística del Zóhar",
        text: "La carne representa el aspecto del juicio riguroso (Din) y la leche la misericordia (Jesed). Mezclarlos sin rectificación espiritual genera un desequilibrio cósmico.",
        tags: ["Cábala", "Zóhar"]
      },
      {
        seconds: 960,
        time: "16:00",
        title: "Tiempos de espera y aplicación cotidiana",
        text: "Por qué se esperan seis horas tras comer carne, y las pautas prácticas para salvaguardar la santidad en la mesa judía.",
        tags: ["Práctica", "Costumbres"]
      }
    ]
  },
  {
    id: "tefila-01",
    title: "Tefilá y Gratitud al Despertar: Modo Aní",
    topic: "HALAJÁ & TEFILÁ",
    subtitle: "La primera plegaria del día: reconocer la vida con conciencia y bendición.",
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
      },
      {
        seconds: 120,
        time: "02:00",
        title: "La respiración consciente en la plegaria",
        text: "Reconocer la santidad del aliento y alinear los pensamientos hacia el Creador antes de salir a las ocupaciones del mundo.",
        tags: ["Kavaná"]
      }
    ]
  },
  {
    id: "bereshit-01",
    title: "Parashat Bereshit: El Secreto del Paraíso y la Creación",
    topic: "TORÁ & PENSAMIENTO",
    subtitle: "El relato del Génesis, el jardín del Edén y el libre albedrío del ser humano.",
    teacher: "Rab. Natan Menashe",
    duration: "45 min",
    videoUrl: "https://www.youtube-nocookie.com/embed/ZrYcJ0k-Y2s?enablejsapi=1",
    sourceType: "embed",
    description: "Análisis profundo de Parashat Bereshit: los misterios del primer versículo, la creación del cosmos, el rol de Adán y Java en el Gan Edén y la responsabilidad ética del ser humano.",
    tags: ["Torá", "Bereshit", "Génesis", "Paraíso", "Ética"],
    passages: [
      {
        seconds: 0,
        time: "00:00",
        title: "Bereshit: El misterio de la Creación de la nada",
        text: "Cómo Dios inaugura el tiempo y el espacio con Su palabra creadora, estructurando el orden a partir del caos inicial (Tohu vaVohu).",
        tags: ["Creación", "Bereshit"]
      },
      {
        seconds: 600,
        time: "10:00",
        title: "El Gan Edén y el Árbol del Conocimiento",
        text: "El jardín no era un lugar físico de descanso pasivo, sino un laboratorio de consciencia donde el hombre debía elegir libremente elevar la creación.",
        tags: ["Gan Edén", "Elección"]
      },
      {
        seconds: 1500,
        time: "25:00",
        title: "Tzelem Elokim y la dignidad humana",
        text: "Cada persona porta una chispa del infinito, lo que convierte la fraternidad y el cuidado hacia el prójimo en un deber sagrado absoluto.",
        tags: ["Dignidad", "Humanismo"]
      }
    ]
  },
  {
    id: "avot-01",
    title: "Pirké Avot: Mishna 1 y la Transmisión de la Sabiduría",
    topic: "TORÁ & ÉTICA",
    subtitle: "La cadena viva de la tradición: de Moshé en el Sinaí hasta los hombres de la Gran Asamblea.",
    teacher: "Moré Julio Valdez",
    duration: "35 min",
    videoUrl: "https://www.youtube-nocookie.com/embed/kvszzNO3qCE?enablejsapi=1",
    sourceType: "embed",
    description: "Estudio exhaustivo del primer capítulo de Pirké Avot (Ética de los Padres): la legitimidad de la Torá oral, la responsabilidad de los jueces y el establecimiento de límites protectores para la ley.",
    tags: ["Pirké Avot", "Mishná", "Ética judía", "Tradición"],
    passages: [
      {
        seconds: 0,
        time: "00:00",
        title: "Moshé recibió la Torá en el Sinaí",
        text: "La continuidad ininterrumpida de la enseñanza: cómo la revelación se transmite de generación en generación como un árbol vivo que nunca se seca.",
        tags: ["Sinaí", "Mishná"]
      },
      {
        seconds: 480,
        time: "08:00",
        title: "Sed pacientes en el juicio y levantad muchos discípulos",
        text: "Las tres advertencias de los sabios: no apresurarse a juzgar a los demás, formar estudiantes con dedicación y poner cercos que cuiden los mandamientos.",
        tags: ["Justicia", "Pedagogía"]
      },
      {
        seconds: 1200,
        time: "20:00",
        title: "Hacer un cerco a la Torá: Protección sin extremismo",
        text: "Los decretos rabínicos buscan cuidar el núcleo del mandamiento preservando la cordura y la alegría de la vida comunitaria.",
        tags: ["Sabiduría", "Límites"]
      }
    ]
  },
  {
    id: "cabala-01",
    title: "Las 10 Sefirot y el Árbol de la Vida",
    topic: "CÁBALA & MÍSTICA",
    subtitle: "El mapa espiritual del alma y las emanaciones divinas según la tradición cabalística.",
    teacher: "Beit Midrash Beit Avraham",
    duration: "50 min",
    videoUrl: "https://www.youtube-nocookie.com/embed/L_LUpnjgPso?enablejsapi=1",
    sourceType: "embed",
    description: "Una aproximación rigurosa a la Cábala: el concepto de Ein Sof (Infinito), las diez Sefirot como canales de revelación y el trabajo interior de Tikún (reparación).",
    tags: ["Cábala", "Sefirot", "Árbol de la Vida", "Zóhar"],
    passages: [
      {
        seconds: 0,
        time: "00:00",
        title: "Ein Sof y el anhelo de revelación",
        text: "Antes de cualquier forma existe el Ein Sof. La Cábala enseña que el universo surge por un acto de compasión y autolimitación (Tzimtzum) para permitir la existencia del otro.",
        tags: ["Ein Sof", "Tzimtzum"]
      },
      {
        seconds: 1000,
        time: "16:40",
        title: "Las tres columnas del Árbol: Jesed, Gevurá y Tiféret",
        text: "El amor expansivo necesita del límite riguroso; la síntesis entre ambos engendra la belleza armónica de Tiféret.",
        tags: ["Sefirot", "Equilibrio"]
      },
      {
        seconds: 1930,
        time: "32:10",
        title: "Maljut y el Tikún en el mundo material",
        text: "Maljut es la presencia divina (Shejiná) en la tierra, la receptividad pura que convierte la luz espiritual en acción cotidiana y reparación del mundo.",
        tags: ["Maljut", "Shejiná", "Tikún Olam"]
      }
    ]
  },
  {
    id: "cabala-02",
    title: "Cábala: Las Meditaciones en la Torá y el Pensamiento",
    topic: "CÁBALA & MEDITACIÓN",
    subtitle: "El poder de la intención interior (Kavaná) y las letras hebreas como conductos de luz.",
    teacher: "Kabbalah Mashiah · Albert Gozlan",
    duration: "42 min",
    videoUrl: "https://www.youtube-nocookie.com/embed/KS32kzKfYbc?enablejsapi=1",
    sourceType: "embed",
    description: "Cómo la tradición cabalística enseña a meditar con los textos sagrados y las letras hebreas para pacificar la mente, elevar las emociones y conectar con la fuente de la vida.",
    tags: ["Cábala", "Meditación", "Letras hebreas", "Zóhar"],
    passages: [
      {
        seconds: 0,
        time: "00:00",
        title: "La mente como instrumento de conexión espiritual",
        text: "El pensamiento no es pasivo: crea realidades internas y moldea las emociones del ser humano según la luz que invoque.",
        tags: ["Meditación", "Consciencia"]
      },
      {
        seconds: 780,
        time: "13:00",
        title: "Las letras hebreas como vasijas de energía",
        text: "Cada consonante hebrea es una forma geométrica y un código arquetípico que canaliza aspectos específicos de la sabiduría divina.",
        tags: ["Letras", "Energía"]
      },
      {
        seconds: 1620,
        time: "27:00",
        title: "Teshuvá interior: Retornar a la armonía original",
        text: "La meditación según los cabalistas tiene un único fin: retornar a la unidad con el Creador y generar paz en el entorno.",
        tags: ["Paz", "Tikún"]
      }
    ]
  }
];
