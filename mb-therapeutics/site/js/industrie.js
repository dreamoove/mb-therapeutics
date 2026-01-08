// ===== CONFIG =====
const APPS_SCRIPT_URL = "YOUR_APPS_SCRIPT_WEBAPP_URL"; // <-- REMPLACER ICI
const SOURCE = "Landing-CDMO";

// Defaults pricing
const BUY_COST = 55000;
const RENT_MONTHLY = 2100;

// Helpers
const qs = (sel) => document.querySelector(sel);
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const r1 = (n) => Math.round(n * 10) / 10;

const euro0 = (n) =>
  Number.isFinite(n)
    ? new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(n)
    : "—";

function initSmoothScroll() {
  document.querySelectorAll("[data-scroll]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-scroll");
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function clampPct(x) {
  return Math.max(0, Math.min(100, x));
}

function computeCase() {
  const unitsPerYear = num(qs("#unitsPerYear")?.value);
  const batchesPerYear = num(qs("#batchesPerYear")?.value);
  const costPerUnit = num(qs("#costPerUnit")?.value);
  const timePerUnitMin = num(qs("#timePerUnitMin")?.value);
  const scrapPct = clampPct(num(qs("#scrapPct")?.value));
  const setupHoursPerBatch = num(qs("#setupHoursPerBatch")?.value);
  const hourlyCost = num(qs("#hourlyCost")?.value);
  const deployMode = (qs("#deployMode")?.value || "").toString();

  // Hidden/Advanced inputs
  const gainUnitCostPct = clampPct(num(qs("#gainUnitCostPct")?.value || 50));
  const gainLaborPct = clampPct(num(qs("#gainLaborPct")?.value || 40));
  const gainScrapPct = clampPct(num(qs("#gainScrapPct")?.value || 30));
  const gainSetupPct = clampPct(num(qs("#gainSetupPct")?.value || 40));

  // Calculations
  const unitSavingsPerUnit = costPerUnit * (gainUnitCostPct / 100);
  const unitSavingsPerYear = unitsPerYear * unitSavingsPerUnit;

  const hoursLaborCurrent = (unitsPerYear * timePerUnitMin) / 60;
  const hoursLaborSaved = hoursLaborCurrent * (gainLaborPct / 100);
  const laborSavingsValue = hoursLaborSaved * hourlyCost;

  const scrapCostCurrent = unitsPerYear * costPerUnit * (scrapPct / 100);
  const scrapSavings = scrapCostCurrent * (gainScrapPct / 100);

  const setupHoursCurrent = batchesPerYear * setupHoursPerBatch;
  const setupHoursSaved = setupHoursCurrent * (gainSetupPct / 100);
  const setupSavingsValue = setupHoursSaved * hourlyCost;

  const totalBenefit = unitSavingsPerYear + laborSavingsValue + scrapSavings + setupSavingsValue;

  let breakEvenMonths = Infinity;
  if (totalBenefit > 0) {
    const isBuy = deployMode.toLowerCase().includes("achat");
    if (isBuy) {
      breakEvenMonths = (BUY_COST / totalBenefit) * 12;
    } else {
      const monthlyBenefit = totalBenefit / 12;
      breakEvenMonths = monthlyBenefit > 0 ? (RENT_MONTHLY / monthlyBenefit) : Infinity;
    }
  }

  return {
    unitsPerYear, batchesPerYear, costPerUnit, timePerUnitMin, scrapPct, setupHoursPerBatch, hourlyCost, deployMode,
    gainUnitCostPct, gainLaborPct, gainScrapPct, gainSetupPct,
    unitSavingsPerYear,
    laborSavingsValue,
    scrapSavings,
    setupSavingsValue,
    totalBenefit,
    breakEvenMonths,
    notes: (qs("#notes")?.value || "").trim(),
    hoursLaborSaved,
    setupHoursSaved
  };
}

function renderCase() {
  if(!qs("#kpiUnitSavings")) return; // Sécurité

  const r = computeCase();

  qs("#kpiUnitSavings").textContent = euro0(r.unitSavingsPerYear);
  qs("#kpiLaborSavings").textContent = euro0(r.laborSavingsValue);
  qs("#kpiScrapSavings").textContent = euro0(r.scrapSavings);
  qs("#kpiSetupSavings").textContent = euro0(r.setupSavingsValue);
  qs("#kpiTotalBenefit").textContent = euro0(r.totalBenefit);

  qs("#kpiBreakEven").textContent = Number.isFinite(r.breakEvenMonths) ? `${r1(r.breakEvenMonths)} mois` : "—";

  if(qs("#kpiAssumptions")){
      qs("#kpiAssumptions").textContent =
        `Hypothèses : gain coût ${r.gainUnitCostPct}% • gain temps ${r.gainLaborPct}% • gain rebut ${r.gainScrapPct}% • gain setup ${r.gainSetupPct}%`;
  }
}

function bindLive() {
  const ids = [
    "#unitsPerYear", "#batchesPerYear", "#costPerUnit", "#timePerUnitMin",
    "#scrapPct", "#setupHoursPerBatch", "#hourlyCost", "#deployMode",
    "#gainUnitCostPct", "#gainLaborPct", "#gainScrapPct", "#gainSetupPct",
    "#notes"
  ];

  ids.forEach((sel) => {
    const el = qs(sel);
    if (!el) return;
    el.addEventListener("input", renderCase);
    el.addEventListener("change", renderCase);
  });
}

async function submitLead(ev) {
  ev.preventDefault();

  const toastOk = qs("#toastOk");
  const toastErr = qs("#toastErr");
  const submitBtn = qs("#submitBtn");

  if(toastOk) toastOk.style.display = "none";
  if(toastErr) toastErr.style.display = "none";

  // Demo mode safeguard
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("YOUR_APPS_SCRIPT")) {
     console.warn("Pas d'URL Apps Script. Mode démo.");
     if(submitBtn) {
         submitBtn.textContent = "Envoi (Démo)...";
         setTimeout(() => {
             submitBtn.textContent = "Demander une discussion";
             if(toastOk) toastOk.style.display = "block";
             qs("#leadForm")?.reset();
         }, 1000);
     }
     return;
  }

  const r = computeCase();

  const payload = {
    source: SOURCE,
    name: (qs("#name")?.value || "").trim(),
    email: (qs("#email")?.value || "").trim(),
    company: (qs("#company")?.value || "").trim(),
    role: (qs("#role")?.value || "").trim(),
    message: (qs("#message")?.value || "").trim(),

    unitsPerYear: r.unitsPerYear,
    batchesPerYear: r.batchesPerYear,
    costPerUnit: r.costPerUnit,
    timePerUnitMin: r.timePerUnitMin,
    scrapPct: r.scrapPct,
    setupHoursPerBatch: r.setupHoursPerBatch,
    hourlyCost: r.hourlyCost,
    deployMode: r.deployMode,

    unitSavingsPerYear: Math.round(r.unitSavingsPerYear),
    laborSavingsValue: Math.round(r.laborSavingsValue),
    scrapSavings: Math.round(r.scrapSavings),
    setupSavingsValue: Math.round(r.setupSavingsValue),
    totalBenefit: Math.round(r.totalBenefit),
    breakEvenMonths: Number.isFinite(r.breakEvenMonths) ? r1(r.breakEvenMonths) : "",

    notes: r.notes
  };

  if(submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Envoi…";
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);

    if (json && json.ok) {
      if(toastOk) toastOk.style.display = "block";
      qs("#leadForm")?.reset();
    } else {
      if(toastErr) toastErr.style.display = "block";
    }
  } catch (e) {
    if(toastErr) toastErr.style.display = "block";
  } finally {
    if(submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Demander une discussion";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initSmoothScroll();
  bindLive();
  renderCase();

  const form = qs("#leadForm");
  if (form) form.addEventListener("submit", submitLead);
});