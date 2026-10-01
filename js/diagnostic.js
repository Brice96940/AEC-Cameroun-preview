(function () {
  /**
   * Diagnostic express — 3 questions, résultat déterministe.
   * État en mémoire uniquement (aucune donnée nominative, aucun réseau).
   */

  const state = { q1: null, q2: null, q3: null };

  const OBJECTIF_LABELS = {
    etudes: "Choisir ou préparer sereinement tes études ou un concours dans les 30 à 90 prochains jours.",
    stage: "Trouver un stage ou une première expérience dans les 30 à 90 prochains jours.",
    emploi: "Trouver ton premier emploi dans les 30 à 90 prochains jours.",
    inconnu: "Clarifier d’abord une cible précise avant d’avancer."
  };

  const BLOCAGE_LABELS = {
    choix: "Tu ne sais pas encore quoi choisir.",
    info: "Tu ne sais pas où trouver une information fiable.",
    profil: "Tu ne sais pas comment présenter ton profil, tes preuves ou ton CV.",
    opportunites: "Tu ne trouves pas d’opportunités adaptées.",
    action: "Tu ne sais pas quelle action faire maintenant."
  };

  const MODE_LABELS = {
    seul: "Autonome — tu peux commencer avec l’action proposée et les ressources gratuites.",
    systeme: "Système préparé — un parcours structuré pourra t’aider à exécuter les étapes.",
    accompagne: "Accompagnement — un suivi humain pourra être proposé après le diagnostic."
  };

  /**
   * Nom de parcours affiché (contrat de sortie).
   */
  const PARCOURS_LABELS = {
    etudes: "Études / concours",
    stage: "Stage / première expérience",
    emploi: "Premier emploi",
    inconnu: "Clarification préalable"
  };

  /**
   * Catégorie de source à vérifier : une par parcours (pas par blocage).
   * Aucune URL n'est inventée à ce stade (traité dans le slice Sources officielles).
   */
  const SOURCE_LABELS = {
    etudes: "Source officielle de l’établissement, du concours ou de l’organisme concerné.",
    stage: "Source officielle de l’entreprise, de l’organisme ou de l’offre concernée.",
    emploi: "Source officielle de l’employeur ou de l’offre concernée.",
    inconnu: "Pas de source externe requise à ce stade."
  };

  /**
   * Décalage (en jours) de l'échéance AEC proposée, calculée côté client
   * à partir du jour du diagnostic. Ce n'est jamais une échéance officielle.
   */
  const ECHEANCE_DAYS = {
    etudes: 7,
    stage: 7,
    emploi: 7,
    inconnu: 3
  };

  /**
   * Table de règles produit : (q1, q2) -> prochaine action unique.
   * q1 "inconnu" court-circuite q2 (une seule réponse possible, pas de
   * recommandation métier artificielle construite à partir de q2).
   */
  const RULES = {
    inconnu: "Note les 2 résultats que tu aimerais le plus obtenir dans les 90 prochains jours, puis choisis celui qui aurait le plus d’impact concret.",
    etudes: {
      choix: "Comparer 2 à 3 options avec conditions d’accès, calendrier, coût et source officielle.",
      info: "Vérifier la prochaine information déterminante auprès de la source officielle concernée.",
      profil: "Lister les documents ou résultats déjà disponibles pour construire un dossier de candidature crédible.",
      opportunites: "Identifier 2 à 3 établissements ou concours correspondant réellement à ton niveau et à tes résultats.",
      action: "Choisir une seule option d’études ou de concours à approfondir cette semaine, plutôt que d’en explorer dix en parallèle."
    },
    stage: {
      choix: "Choisir un seul secteur ou type de stage à viser plutôt que de rester sur plusieurs pistes en même temps.",
      info: "Identifier une source fiable (établissement, entreprise, programme officiel) pour confirmer les conditions du stage visé.",
      profil: "Identifier une expérience/projet concret à transformer en preuve dans ton CV ou dossier.",
      opportunites: "Définir 3 cibles de stage réalistes et commencer par une première candidature adaptée.",
      action: "Envoyer une seule candidature de stage ciblée cette semaine pour sortir de l’attente."
    },
    emploi: {
      choix: "Choisir un seul métier cible à viser en priorité plutôt que plusieurs pistes vagues.",
      info: "Identifier une source fiable (employeur, plateforme officielle) pour confirmer les conditions de l’offre visée.",
      profil: "Choisir un métier cible puis adapter ton CV aux preuves réellement disponibles.",
      opportunites: "Choisir un métier cible et identifier 3 employeurs ou offres cohérents avant de candidater.",
      action: "Postuler à une seule offre ciblée cette semaine plutôt que d’attendre d’être parfaitement prêt."
    }
  };

  /**
   * Élément/preuve à préparer : (q1, q2) -> texte unique.
   * q1 "inconnu" court-circuite q2 (même logique que RULES).
   */
  const PREUVE = {
    inconnu: "Deux options concrètes à comparer.",
    etudes: {
      choix: "Une liste courte de 2 à 3 options à comparer",
      info: "Les conditions, dates, coûts et pièces demandées",
      profil: "Les diplômes, relevés ou pièces utiles au dossier",
      opportunites: "Une liste courte d’établissements, concours ou programmes pertinents",
      action: "Une première démarche concrète à réaliser"
    },
    stage: {
      choix: "Une cible d’expérience ou de mission à tester",
      info: "Les conditions et attentes de la structure ciblée",
      profil: "Un CV ou une preuve concrète de compétence/projet",
      opportunites: "Une liste courte de structures ou offres adaptées",
      action: "Une première candidature ou prise de contact"
    },
    emploi: {
      choix: "Une cible métier ou fonction prioritaire",
      info: "Les exigences réelles des offres ciblées",
      profil: "Un CV adapté et les preuves pertinentes de compétences",
      opportunites: "Une liste courte d’offres ou employeurs pertinents",
      action: "Une première candidature ciblée et traçable"
    }
  };

  /**
   * Lit une table structurée comme RULES/PREUVE : q1 "inconnu" court-circuite q2.
   */
  function readTable(table, q1, q2) {
    if (q1 === "inconnu") return table.inconnu;
    const branch = table[q1];
    return (branch && branch[q2]) || null;
  }

  function getAction(q1, q2) {
    return readTable(RULES, q1, q2);
  }

  function getPreuve(q1, q2) {
    return readTable(PREUVE, q1, q2);
  }

  /**
   * Échéance AEC proposée : jour du diagnostic + N jours selon le parcours,
   * calculée côté client, jamais envoyée, jamais stockée. Format FR lisible.
   */
  function getEcheance(q1) {
    const days = ECHEANCE_DAYS[q1];
    if (typeof days !== "number") return null;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date);
  }

  /**
   * Export de la logique métier pure pour les tests Node (tests/diagnostic.test.js).
   * N'a aucun effet dans le navigateur : `module` n'y existe pas, ce bloc est ignoré.
   * Ne contient jamais le reste (DOM, état, écouteurs) : la logique métier pure
   * est la seule partie testée hors navigateur.
   */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      OBJECTIF_LABELS,
      BLOCAGE_LABELS,
      MODE_LABELS,
      PARCOURS_LABELS,
      SOURCE_LABELS,
      ECHEANCE_DAYS,
      RULES,
      PREUVE,
      getAction,
      getPreuve,
      getEcheance
    };
  }

  const stepsEl = {
    1: document.getElementById("diagStep1"),
    2: document.getElementById("diagStep2"),
    3: document.getElementById("diagStep3"),
    result: document.getElementById("diagStepResult")
  };
  const progressDots = document.querySelectorAll("#diagProgress .diag-dot");
  const card = document.getElementById("diagCard");

  if (!card) return; // vue diagnostic absente (sécurité, ne casse rien ailleurs)

  function showStep(step) {
    Object.keys(stepsEl).forEach((key) => {
      if (stepsEl[key]) stepsEl[key].hidden = String(key) !== String(step);
    });

    progressDots.forEach((dot) => {
      const dotStep = Number(dot.getAttribute("data-dot"));
      dot.classList.toggle("done", typeof step === "number" ? dotStep < step : true);
      dot.classList.toggle("current", dotStep === step);
    });

    if (card) card.scrollIntoView({ block: "nearest" });
  }

  function selectOption(btn) {
    const q = btn.getAttribute("data-q");
    const v = btn.getAttribute("data-v");
    state[q] = v;

    document.querySelectorAll('.diag-opt[data-q="' + q + '"]').forEach((opt) => {
      const selected = opt === btn;
      opt.classList.toggle("selected", selected);
      opt.setAttribute("aria-pressed", selected ? "true" : "false");
    });

    const step = btn.closest(".diag-step");
    const nextBtn = step && step.querySelector(".diag-next");
    if (nextBtn) nextBtn.disabled = false;
  }

  function renderResult() {
    const action = getAction(state.q1, state.q2) || "Clarifier ta situation puis revenir faire le diagnostic.";
    const preuve = getPreuve(state.q1, state.q2) || "À préciser selon ta situation.";

    document.getElementById("diagResultParcours").textContent = PARCOURS_LABELS[state.q1] || "";
    document.getElementById("diagResultObjectif").textContent = OBJECTIF_LABELS[state.q1] || "";
    document.getElementById("diagResultBlocage").textContent = state.q1 === "inconnu"
      ? "Ta priorité n’est pas encore claire : c’est normal, c’est le point de départ."
      : (BLOCAGE_LABELS[state.q2] || "");
    document.getElementById("diagResultAction").textContent = action;
    document.getElementById("diagResultEcheance").textContent = getEcheance(state.q1) || "";
    document.getElementById("diagResultPreuve").textContent = preuve;
    document.getElementById("diagResultSource").textContent = SOURCE_LABELS[state.q1] || "";
    document.getElementById("diagResultMode").textContent = MODE_LABELS[state.q3] || "";

    const heading = document.getElementById("diagResultHeading");
    if (heading) heading.focus();
  }

  function restart() {
    state.q1 = null;
    state.q2 = null;
    state.q3 = null;
    document.querySelectorAll(".diag-opt").forEach((opt) => {
      opt.classList.remove("selected");
      opt.setAttribute("aria-pressed", "false");
    });
    document.querySelectorAll(".diag-next").forEach((btn) => {
      btn.disabled = true;
    });
    showStep(1);
  }

  card.addEventListener("click", function (event) {
    const opt = event.target.closest(".diag-opt");
    if (opt) {
      selectOption(opt);
      return;
    }

    const next = event.target.closest(".diag-next");
    if (next && !next.disabled) {
      const target = next.getAttribute("data-next");
      if (target === "result") {
        renderResult();
        showStep("result");
      } else {
        showStep(Number(target));
      }
      return;
    }

    const back = event.target.closest(".diag-back");
    if (back) {
      showStep(Number(back.getAttribute("data-back")));
      return;
    }

    if (event.target.closest(".diag-restart")) {
      restart();
    }
  });

  showStep(1);
})();
