/**
 * Tests de non-régression pour la logique métier du diagnostic express.
 *
 * N'est JAMAIS chargé par le site public (index.html ne référence pas ce
 * fichier). Se lance uniquement avec Node :
 *
 *   node tests/diagnostic.test.js
 *
 * Stubbe un DOM minimal pour pouvoir `require()` js/diagnostic.js sans
 * navigateur : le fichier source exporte sa logique métier pure via
 * `module.exports` (inerte dans un vrai navigateur), puis continue vers
 * son code DOM qui se neutralise de lui-même (`if (!card) return;`).
 */

global.document = {
  getElementById: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};
global.window = {};

const path = require("path");
const M = require(path.join(__dirname, "..", "js", "diagnostic.js"));

const Q1 = ["etudes", "stage", "emploi", "inconnu"];
const Q2 = ["choix", "info", "profil", "opportunites", "action"];
const Q3 = ["seul", "systeme", "accompagne"];

let failures = 0;

function check(label, condition) {
  if (!condition) {
    failures++;
    console.error("FAIL:", label);
  }
}

function fullResult(q1, q2, q3) {
  return {
    parcours: M.PARCOURS_LABELS[q1],
    objectif: M.OBJECTIF_LABELS[q1],
    blocage: q1 === "inconnu" ? "(texte dédié inconnu, géré hors table)" : M.BLOCAGE_LABELS[q2],
    action: M.getAction(q1, q2),
    echeance: M.getEcheance(q1),
    preuve: M.getPreuve(q1, q2),
    source: M.SOURCE_LABELS[q1],
    mode: M.MODE_LABELS[q3]
  };
}

// --- A. Q1 x Q2 (20 couples) : champs obligatoires non vides ---
let passA = 0;
Q1.forEach((q1) => Q2.forEach((q2) => {
  const r = fullResult(q1, q2, "seul");
  const ok = !!(r.parcours && r.objectif && r.blocage && r.action && r.echeance && r.preuve && r.source);
  check("Q1xQ2 " + q1 + "/" + q2, ok);
  if (ok) passA++;
}));
console.log("Q1 x Q2 : " + passA + "/20 PASS");

// --- B. Q3 (3 valeurs) : mode d'aide valide ---
let passB = 0;
Q3.forEach((q3) => {
  const ok = !!M.MODE_LABELS[q3];
  check("Q3 " + q3, ok);
  if (ok) passB++;
});
console.log("Q3 : " + passB + "/3 PASS");

// --- C. Matrice complète Q1 x Q2 x Q3 (60) ---
let passC = 0, totalC = 0;
Q1.forEach((q1) => Q2.forEach((q2) => Q3.forEach((q3) => {
  totalC++;
  const r = fullResult(q1, q2, q3);
  const ok = !!(r.parcours && r.objectif && r.blocage && r.action && r.echeance && r.preuve && r.source && r.mode);
  check("E2E " + q1 + "/" + q2 + "/" + q3, ok);
  if (ok) passC++;
})));
console.log("Q1 x Q2 x Q3 : " + passC + "/" + totalC + " PASS");

// --- D. Cas "inconnu" x 5 blocages : même conseil générique, pas de fuite métier ---
let passD = 0;
Q2.forEach((q2) => {
  const r = fullResult("inconnu", q2, "seul");
  const ok = r.parcours === "Clarification préalable"
    && r.action === M.RULES.inconnu
    && r.preuve === M.PREUVE.inconnu
    && r.source === M.SOURCE_LABELS.inconnu;
  check("inconnu x " + q2, ok);
  if (ok) passD++;
});
console.log('Cas "inconnu" : ' + passD + "/5 PASS");

// --- E. Séparation stricte des 4 parcours (pas de fuite croisée) ---
let passE = 0;
const separationChecks = [
  ["etudes distinct", M.PARCOURS_LABELS.etudes !== M.PARCOURS_LABELS.emploi && M.PARCOURS_LABELS.etudes !== M.PARCOURS_LABELS.stage],
  ["stage distinct", M.PARCOURS_LABELS.stage !== M.PARCOURS_LABELS.etudes && M.PARCOURS_LABELS.stage !== M.PARCOURS_LABELS.emploi],
  ["emploi distinct", M.PARCOURS_LABELS.emploi !== M.PARCOURS_LABELS.etudes && M.PARCOURS_LABELS.emploi !== M.PARCOURS_LABELS.stage],
  ["inconnu = Clarification préalable", M.PARCOURS_LABELS.inconnu === "Clarification préalable"]
];
separationChecks.forEach(([label, ok]) => {
  check("separation " + label, ok);
  if (ok) passE++;
});
console.log("Séparation parcours : " + passE + "/" + separationChecks.length + " PASS");

// --- F. Échéances : décalage et format corrects ---
let passF = 0;
Q1.forEach((q1) => {
  const expectedDays = M.ECHEANCE_DAYS[q1];
  const d = new Date();
  d.setDate(d.getDate() + expectedDays);
  const expected = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
  const ok = M.getEcheance(q1) === expected;
  check("echeance " + q1, ok);
  if (ok) passF++;
});
console.log("Échéances : " + passF + "/4 PASS");

console.log("");
if (failures === 0) {
  console.log("TOUS LES TESTS PASSENT.");
  process.exit(0);
} else {
  console.error(failures + " ÉCHEC(S).");
  process.exit(1);
}
