export interface HalajicSourceItem {
  id: string;
  source: string;
  category: string;
  summary: string;
  content: string;
  hebrewRef?: string;
  era: string;
}

export const HALAJIC_SOURCES_CATALOG: HalajicSourceItem[] = [
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
    summary: "Los cuatro pilares del Shabat: Zajor, Shamor, Kavod (Honor) y Oneg (Deleite).",
    content: `Rambam, Mishné Torá, Leyes de Shabat 30:1 — Cuatro cosas se dijeron sobre el Shabat: dos de la Torá y dos de los sabios según los profetas.
De la Torá: "Recuerda" (Zajor) y "Guarda" (Shamor).
De los profetas: Honor (Kavod) y Deleite (Oneg).
Kavod implica lavarse, vestirse con ropas limpias y preparar la mesa; Oneg implica disfrutar de comidas sabrosas y descanso sereno del espíritu.`
  },
  {
    id: "hagada-pesaj-maguid",
    source: "Hagadá de Pésaj - Maguid",
    category: "Liturgia y Tradición",
    era: "Clásica",
    hebrewRef: "הגדה של פסח - מגיד",
    summary: "La vivencia personal del éxodo de Egipto: de la esclavitud a la libertad espiritual.",
    content: `Hagadá de Pésaj — En cada generación cada ser humano debe considerarse a sí mismo como si él personalmente hubiese salido de Egipto (Mitzráyim).
No solo a nuestros antepasados redimió el Santo, bendito sea, sino también a nosotros junto con ellos.
Por tanto, estamos obligados a agradecer, alabar, ensalzar y glorificar.`
  },
  {
    id: "pirke-avot-1-14",
    source: "Pirké Avot 1:14",
    category: "Ética de los Sabios",
    era: "Tanaíta (Hillel)",
    hebrewRef: "פרקי אבות א:יד",
    summary: "El aforismo de Hillel: equilibrio entre auto-realización personal y compromiso con el prójimo.",
    content: `Pirké Avot 1:14 — Hillel solía decir:
Si yo no soy para mí, ¿quién será para mí?
Y si soy solo para mí, ¿qué soy yo?
Y si no es ahora, ¿cuándo?
El estudio de la Torá y la Halajá debe equilibrar la auto-superación personal con la responsabilidad infinita hacia el prójimo.`
  },
  {
    id: "sefer-yetzira-1-1",
    source: "Séfer Yetzirá 1:1-2",
    category: "Mística Fundacional / Cábala",
    era: "Antigüedad Clásica",
    hebrewRef: "ספר יצירה א:א-ב",
    summary: "Los 32 senderos de sabiduría, las 10 Sefirot de la nada (Bli-má) y las 22 letras constitutivas.",
    content: `Séfer Yetzirá 1:1-2 — Con treinta y dos senderos misteriosos de sabiduría grabó Yah, Señor de los Ejércitos, Dios vivo y Rey del universo.
Creó Su universo mediante tres libros (Sefer): la escritura (Sofer), el número (Sefar) y el relato (Sipur).
Diez Sefirot de la nada (Bli-má) y veintidós letras de fundamento. Diez Sefirot como el número de los diez dedos, cinco frente a cinco, y el pacto de la unidad dispuesto en el medio.`
  },
  {
    id: "zohar-bereshit-15a",
    source: "Zóhar, Parashat Bereshit 15a",
    category: "Mística Mayor / Cábala",
    era: "Tradición Rabí Shimón bar Yojai (c. siglo XIII)",
    hebrewRef: "זהר פרשת בראשית טו:א",
    summary: "La chispa primordial oculta en el Ein Sof y la emanación de las diez luces sagradas.",
    content: `Zóhar, Parashat Bereshit 15a — En el comienzo de la voluntad del Rey, una chispa de oscuridad primordial emanó del Infinito (Ein Sof), dentro de lo oculto de lo oculto.
No era ni blanca ni negra, ni roja ni verde, sin color alguno.
Cuando midió con un cordel de medida, produjo colores para iluminar hacia adentro.
Desde el interior del punto más íntimo brotó un manantial del cual se expandieron las diez coronas santas de la revelación divina.`
  }
];

