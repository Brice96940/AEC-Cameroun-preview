(function () {
  /**
   * Diagnostic express — 3 questions, résultat déterministe.
   * État en mémoire uniquement (aucune donnée nominative, aucun réseau).
   */

  const state = { q1: null, q2: null, q3: null };

  const OBJECTIF_LABELS = {
    etudes: "Choisir ou préparer sereinement tes études ou un concours dans les prochains mois.",
    stage: "Trouver un stage ou une première expérience dans les prochains mois.",
    emploi: "Trouver ton premier emploi dans les prochains mois.",
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
    seul: "Tu avances seul.",
    systeme: "Tu veux un système déjà préparé.",
    accompagne: "Tu veux un accompagnement."
  };

  /**
   * Table de règles produit : (q1, q2) -> prochaine action unique.
   * q1 "inconnu" court-circuite q2 (une seule réponse possible).
   */
  const RULES = {
    inconnu: "Commencer par clarifier une cible parmi Études/Concours, Stage/Expérience ou Premier emploi.",
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
   * Retourne la prochaine action pour une combinaison (q1, q2).
   * Ne retourne jamais une chaîne vide/undefined pour une combinaison valide.
   */
  function getAction(q1, q2) {
    if (q1 === "inconnu") return RULES.inconnu;
    const branch = RULES[q1];
    return (branch && branch[q2]) || null;
  }

  /**
   * Auto-vérification de la table de règles, indépendante du DOM :
   * couvre les 20 couples Q1 x Q2 réels (y compris les 5 lignes "inconnu",
   * qui renvoient volontairement le même conseil générique par construction).
   * S'exécute à chaque chargement du script, même sans vue diagnostic présente.
   */
  (function selfCheckRules() {
    const q1Values = ["etudes", "stage", "emploi", "inconnu"];
    const q2Values = ["choix", "info", "profil", "opportunites", "action"];
    let missing = 0;
    q1Values.forEach((q1) => {
      q2Values.forEach((q2) => {
        if (!getAction(q1, q2)) {
          missing++;
          console.error("Diagnostic : action manquante pour", q1, q2);
        }
      });
    });
    const total = q1Values.length * q2Values.length;
    if (missing === 0) {
      console.info("Diagnostic : table de règles complète (" + total + "/" + total + " couples Q1 x Q2 vérifiés).");
    } else {
      console.error("Diagnostic : " + missing + "/" + total + " couples manquants.");
    }
  })();

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
    document.getElementById("diagResultObjectif").textContent = OBJECTIF_LABELS[state.q1] || "";
    document.getElementById("diagResultBlocage").textContent = state.q1 === "inconnu"
      ? "Ta priorité n’est pas encore claire : c’est normal, c’est le point de départ."
      : (BLOCAGE_LABELS[state.q2] || "");
    document.getElementById("diagResultAction").textContent = action;
    document.getElementById("diagResultMode").textContent = MODE_LABELS[state.q3] || "";
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
