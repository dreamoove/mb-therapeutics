/* =========================================================
   MB Therapeutics — UNIVERSAL SCRIPT (Landings)
   Gère : Navigation, Thème, et les 3 Calculateurs (Pharma, CHU, CDMO)
   ========================================================= */

// --- CONFIGURATION ---
// Remplace ceci par ton URL Google Apps Script une seule fois
const APPS_SCRIPT_URL = "YOUR_APPS_SCRIPT_WEBAPP_URL"; 

// --- UTILITAIRES (Communs) ---
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => document.querySelectorAll(sel);
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r1 = (n) => Math.round(n * 10) / 10;
const clampPct = (x) => Math.max(0, Math.min(100, x));
const euro0 = (n) => Number.isFinite(n) ? new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n) : "—";

// --- INITIALISATION AU CHARGEMENT ---
document.addEventListener("DOMContentLoaded", () => {
  initSmoothScroll();
  initThemeToggle();

  // Détection automatique du calculateur à lancer selon les IDs présents
  if (qs("#kpiSavings")) initPharmaCalculator();     // Page Pharma
  if (qs("#kpiExtraCapacity")) initChuCalculator();  // Page CHU
  if (qs("#kpiScrapSavings")) initIndustryCalculator(); // Page Industrie/CDMO
});

// --- SCROLL & THEME ---
function initSmoothScroll() {
  qsa("[data-scroll]").forEach(btn => {
    btn.addEventListener("click", () => {
      const el = qs(btn.getAttribute("data-scroll"));
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  const savedTheme = localStorage.getItem("theme");
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;

  if (savedTheme === "light" || (!savedTheme && prefersLight)) {
    document.documentElement.setAttribute("data-theme", "light");
    toggle.textContent = "☀️";
  } else {
    toggle.textContent = "🌙";
  }

  toggle.addEventListener("click", () => {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    if (isLight) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "dark");
      toggle.textContent = "🌙";
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
      toggle.textContent = "☀️";
    }
  });
}

/* =========================================================
   1. CALCULATEUR PHARMA (Source: Landing-Preparatoires)
   ========================================================= */
function initPharmaCalculator() {
  const SOURCE = "Landing-Preparatoires";
  const UNIT_SAVING_RATE = 0.50; 
  const HR_REDUCTION_RATE = 0.60; 
  const BUY_COST = 55000; 
  const RENT_MONTHLY = 2100;

  function compute() {
    const prepsPerDay = num(qs("#prepsPerDay").value);
    const daysPerYear = num(qs("#daysPerYear").value);
    const costPerUnit = num(qs("#costPerUnit").value);
    const timePerPrepMin = num(qs("#timePerPrepMin").value);
    const hourlyCost = num(qs("#hourlyCost").value);
    const financingMode = qs("#financingMode") ? qs("#financingMode").value : "Location";

    const unitsPerYear = prepsPerDay * daysPerYear;
    const savingsPerYear = unitsPerYear * (costPerUnit * UNIT_SAVING_RATE);
    const hoursSavedPerYear = ((unitsPerYear * timePerPrepMin) / 60) * HR_REDUCTION_RATE;
    const laborValueSaved = hoursSavedPerYear * hourlyCost;
    const totalAnnualBenefit = savingsPerYear + laborValueSaved;

    let breakEven = Infinity;
    if (totalAnnualBenefit > 0) {
      if (financingMode.includes("Achat")) {
        breakEven = (BUY_COST / totalAnnualBenefit) * 12;
      } else {
        const monthlyBenefit = totalAnnualBenefit / 12;
        breakEven = monthlyBenefit > 0 ? (RENT_MONTHLY / monthlyBenefit) : Infinity;
      }
    }

    return { prepsPerDay, daysPerYear, costPerUnit, timePerPrepMin, hourlyCost, financingMode, savingsPerYear, hoursSavedPerYear, laborValueSaved, totalAnnualBenefit, breakEven, notes: qs("#notes")?.value || "" };
  }

  function render() {
    const r = compute();
    qs("#kpiSavings").textContent = euro0(r.savingsPerYear);
    qs("#kpiHours").textContent = `${r1(r.hoursSavedPerYear)} h`;
    qs("#kpiLaborValue").textContent = euro0(r.laborValueSaved);
    qs("#kpiTotal").textContent = euro0(r.totalAnnualBenefit);
    qs("#kpiBE").textContent = Number.isFinite(r.breakEven) ? `${r1(r.breakEven)} mois` : "—";
  }

  // Bind Events
  ["#prepsPerDay","#daysPerYear","#costPerUnit","#timePerPrepMin","#hourlyCost","#financingMode"].forEach(id => qs(id)?.addEventListener("input", render));
  render();

  // Submit Lead
  qs("#leadForm")?.addEventListener("submit", (e) => {
    const r = compute();
    const payload = {
      source: SOURCE,
      name: qs("#name").value, email: qs("#email").value, phone: qs("#phone").value, pharmacy: qs("#pharmacy").value,
      notes: r.notes,
      ...r // Envoie toutes les stats calculées
    };
    submitLeadGeneric(e, payload);
  });
}

/* =========================================================
   2. CALCULATEUR CHU (Source: Landing-CHU)
   ========================================================= */
function initChuCalculator() {
  const SOURCE = "Landing-CHU";

  function compute() {
    const prepsPerDay = num(qs("#prepsPerDay").value);
    const daysPerYear = num(qs("#daysPerYear").value);
    const timePerPrepMin = num(qs("#timePerPrepMin").value);
    const targetTimeMin = num(qs("#targetTimeMin").value);
    const hourlyCost = num(qs("#hourlyCost").value);
    const reductionManipPct = num(qs("#reductionManipPct").value);

    const unitsPerYear = prepsPerDay * daysPerYear;
    const hoursCurrent = (unitsPerYear * timePerPrepMin) / 60;
    const hoursTarget = (unitsPerYear * targetTimeMin) / 60;
    const hoursSaved = Math.max(0, hoursCurrent - hoursTarget);
    
    // Capacité extra : combien de preps en plus on peut faire avec le temps gagné ?
    const prepHoursTarget = targetTimeMin > 0 ? targetTimeMin / 60 : 0;
    const extraCapacity = prepHoursTarget > 0 ? Math.floor(hoursSaved / prepHoursTarget) : 0;
    const laborValueSaved = hoursSaved * hourlyCost;

    return { unitsPerYear, hoursCurrent, hoursSaved, extraCapacity, laborValueSaved, timePerPrepMin, targetTimeMin, reductionManipPct, notes: qs("#notes")?.value || "" };
  }

  function render() {
    const r = compute();
    qs("#kpiUnits").textContent = r.unitsPerYear.toLocaleString("fr-FR");
    qs("#kpiHoursCurrent").textContent = `${r1(r.hoursCurrent)} h`;
    qs("#kpiHoursSaved").textContent = `${r1(r.hoursSaved)} h`;
    qs("#kpiLaborValue").textContent = euro0(r.laborValueSaved);
    qs("#kpiExtraCapacity").textContent = `${r.extraCapacity.toLocaleString("fr-FR")} préparations/an`;
    qs("#kpiAssumptions").textContent = `Hypothèses : temps ${r.timePerPrepMin} min → ${r.targetTimeMin} min`;
  }

  ["#prepsPerDay","#daysPerYear","#timePerPrepMin","#targetTimeMin","#hourlyCost","#reductionManipPct"].forEach(id => qs(id)?.addEventListener("input", render));
  render();

  qs("#leadForm")?.addEventListener("submit", (e) => {
    const r = compute();
    const payload = {
      source: SOURCE,
      name: qs("#name").value, email: qs("#email").value, phone: qs("#phone").value, hospital: qs("#hospital")?.value, message: qs("#message")?.value,
      notes: r.notes,
      ...r
    };
    submitLeadGeneric(e, payload);
  });
}

/* =========================================================
   3. CALCULATEUR INDUSTRIE (Source: Landing-CDMO)
   ========================================================= */
function initIndustryCalculator() {
  const SOURCE = "Landing-CDMO";
  const BUY_COST = 55000;
  const RENT_MONTHLY = 2100;

  function compute() {
    const unitsPerYear = num(qs("#unitsPerYear").value);
    const batchesPerYear = num(qs("#batchesPerYear").value);
    const costPerUnit = num(qs("#costPerUnit").value);
    const timePerUnitMin = num(qs("#timePerUnitMin").value);
    const scrapPct = num(qs("#scrapPct").value);
    const setupHoursPerBatch = num(qs("#setupHoursPerBatch").value);
    const hourlyCost = num(qs("#hourlyCost").value);
    const deployMode = qs("#deployMode").value;

    const gainUnitCostPct = num(qs("#gainUnitCostPct").value) / 100;
    const gainLaborPct = num(qs("#gainLaborPct").value) / 100;
    const gainScrapPct = num(qs("#gainScrapPct").value) / 100;
    const gainSetupPct = num(qs("#gainSetupPct").value) / 100;

    const unitSavings = (unitsPerYear * costPerUnit) * gainUnitCostPct;
    const laborSavings = (((unitsPerYear * timePerUnitMin)/60) * gainLaborPct) * hourlyCost;
    const scrapSavings = (unitsPerYear * costPerUnit * (scrapPct/100)) * gainScrapPct;
    const setupSavings = (batchesPerYear * setupHoursPerBatch * gainSetupPct) * hourlyCost;
    const totalBenefit = unitSavings + laborSavings + scrapSavings + setupSavings;

    let breakEven = Infinity;
    if (totalBenefit > 0) {
      if (deployMode.includes("Achat")) {
        breakEven = (BUY_COST / totalBenefit) * 12;
      } else {
        const monthlyBenefit = totalBenefit / 12;
        breakEven = monthlyBenefit > 0 ? (RENT_MONTHLY / monthlyBenefit) : Infinity;
      }
    }
    
    return { unitSavings, laborSavings, scrapSavings, setupSavings, totalBenefit, breakEven, gainUnitCostPct, gainLaborPct, gainScrapPct, gainSetupPct, notes: qs("#notes")?.value || "" };
  }

  function render() {
    const r = compute();
    qs("#kpiUnitSavings").textContent = euro0(r.unitSavings);
    qs("#kpiLaborSavings").textContent = euro0(r.laborSavings);
    qs("#kpiScrapSavings").textContent = euro0(r.scrapSavings);
    qs("#kpiSetupSavings").textContent = euro0(r.setupSavings);
    qs("#kpiTotalBenefit").textContent = euro0(r.totalBenefit);
    qs("#kpiBreakEven").textContent = Number.isFinite(r.breakEven) ? `${r1(r.breakEven)} mois` : "—";
    qs("#kpiAssumptions").textContent = `Hypothèses : gains ${Math.round(r.gainUnitCostPct*100)}% (coût), ${Math.round(r.gainLaborPct*100)}% (temps)`;
  }

  ["#unitsPerYear","#batchesPerYear","#costPerUnit","#timePerUnitMin","#scrapPct","#setupHoursPerBatch","#hourlyCost","#deployMode","#gainUnitCostPct","#gainLaborPct","#gainScrapPct","#gainSetupPct"].forEach(id => qs(id)?.addEventListener("input", render));
  render();

  qs("#leadForm")?.addEventListener("submit", (e) => {
    const r = compute();
    const payload = {
      source: SOURCE,
      name: qs("#name").value, email: qs("#email").value, company: qs("#company")?.value, role: qs("#role")?.value, message: qs("#message")?.value,
      notes: r.notes,
      ...r
    };
    submitLeadGeneric(e, payload);
  });
}

/* =========================================================
   GENERIC SUBMIT FUNCTION
   ========================================================= */
async function submitLeadGeneric(e, payload) {
  e.preventDefault();
  const btn = qs("#submitBtn");
  const toastOk = qs("#toastOk");
  const toastErr = qs("#toastErr");

  if(toastOk) toastOk.style.display = "none";
  if(toastErr) toastErr.style.display = "none";

  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("YOUR_APPS_SCRIPT")) {
    if(toastErr) { toastErr.style.display = "block"; toastErr.textContent = "Erreur config URL"; }
    return;
  }

  btn.disabled = true; 
  btn.textContent = "Envoi...";

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    // Succès (mode no-cors ne renvoie pas de json lisible)
    if(toastOk) toastOk.style.display = "block";
    qs("#leadForm")?.reset();
  } catch (err) {
    console.error(err);
    if(toastErr) toastErr.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = "Demande envoyée";
  }
}