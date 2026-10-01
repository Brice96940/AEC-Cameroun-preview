const L = window.AEC_CONFIG || {};
(function () {
      /**
       * Liste des vues disponibles dans la SPA.
       * @type {string[]}
       */
      const VIEWS = [
        "accueil",
        "diagnostic",
        "ressources",
        "ateliers",
        "opportunites",
        "impact",
        "apropos",
        "rejoindre",
        "proposer"
      ];

      /**
       * Affiche une vue et masque les autres.
       *
       * @param {string} name
       */
      function showView(name) {
        const safeName = VIEWS.includes(name) ? name : "accueil";

        VIEWS.forEach((viewName) => {
          const el = document.getElementById("view-" + viewName);
          if (el) {
            el.classList.toggle("active", viewName === safeName);
          }
        });

        document.querySelectorAll("[data-nav]").forEach((link) => {
          link.classList.toggle("active", link.getAttribute("data-nav") === safeName);
        });

        const panel = document.getElementById("menuPanel");
        const btn = document.getElementById("menuBtn");

        if (panel) panel.classList.remove("open");
        if (btn) btn.setAttribute("aria-expanded", "false");

        const more = document.getElementById("morePanel");
        const moreBtn = document.getElementById("moreBtn");

        if (more) more.classList.remove("open");
        if (moreBtn) moreBtn.setAttribute("aria-expanded", "false");

        window.scrollTo({ top: 0, behavior: "auto" });

        if (typeof gtag !== "undefined") {
          gtag("event", "page_view", {
            page_title: "AEC Cameroun — " + safeName,
            page_location: location.href
          });
        }
      }

      /**
       * Lit le hash et route vers la bonne vue.
       */
      function route() {
        const hash = (location.hash || "").trim();
        const match = hash.match(/^#\/([a-z-]+)/i);
        showView(match ? match[1].toLowerCase() : "accueil");
      }

      window.addEventListener("hashchange", route);
      document.addEventListener("DOMContentLoaded", route);

      /* --------------------------------
         MENU MOBILE
      -------------------------------- */
      const menuBtn = document.getElementById("menuBtn");
      const menuPanel = document.getElementById("menuPanel");

      if (menuBtn && menuPanel) {
        menuBtn.addEventListener("click", function () {
          const isOpen = menuPanel.classList.toggle("open");
          menuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
          track("menu_mobile_toggle");
        });
      }

      /* --------------------------------
         DESKTOP "PLUS" (accès secondaires)
      -------------------------------- */
      const moreBtn = document.getElementById("moreBtn");
      const morePanel = document.getElementById("morePanel");

      if (moreBtn && morePanel) {
        moreBtn.addEventListener("click", function (event) {
          event.stopPropagation();
          const isOpen = morePanel.classList.toggle("open");
          moreBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
          track("nav_more_toggle");
        });

        document.addEventListener("click", function (event) {
          if (!morePanel.classList.contains("open")) return;
          if (event.target === moreBtn || morePanel.contains(event.target)) return;
          morePanel.classList.remove("open");
          moreBtn.setAttribute("aria-expanded", "false");
        });

        document.addEventListener("keydown", function (event) {
          if (event.key === "Escape" && morePanel.classList.contains("open")) {
            morePanel.classList.remove("open");
            moreBtn.setAttribute("aria-expanded", "false");
            moreBtn.focus();
          }
        });
      }

      /**
       * Lie un élément à une URL externe.
       *
       * @param {string} id
       * @param {string} url
       */
      function bindExternal(id, url) {
        const el = document.getElementById(id);
        if (!el || !url) return;

        el.setAttribute("href", url);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }

      /**
       * Lie un élément à un mailto.
       *
       * @param {string} id
       * @param {string} email
       */
      function bindMail(id, email) {
        const el = document.getElementById(id);
        if (!el || !email) return;

        el.setAttribute("href", "mailto:" + email);
      }

      document.addEventListener("DOMContentLoaded", function () {
        bindExternal("btnWhatsapp", L.join_whatsapp);
        bindExternal("btnWhatsappQuick", L.join_whatsapp);
        bindExternal("btnWhatsappStart", L.join_whatsapp);
        bindExternal("btnWhatsappFloat", L.join_whatsapp);

        bindExternal("btnJoin", L.join_membre);

        bindExternal("linkResMethode", L.res_methode);
        bindExternal("linkResCV", L.res_cv);
        bindExternal("linkResMetiers", L.res_metiers);

        bindExternal("openNotionBase", L.notion_base);
        bindExternal("openNotionComplet", L.notion_complet);

        bindExternal("linkPreinscriptionOnline", L.ateliers_tally);
        bindExternal("linkPreinscriptionDouala", L.ateliers_tally);
        bindExternal("openAteliersTally", L.ateliers_tally);

        bindExternal("linkOppBourses", L.opp_bourses);
        bindExternal("linkOppOffres", L.opp_offres);
        bindExternal("linkOppConcours", L.opp_concours);

        bindExternal("linkLinkedin", L.linkedin);
        bindExternal("linkNotionMain", L.notion_complet);
        bindExternal("linkProposerForm", L.proposer_form);

        bindMail("btnContact", L.email);
        bindMail("linkEmail", L.email);
      });

      /* --------------------------------
         TRACKING AUTO
         On conserve tout le suivi GA4.
      -------------------------------- */
      document.addEventListener("click", function (event) {
        const el = event.target.closest("[data-track]");
        if (!el || typeof gtag === "undefined") return;

        const label = el.getAttribute("data-track");
        let category = "navigation";

        if (/^cta_|^quick_|^floating_|^start_/.test(label)) category = "cta";
        else if (/^open_res|^go_ressources|^open_notion/.test(label)) category = "ressources";
        else if (/^workshop_|^open_tally|^go_ateliers/.test(label)) category = "ateliers";
        else if (/^open_opp|^go_opportunites/.test(label)) category = "opportunites";
        else if (/^open_join|^quick_whatsapp|^start_whatsapp|^floating_join_whatsapp/.test(label)) category = "rejoindre";
        else if (/^open_linkedin|^open_email/.test(label)) category = "apropos";
        else if (/^open_proposer/.test(label)) category = "proposer";
        else if (/^footer_/.test(label)) category = "footer";

        gtag("event", "click", {
          event_category: category,
          event_label: label
        });
      });

      /**
       * Insère un texte dans un élément si présent.
       *
       * @param {string} id
       * @param {string|number|null|undefined} value
       * @param {string} [fallback="--"]
       */
      function setText(id, value, fallback = "--") {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = value ?? fallback;
      }

      /**
       * Charge les données publiques depuis l'API Apps Script.
       *
       * On conserve :
       * - les KPI techniques dans l'API
       * - mais on choisit de ne pas les exposer publiquement sur Impact
       */
      async function loadStats() {
        if (!L.stats_url) return;

        try {
          const res = await fetch(L.stats_url, { cache: "no-store" });
          if (!res.ok) throw new Error("HTTP " + res.status);

          const data = await res.json();

          /* ----- Accueil ----- */
          setText("hero-members", data.members, "--");

          const workshops = Number(data.workshops || 0);
          const goal = Number(data.workshops_goal || 20);
          const pct = Math.min((workshops / goal) * 100, 100);

          const fill = document.getElementById("progFill");
          const text = document.getElementById("progText");

          if (fill) fill.style.width = pct + "%";
          if (text) text.textContent = workshops + " / " + goal;

          /* ----- Impact public ----- */
          setText("admin-best-page", data.best_page, "Accueil");
          setText("admin-cold-page", data.cold_page, "Impact");
          setText("admin-priority", data.priority, "Développer la communauté");
          setText("stat-updated", data.updated_at, "--");

          /* ----- Objectifs dynamiques ----- */
          setText("impact-goal-main", data.goal_main, "Toucher 100 jeunes");
          setText("impact-goal-help", data.goal_help, "Aider 10 jeunes à avancer concrètement");

          /* ----- Objectifs latéraux accueil ----- */
          setText("goal-home-1-number", data.home_goal_1_number, "100");
          setText("goal-home-1-text", data.home_goal_1_text, "jeunes à toucher");

          setText("goal-home-2-number", data.home_goal_2_number, "10");
          setText("goal-home-2-text", data.home_goal_2_text, "jeunes à aider concrètement");

          setText("goal-home-3-number", data.home_goal_3_number, String(goal));
          setText("goal-home-3-text", data.home_goal_3_text, "pré-inscriptions ateliers visées");

          /* KPI techniques gardés mais masqués côté public :
             data.visitors
             data.pageviews
             data.clicks
          */
        } catch (err) {
          console.error("Erreur chargement stats:", err);
        }
      }

      /**
       * Ticker d’ambiance hero.
       */
      function startTicker() {
        const messages = [
          "Plateforme active · Ressources et opportunités en cours de mise à jour",
          "Rejoins la communauté WhatsApp AEC Cameroun",
          "Ateliers en préparation · Pré-inscription ouverte",
          "Orientation, employabilité et opportunités pour les jeunes"
        ];

        let idx = 0;
        const ticker = document.getElementById("tickerText");
        if (!ticker) return;

        ticker.style.transition = "opacity .35s ease, transform .35s ease";

        setInterval(function () {
          idx = (idx + 1) % messages.length;

          ticker.style.opacity = "0";
          ticker.style.transform = "translateY(4px)";

          setTimeout(function () {
            ticker.textContent = messages[idx];
            ticker.style.opacity = "1";
            ticker.style.transform = "none";
          }, 320);
        }, 3200);
      }

      document.addEventListener("DOMContentLoaded", function () {
        loadStats();
        startTicker();
      });
    })();