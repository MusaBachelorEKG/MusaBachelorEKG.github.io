// Integrierte Falldaten (statt Upload)
// Fünf feste EKG-Fälle ohne Wochenaufteilung
window.EMBEDDED_CASES = [
  {
    id: "fall_1",
    title: "EKG Fall 1",

    intro: "Aufnahme eines Patienten mit Palpitationen.",

    images: ["bilder/w1_f1.png"],
    options: [
      "Sinusrhythmus ohne pathologische Auffälligkeiten",
      "Vorhofflimmern mit unregelmäßigem Grundrhythmus",
      "Junktionaler Rhythmus",
      "AV-Block Grad II (Mobitz Typ I)",
    ],
    correct: "B",
    solution: "Unregelmäßige RR-Abstände und fehlende P-Wellen sprechen für Vorhofflimmern.",
  },
  {
    id: "fall_2",
    title: "EKG Fall 2",
    intro: "Patient mit Brustschmerz unter Belastung.",
    images: ["bilder/w1_f2.png"],
    options: [
      "Normales EKG",
      "ST-Hebung anterolateral",
      "ST-Senkung inferolateral",
      "Linksschenkelblock",
    ],
    correct: "B",
    solution: "Deutliche ST-Hebungen in den anterolateralen Ableitungen.",
  },
  {
    id: "fall_3",
    title: "EKG Fall 3",
    intro: "Synkope unklarer Genese.",
    images: ["bilder/w1_f3.png"],
    options: [
      "Ventrikuläre Tachykardie",
      "Supraventrikuläre Tachykardie",
      "Bradykardes Vorhofflimmern",
      "Sinusarrhythmie",
    ],
    correct: "A",
    solution: "Breite QRS-Komplexe mit Monomorphie sprechen für eine ventrikuläre Tachykardie.",
  },
  {
    id: "fall_4",
    title: "EKG Fall 4",
    intro: "Dyspnoe bei bekannter Herzinsuffizienz.",
    images: ["bilder/w2_f1.png"],
    options: [
      "Linksschenkelblock",
      "Rechtsschenkelblock",
      "Normales EKG",
      "Vorhofflattern",
    ],
    correct: "B",
    solution: "Rsr'-Muster in V1/V2 mit verbreitertem QRS deutet auf einen Rechtsschenkelblock.",
  },
  {
    id: "fall_5",
    title: "EKG Fall 5",
    intro: "Schwindelattacken im Alltag.",
    images: ["bilder/w2_f2.png"],
    options: [
      "AV-Block Grad I",
      "AV-Block Grad II, Mobitz Typ I",
      "AV-Block Grad II, Mobitz Typ II",
      "AV-Block Grad III",
    ],
    correct: "B",
    solution: "Progressive PQ-Verlängerung mit anschließender Dropped Beat: Mobitz Typ I.",
  }
];
