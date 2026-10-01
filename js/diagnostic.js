(function () {
  /**
   * Diagnostic express — 3 questions, résultat déterministe.
   * État en mémoire uniquement (aucune donnée nominative, aucun réseau).
   */

  const state = { q1: null, q2: null, q3: null, level2: null };

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
   * Spécifications du Niveau 2 (précision conditionnelle).
   * Déclenché uniquement pour Q1 in {etudes,stage,emploi} et Q2 != "action".
   * Jamais pour Q1 = "inconnu", jamais pour Q2 = "action".
   */
  const LEVEL2_SPECS = {
    etudes: {
      choix: {
        id: "etudes_choix_situation",
        question: "Où en es-tu aujourd’hui dans ton parcours ?",
        options: [
          { value: "bac_prep", label: "Je prépare encore le bac" },
          { value: "bac_obtenu", label: "J’ai le bac" },
          { value: "superieur", label: "Je suis déjà dans le supérieur" },
          { value: "autre", label: "Autre situation / je préfère ne pas préciser" }
        ]
      },
      info: {
        id: "etudes_info_priorite",
        question: "Quelle information dois-tu vérifier en priorité ?",
        options: [
          { value: "acces", label: "Conditions d’accès" },
          { value: "calendrier", label: "Calendrier / dates" },
          { value: "cout", label: "Coût" },
          { value: "pieces", label: "Pièces ou documents demandés" },
          { value: "autre", label: "Autre information" }
        ]
      },
      profil: {
        id: "etudes_profil_dispo",
        question: "Quel élément de dossier as-tu déjà disponible ?",
        options: [
          { value: "diplome", label: "Diplôme ou relevés" },
          { value: "cv", label: "CV" },
          { value: "attestation", label: "Attestation ou preuve d’expérience" },
          { value: "plusieurs", label: "Plusieurs de ces éléments" },
          { value: "aucun", label: "Aucun pour l’instant" }
        ]
      },
      opportunites: {
        id: "etudes_opp_cible",
        question: "As-tu déjà identifié une option concrète à vérifier ?",
        options: [
          { value: "etablissement", label: "Oui, un établissement" },
          { value: "concours", label: "Oui, un concours" },
          { value: "programme", label: "Oui, un programme" },
          { value: "non", label: "Non, pas encore" }
        ]
      }
    },
    stage: {
      choix: {
        id: "stage_choix_cible",
        question: "As-tu déjà une cible d’expérience en tête ?",
        options: [
          { value: "secteur", label: "Oui, un secteur" },
          { value: "mission", label: "Oui, un type de mission" },
          { value: "structure", label: "Oui, une structure" },
          { value: "non", label: "Non, pas encore" }
        ]
      },
      info: {
        id: "stage_info_priorite",
        question: "Quelle information dois-tu vérifier en priorité ?",
        options: [
          { value: "conditions", label: "Conditions pour candidater" },
          { value: "duree", label: "Durée / période" },
          { value: "lieu", label: "Lieu ou modalité" },
          { value: "pieces", label: "Pièces demandées" },
          { value: "autre", label: "Autre information" }
        ]
      },
      profil: {
        id: "stage_profil_preuve",
        question: "As-tu déjà une preuve concrète de compétence ou de projet ?",
        options: [
          { value: "oui", label: "Oui" },
          { value: "a_structurer", label: "J’ai quelque chose mais il faut le structurer" },
          { value: "non", label: "Non" },
          { value: "incertain", label: "Je ne sais pas encore" }
        ]
      },
      opportunites: {
        id: "stage_opp_cible",
        question: "As-tu déjà une structure ou une offre précise à examiner ?",
        options: [
          { value: "offre", label: "Oui, une offre" },
          { value: "structure", label: "Oui, une entreprise ou organisation" },
          { value: "plusieurs", label: "Plusieurs pistes" },
          { value: "non", label: "Non, aucune piste précise" }
        ]
      }
    },
    emploi: {
      choix: {
        id: "emploi_choix_cible",
        question: "As-tu déjà un métier ou une fonction cible ?",
        options: [
          { value: "precise", label: "Oui, une cible précise" },
          { value: "hesite", label: "J’hésite entre 2 ou 3 cibles" },
          { value: "non", label: "Non, pas encore" }
        ]
      },
      info: {
        id: "emploi_info_priorite",
        question: "Quelle information dois-tu vérifier en priorité ?",
        options: [
          { value: "missions", label: "Missions du poste" },
          { value: "competences", label: "Compétences demandées" },
          { value: "conditions", label: "Conditions / localisation" },
          { value: "processus", label: "Processus de candidature" },
          { value: "autre", label: "Autre information" }
        ]
      },
      profil: {
        id: "emploi_profil_cv",
        question: "Où en es-tu avec ton CV et tes preuves ?",
        options: [
          { value: "cv_pret", label: "CV à jour + preuves disponibles" },
          { value: "cv_a_renforcer", label: "CV à jour mais preuves à renforcer" },
          { value: "cv_a_retravailler", label: "CV à retravailler" },
          { value: "pas_de_cv", label: "Je n’ai pas encore de CV exploitable" }
        ]
      },
      opportunites: {
        id: "emploi_opp_cible",
        question: "As-tu déjà une cible concrète à examiner ?",
        options: [
          { value: "offre", label: "Oui, une offre" },
          { value: "employeur", label: "Oui, un employeur" },
          { value: "plusieurs", label: "Plusieurs pistes" },
          { value: "non", label: "Non, aucune cible précise" }
        ]
      }
    }
  };

  /**
   * Retourne la spec Niveau 2 pour (q1, q2), ou null si aucune précision
   * supplémentaire n'est nécessaire (q1="inconnu" ou q2="action" ou
   * combinaison non prévue).
   */
  function getLevel2Spec(q1, q2) {
    if (q1 === "inconnu" || q2 === "action") return null;
    const branch = LEVEL2_SPECS[q1];
    return (branch && branch[q2]) || null;
  }

  /**
   * Adaptations déterministes de l'action/preuve selon la réponse Niveau 2.
   * Ne touche jamais parcours/objectif/blocage/mode/source.
   */
  const LEVEL2_ADAPT = {
    etudes: {
      choix: {
        bac_prep: { action: "Comparer 2 à 3 options accessibles après le bac, en fonction de la filière envisagée, avec conditions d’accès et calendrier.", preuve: "Une liste courte de 2 à 3 options accessibles après le bac à comparer" },
        bac_obtenu: { action: "Comparer 2 à 3 options déjà accessibles avec ton bac en main, selon conditions d’accès, calendrier et coût.", preuve: "Une liste courte de 2 à 3 options accessibles avec ton bac à comparer" },
        superieur: { action: "Comparer 2 à 3 options de poursuite ou de réorientation cohérentes avec ton parcours actuel dans le supérieur.", preuve: "Une liste courte de 2 à 3 options de poursuite dans le supérieur à comparer" },
        autre: { action: "Comparer 2 à 3 options générales avec conditions d’accès, calendrier, coût et source officielle, sans présupposer ton niveau actuel.", preuve: "Une liste courte de 2 à 3 options à comparer, indépendamment de ta situation actuelle" }
      },
      info: {
        acces: { action: "Vérifier précisément les conditions d’accès (niveau requis, prérequis, sélection) auprès de la source officielle concernée.", preuve: "Les conditions d’accès exactes (niveau requis, prérequis, sélection)" },
        calendrier: { action: "Identifier la date officielle déterminante avant de préparer le reste du dossier.", preuve: "Le calendrier officiel (dates d’ouverture, de clôture et de résultats)" },
        cout: { action: "Vérifier précisément le coût total (frais de dossier, scolarité, matériel) auprès de la source officielle concernée.", preuve: "Le détail des coûts réels (frais de dossier, scolarité, matériel)" },
        pieces: { action: "Lister précisément les pièces ou documents demandés avant la date limite de dépôt.", preuve: "La liste exacte des pièces ou documents demandés" },
        autre: { action: "Identifier clairement quelle information te manque encore, puis la vérifier auprès de la source officielle concernée.", preuve: "L’information précise qui te manque encore" }
      },
      profil: {
        diplome: { action: "Rassembler ton diplôme et tes relevés de notes pour constituer la base de ton dossier.", preuve: "Ton diplôme et tes relevés de notes rassemblés" },
        cv: { action: "Adapter ton CV existant pour qu’il corresponde aux attentes du dossier visé.", preuve: "Ton CV adapté aux attentes du dossier visé" },
        attestation: { action: "Rassembler tes attestations ou preuves d’expérience pour renforcer ton dossier.", preuve: "Tes attestations ou preuves d’expérience rassemblées" },
        plusieurs: { action: "Organiser les différents éléments déjà disponibles dans un dossier unique et cohérent.", preuve: "Un dossier organisé regroupant les éléments déjà disponibles" },
        aucun: { action: "Identifier les 2 ou 3 premiers documents à obtenir en priorité pour commencer ton dossier.", preuve: "Les 2 ou 3 premiers documents à obtenir en priorité" }
      },
      opportunites: {
        etablissement: { action: "Vérifier en détail les conditions et le calendrier de l’établissement déjà identifié avant de confirmer ton choix.", preuve: "Les conditions et le calendrier de l’établissement déjà identifié" },
        concours: { action: "Vérifier en détail le programme, le calendrier et les conditions du concours déjà identifié.", preuve: "Le programme, le calendrier et les conditions du concours déjà identifié" },
        programme: { action: "Vérifier en détail les conditions et le calendrier du programme déjà identifié avant de confirmer ton choix.", preuve: "Les conditions et le calendrier du programme déjà identifié" },
        non: { action: "Partir d’une recherche large puis réduire à 2 à 3 établissements, concours ou programmes correspondant réellement à ton niveau.", preuve: "Une liste large de pistes réduite à 2 ou 3 options sérieuses" }
      }
    },
    stage: {
      choix: {
        secteur: { action: "Affiner ton secteur déjà identifié vers 2 ou 3 types de missions concrets à viser.", preuve: "2 à 3 types de missions concrets dans le secteur déjà identifié" },
        mission: { action: "Identifier 2 à 3 structures proposant réellement ce type de mission.", preuve: "2 à 3 structures proposant ce type de mission" },
        structure: { action: "Vérifier si la structure déjà identifiée propose réellement une expérience correspondant à ton objectif.", preuve: "Les offres ou contacts réels de la structure déjà identifiée" },
        non: { action: "Choisir un seul secteur ou type de mission à tester en priorité plutôt que de rester sur plusieurs pistes vagues.", preuve: "Un secteur ou type de mission unique choisi comme point de départ" }
      },
      info: {
        conditions: { action: "Vérifier précisément les conditions pour candidater (niveau requis, convention, disponibilité) auprès de la structure visée.", preuve: "Les conditions exactes pour candidater" },
        duree: { action: "Vérifier précisément la durée et la période proposées avant d’organiser ta candidature.", preuve: "La durée et la période exactes du stage" },
        lieu: { action: "Vérifier précisément le lieu ou la modalité (présentiel/distanciel) avant de candidater.", preuve: "Le lieu ou la modalité exacts du stage" },
        pieces: { action: "Lister précisément les pièces demandées avant d’envoyer ta candidature.", preuve: "La liste exacte des pièces demandées" },
        autre: { action: "Identifier clairement quelle information te manque encore avant de candidater.", preuve: "L’information précise qui te manque encore" }
      },
      profil: {
        oui: { action: "Mettre en valeur cette preuve concrète dans ton CV ou ton dossier de candidature.", preuve: "Ta preuve concrète déjà disponible, mise en valeur dans ton CV" },
        a_structurer: { action: "Structurer clairement cette expérience existante pour qu’elle devienne une preuve présentable.", preuve: "Ton expérience existante reformulée en preuve présentable" },
        non: { action: "Identifier une activité récente (projet, aide, initiative) à transformer en première preuve concrète.", preuve: "Une activité récente transformée en première preuve concrète" },
        incertain: { action: "Repérer dans ton parcours récent un exemple concret, même modeste, pouvant servir de preuve.", preuve: "Un exemple concret et modeste de ton parcours récent" }
      },
      opportunites: {
        offre: { action: "Vérifier en détail les conditions de l’offre déjà identifiée avant de candidater.", preuve: "Les conditions détaillées de l’offre déjà identifiée" },
        structure: { action: "Vérifier si la structure déjà identifiée propose actuellement une offre de stage adaptée.", preuve: "Les offres actuelles de la structure déjà identifiée" },
        plusieurs: { action: "Comparer tes différentes pistes avec les mêmes critères avant de choisir où candidater en premier.", preuve: "Tes différentes pistes comparées selon les mêmes critères" },
        non: { action: "Définir 3 cibles de stage réalistes à partir de ton secteur ou de ta zone géographique.", preuve: "3 cibles de stage réalistes identifiées" }
      }
    },
    emploi: {
      choix: {
        precise: { action: "Vérifier que les offres existantes correspondent réellement à la cible métier déjà choisie avant de candidater.", preuve: "Les offres réelles correspondant à ta cible métier déjà choisie" },
        hesite: { action: "Comparer tes 2 ou 3 cibles avec les mêmes critères : missions, compétences demandées et preuves déjà disponibles.", preuve: "Tes 2 ou 3 cibles comparées selon les mêmes critères" },
        non: { action: "Choisir un seul métier cible à tester en priorité, à partir de tes compétences ou expériences existantes.", preuve: "Un métier cible unique choisi comme point de départ" }
      },
      info: {
        missions: { action: "Vérifier précisément les missions réelles du poste avant d’adapter ta candidature.", preuve: "Les missions exactes du poste visé" },
        competences: { action: "Vérifier précisément les compétences demandées pour adapter tes preuves en conséquence.", preuve: "Les compétences exactes demandées par l’offre" },
        conditions: { action: "Vérifier précisément les conditions et la localisation avant de confirmer ta candidature.", preuve: "Les conditions et la localisation exactes de l’offre" },
        processus: { action: "Vérifier précisément les étapes du processus de candidature avant de postuler.", preuve: "Les étapes exactes du processus de candidature" },
        autre: { action: "Identifier clairement quelle information te manque encore avant de postuler.", preuve: "L’information précise qui te manque encore" }
      },
      profil: {
        cv_pret: { action: "Cibler directement 2 ou 3 offres correspondant à ton CV et tes preuves déjà prêtes.", preuve: "Ton CV et tes preuves déjà prêtes, prêts à être envoyés" },
        cv_a_renforcer: { action: "Garder ton CV actuel et sélectionner 2 à 3 preuves concrètes de compétences à relier au métier cible.", preuve: "2 à 3 réalisations, projets ou expériences qui démontrent les compétences attendues" },
        cv_a_retravailler: { action: "Retravailler ton CV pour qu’il corresponde clairement au métier cible avant de candidater.", preuve: "Un CV retravaillé et aligné sur le métier cible" },
        pas_de_cv: { action: "Construire une première version simple de CV à partir de ton expérience réelle, même limitée.", preuve: "Une première version simple de CV construite" }
      },
      opportunites: {
        offre: { action: "Vérifier en détail les conditions de l’offre déjà identifiée avant de candidater.", preuve: "Les conditions détaillées de l’offre déjà identifiée" },
        employeur: { action: "Vérifier si l’employeur déjà identifié propose actuellement une offre correspondant à ta cible.", preuve: "Les offres actuelles de l’employeur déjà identifié" },
        plusieurs: { action: "Comparer tes différentes pistes avec les mêmes critères avant de choisir où candidater en premier.", preuve: "Tes différentes pistes comparées selon les mêmes critères" },
        non: { action: "Identifier 3 employeurs ou offres cohérents avec ta cible avant de candidater.", preuve: "3 employeurs ou offres cohérents identifiés" }
      }
    }
  };

  /**
   * Applique la réponse Niveau 2 à un résultat déjà calculé : ajuste
   * uniquement action/preuve. Ne modifie jamais parcours/objectif/
   * blocage/mode/source. Retourne un nouvel objet (ne mute pas `result`).
   */
  function applyLevel2(result, q1, q2, level2Value) {
    const branch = LEVEL2_ADAPT[q1] && LEVEL2_ADAPT[q1][q2];
    const adapt = branch && branch[level2Value];
    if (!adapt) return result;
    return Object.assign({}, result, {
      action: adapt.action,
      preuve: adapt.preuve,
      precision: true
    });
  }

  /**
   * Une réponse Niveau 2 déjà donnée doit être effacée dès que Q1 ou Q2
   * change réellement de valeur (nouveau parcours ou nouveau blocage) :
   * aucune réponse obsolète ne doit contaminer le résultat.
   */
  function level2ShouldClear(question, oldValue, newValue) {
    return (question === "q1" || question === "q2") && oldValue !== newValue;
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
      getEcheance,
      LEVEL2_SPECS,
      LEVEL2_ADAPT,
      getLevel2Spec,
      applyLevel2,
      level2ShouldClear
    };
  }

  const stepsEl = {
    1: document.getElementById("diagStep1"),
    2: document.getElementById("diagStep2"),
    3: document.getElementById("diagStep3"),
    4: document.getElementById("diagStep4"),
    result: document.getElementById("diagStepResult")
  };
  const progressEl = document.getElementById("diagProgress");
  const level2QuestionEl = document.getElementById("diagLevel2Question");
  const level2OptionsEl = document.getElementById("diagLevel2Options");
  const card = document.getElementById("diagCard");

  if (!card) return; // vue diagnostic absente (sécurité, ne casse rien ailleurs)

  /**
   * Nombre total d'étapes (3, ou 4 si le Niveau 2 s'applique à Q1/Q2
   * déjà répondus). Ne peut être déterminé qu'une fois Q1 et Q2 connus.
   */
  function computeTotalSteps() {
    return state.q1 && state.q2 && getLevel2Spec(state.q1, state.q2) ? 4 : 3;
  }

  function updateStepLabels() {
    const total = computeTotalSteps();
    [1, 2, 3].forEach((n) => {
      const el = stepsEl[n] && stepsEl[n].querySelector(".diag-stepnum");
      if (el) el.textContent = "Question " + n + " / " + total;
    });
  }

  function renderProgress(step) {
    if (!progressEl) return;
    const total = computeTotalSteps();
    progressEl.innerHTML = "";
    for (let n = 1; n <= total; n++) {
      const dot = document.createElement("span");
      dot.className = "diag-dot";
      if (typeof step === "number") {
        if (n < step) dot.classList.add("done");
        if (n === step) dot.classList.add("current");
      } else {
        dot.classList.add("done");
      }
      progressEl.appendChild(dot);
    }
  }

  function showStep(step) {
    Object.keys(stepsEl).forEach((key) => {
      if (stepsEl[key]) stepsEl[key].hidden = String(key) !== String(step);
    });

    updateStepLabels();
    renderProgress(step);

    if (card) card.scrollIntoView({ block: "nearest" });
  }

  function renderLevel2Step(spec) {
    if (level2QuestionEl) level2QuestionEl.textContent = spec.question;
    if (level2OptionsEl) {
      level2OptionsEl.innerHTML = "";
      spec.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "diag-opt";
        btn.setAttribute("data-q", "level2");
        btn.setAttribute("data-v", opt.value);
        btn.setAttribute("aria-pressed", state.level2 === opt.value ? "true" : "false");
        if (state.level2 === opt.value) btn.classList.add("selected");
        btn.textContent = opt.label;
        level2OptionsEl.appendChild(btn);
      });
    }
    const step4 = stepsEl[4];
    const nextBtn = step4 && step4.querySelector(".diag-next");
    if (nextBtn) nextBtn.disabled = !state.level2;
    const heading = step4 && step4.querySelector(".diag-stepnum");
    if (heading) heading.focus();
  }

  function selectOption(btn) {
    const q = btn.getAttribute("data-q");
    const v = btn.getAttribute("data-v");

    if (level2ShouldClear(q, state[q], v)) {
      state.level2 = null;
    }

    state[q] = v;

    document.querySelectorAll('.diag-opt[data-q="' + q + '"]').forEach((opt) => {
      const selected = opt === btn;
      opt.classList.toggle("selected", selected);
      opt.setAttribute("aria-pressed", selected ? "true" : "false");
    });

    const step = btn.closest(".diag-step");
    const nextBtn = step && step.querySelector(".diag-next");
    if (nextBtn) nextBtn.disabled = false;

    if (q === "q1" || q === "q2") updateStepLabels();
  }

  function renderResult() {
    const spec = getLevel2Spec(state.q1, state.q2);
    let result = {
      parcours: PARCOURS_LABELS[state.q1] || "",
      objectif: OBJECTIF_LABELS[state.q1] || "",
      blocage: state.q1 === "inconnu"
        ? "Ta priorité n’est pas encore claire : c’est normal, c’est le point de départ."
        : (BLOCAGE_LABELS[state.q2] || ""),
      action: getAction(state.q1, state.q2) || "Clarifier ta situation puis revenir faire le diagnostic.",
      echeance: getEcheance(state.q1) || "",
      preuve: getPreuve(state.q1, state.q2) || "À préciser selon ta situation.",
      source: SOURCE_LABELS[state.q1] || "",
      mode: MODE_LABELS[state.q3] || "",
      precision: false
    };

    if (spec && state.level2) {
      result = applyLevel2(result, state.q1, state.q2, state.level2);
    }

    document.getElementById("diagResultParcours").textContent = result.parcours;
    document.getElementById("diagResultObjectif").textContent = result.objectif;
    document.getElementById("diagResultBlocage").textContent = result.blocage;
    document.getElementById("diagResultAction").textContent = result.action;
    document.getElementById("diagResultEcheance").textContent = result.echeance;
    document.getElementById("diagResultPreuve").textContent = result.preuve;
    document.getElementById("diagResultSource").textContent = result.source;
    document.getElementById("diagResultMode").textContent = result.mode;

    const precisionEl = document.getElementById("diagResultPrecision");
    if (precisionEl) precisionEl.hidden = !result.precision;

    const heading = document.getElementById("diagResultHeading");
    if (heading) heading.focus();
  }

  function restart() {
    state.q1 = null;
    state.q2 = null;
    state.q3 = null;
    state.level2 = null;
    document.querySelectorAll(".diag-opt").forEach((opt) => {
      opt.classList.remove("selected");
      opt.setAttribute("aria-pressed", "false");
    });
    document.querySelectorAll(".diag-next").forEach((btn) => {
      btn.disabled = true;
    });
    if (level2OptionsEl) level2OptionsEl.innerHTML = "";
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
      const currentStepEl = next.closest(".diag-step");
      const currentStep = currentStepEl && currentStepEl.getAttribute("data-step");

      if (target === "result") {
        if (currentStep === "3") {
          const spec = getLevel2Spec(state.q1, state.q2);
          if (spec) {
            renderLevel2Step(spec);
            showStep(4);
            return;
          }
        }
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
