// ===== CONFIG =====
const APPS_SCRIPT_URL = "YOUR_APPS_SCRIPT_WEBAPP_URL"; // <-- Remplace par ton URL Apps Script
const SOURCE = "Landing-CHU";

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

function computeImpact() {
  const prepsPerDay = num(qs("#prepsPerDay")?.value);
  const daysPerYear = num(qs("#daysPerYear")?.value);
  const timePerPrepMin = num(qs("#timePerPrepMin")?.value);

  const reductionManipPct = num(qs("#reductionManipPct")?.value); // 0..100
  const targetTimeMin = num(qs("#targetTimeMin")?.value);
  const hourlyCost = num(qs("#hourlyCost")?.value);

  const unitsPerYear = prepsPerDay * daysPerYear;

  const hoursCurrent = (unitsPerYear * timePerPrepMin) / 60;
  const hoursTarget = (unitsPerYear * targetTimeMin) / 60;

  // Hours saved based on target time
  let hoursSaved = hoursCurrent - hoursTarget;
  if (!Number.isFinite(hoursSaved)) hoursSaved = 0;
  if (hoursSaved < 0) hoursSaved = 0;

  // Capacity uplift: how many extra preps could be done with saved time
  const prepHoursTarget = targetTimeMin > 0 ? targetTimeMin / 60 : 0;
  const extraCapacity = prepHoursTarget > 0 ? Math.floor(hoursSaved / prepHoursTarget) : 0;

  // Label for manip reduction
  const manipReductionLabel = `${Math.max(0, Math.min(100, reductionManipPct))}%`;

  // Value of time saved
  const laborValueSaved = hourlyCost > 0 ? hoursSaved * hourlyCost : NaN;

  return {
    prepsPerDay, daysPerYear, timePerPrepMin, reductionManipPct, targetTimeMin, hourlyCost,
    unitsPerYear,
    hoursCurrent,
    hoursTarget,
    hoursSaved,
    extraCapacity,
    manipReductionLabel,
    laborValueSaved,
    notes: (qs("#notes")?.value || "").trim(),
  };
}

function renderImpact() {
  // Sécurité si les éléments n'existent pas encore
  if (!qs("#kpiUnits")) return;

  const r = computeImpact();

  if(qs("#kpiUnits")) qs("#kpiUnits").textContent = `${r.unitsPerYear.toLocaleString("fr-FR")}`;
  if(qs("#kpiHoursCurrent")) qs("#kpiHoursCurrent").textContent = `${r1(r.hoursCurrent)} h`;
  if(qs("#kpiHoursSaved")) qs("#kpiHoursSaved").textContent = `${r1(r.hoursSaved)} h`;

  if (qs("#kpiLaborValue")) {
    qs("#kpiLaborValue").textContent = Number.isFinite(r.laborValueSaved) ? euro0(r.laborValueSaved) : "—";
  }

  if (qs("#kpiExtraCapacity")) {
    qs("#kpiExtraCapacity").textContent = `${r.extraCapacity.toLocaleString("fr-FR")}`;
  }

  if (qs("#kpiAssumptions")) {
    qs("#kpiAssumptions").textContent =
      `Hypothèses : temps cible ${r.targetTimeMin} min • réduction manip ${r.manipReductionLabel}.`;
  }
}

function bindLive() {
  const ids = [
    "#prepsPerDay",
    "#daysPerYear",
    "#timePerPrepMin",
    "#reductionManipPct",
    "#targetTimeMin",
    "#hourlyCost",
    "#notes",
  ];

  ids.forEach((sel) => {
    const el = qs(sel);
    if (!el) return;
    el.addEventListener("input", renderImpact);
    el.addEventListener("change", renderImpact);
  });
}

async function submitLead(ev) {
  ev.preventDefault();

  const toastOk = qs("#toastOk");
  const toastErr = qs("#toastErr");
  const submitBtn = qs("#submitBtn");

  if (toastOk) toastOk.style.display = "none";
  if (toastErr) toastErr.style.display = "none";

  // Demo safeguard
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("YOUR_APPS_SCRIPT")) {
      console.warn("Pas d'URL Apps Script. Mode démo.");
      if (submitBtn) {
        submitBtn.textContent = "Envoi (Démo)...";
        setTimeout(() => {
             submitBtn.textContent = "Demander un rappel";
             if(toastOk) toastOk.style.display = "block";
             qs("#leadForm")?.reset();
        }, 1000);
      }
      return;
  }

  const r = computeImpact();

  const payload = {
    source: SOURCE,
    name: (qs("#name")?.value || "").trim(),
    email: (qs("#email")?.value || "").trim(),
    phone: (qs("#phone")?.value || "").trim(),
    hospital: (qs("#hospital")?.value || "").trim(),
    message: (qs("#message")?.value || "").trim(),

    prepsPerDay: r.prepsPerDay,
    daysPerYear: r.daysPerYear,
    timePerPrepMin: r.timePerPrepMin,
    reductionManipPct: r.reductionManipPct,
    targetTimeMin: r.targetTimeMin,
    hourlyCost: r.hourlyCost,
    unitsPerYear: r.unitsPerYear,
    hoursCurrent: r1(r.hoursCurrent),
    hoursTarget: r1(r.hoursTarget),
    hoursSaved: r1(r.hoursSaved),
    extraCapacity: r.extraCapacity,
    laborValueSaved: Number.isFinite(r.laborValueSaved) ? Math.round(r.laborValueSaved) : "",
    notes: r.notes,
  };

  if (submitBtn) {
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
      if (toastOk) toastOk.style.display = "block";
      qs("#leadForm")?.reset();
    } else {
      if (toastErr) toastErr.style.display = "block";
    }
  } catch (e) {
    if (toastErr) toastErr.style.display = "block";
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Demander un rappel";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initSmoothScroll();
  bindLive();
  renderImpact();

  const form = qs("#leadForm");
  if (form) form.addEventListener("submit", submitLead);
});