(() => {
  "use strict";

  // Helpers pour sélectionner des éléments plus vite
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // Année automatique dans le footer
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------------------------
  // 1. Gestion du Thème (Clair / Sombre)
  // ---------------------------
  const setTheme = (t) => {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("theme", t); } catch (_) {}

    // Met à jour l'icône
    const icon = document.querySelector("#themeToggle .iconbtn__icon");
    if (icon) icon.textContent = t === "dark" ? "☀" : "☾";
  };

  // Récupération du thème sauvegardé
  const saved = (() => {
    try { return localStorage.getItem("theme"); } catch (_) { return null; }
  })();

  if (saved === "dark" || saved === "light") setTheme(saved);

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(current === "dark" ? "light" : "dark");
  };

  // Écouteurs sur les boutons de thème
  $("#themeToggle")?.addEventListener("click", toggleTheme);
  $$("[data-theme-toggle]").forEach((btn) => btn.addEventListener("click", toggleTheme));


  // ---------------------------
  // 2. Gestion du Menu Mobile (Code corrigé)
  // ---------------------------
  const burger = document.getElementById('burger');
  const menuClose = document.getElementById('menuClose');
  const mobileNav = document.getElementById('mobileNav');
  const menuOverlay = document.getElementById('menuOverlay');

  function toggleMenu() {
    // Si l'attribut hidden est présent, c'est que le menu est fermé
    const isClosed = mobileNav.hasAttribute('hidden');

    if (isClosed) {
      // --- OUVERTURE ---
      mobileNav.removeAttribute('hidden');
      menuOverlay.removeAttribute('hidden');

      // Petit délai pour permettre au navigateur de préparer la transition
      setTimeout(() => {
        mobileNav.classList.add('is-open');
        menuOverlay.classList.add('is-open');
        document.body.classList.add("no-scroll");
      }, 10);

    } else {
      // --- FERMETURE ---
      mobileNav.classList.remove('is-open');
      menuOverlay.classList.remove('is-open');
      document.body.classList.remove("no-scroll");

      // On attend la fin de la transition CSS (300ms) avant de masquer
      setTimeout(() => {
        mobileNav.setAttribute('hidden', '');
        menuOverlay.setAttribute('hidden', '');
      }, 300);
    }
  }

  // On attache les événements
  if (burger) burger.addEventListener('click', toggleMenu);
  if (menuClose) menuClose.addEventListener('click', toggleMenu);
  if (menuOverlay) menuOverlay.addEventListener('click', toggleMenu);


  // ---------------------------
  // 3. Gestion du Formulaire (Feedback visuel)
  // ---------------------------
  const form = document.getElementById("leadForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      // Simulation d'envoi
      const btn = form.querySelector("button[type='submit']");
      const originalText = btn.innerText;
      
      btn.innerText = "Envoi en cours...";
      btn.disabled = true;

      setTimeout(() => {
        // Affichage des messages de succès
        const toastOk = document.getElementById("toastOk");
        if(toastOk) toastOk.style.display = "block";
        
        btn.innerText = "Envoyé !";
        form.reset();
        
        setTimeout(() => {
            btn.innerText = originalText;
            btn.disabled = false;
            if(toastOk) toastOk.style.display = "none";
        }, 3000);
      }, 800);
    });
  }

})();