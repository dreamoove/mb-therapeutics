// ===== CONFIG =====
const APPS_SCRIPT_URL = "YOUR_APPS_SCRIPT_WEBAPP_URL"; // <-- Mets ton URL Apps Script ici
const SOURCE = "Landing-Pharma";

// Assumptions (deck)
const UNIT_SAVING_RATE = 0.50; // ~50% savings per unit
const HR_REDUCTION_RATE = 0.60; // -60% manipulation -> hours saved proxy

// Pricing
const BUY_COST = 55000;
const RENT_MONTHLY = 2100;

// ===== Helpers =====
const $ = (sel) => document.querySelector(sel);
const euro0 = (n) => isFinite(n)
  ? new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n)
  : "—";
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const r1 = (n) => Math.round(n * 10) / 10;

// Smooth scroll buttons
document.querySelectorAll("[data-scroll]").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-scroll");
    const el = document.querySelector(target);
    if (el) el.scrollIntoView({ behavior:"smooth", block:"start" });
  });
});

function computeROI(){
  const prepsPerDay = num($("#prepsPerDay")?.value);
  const daysPerYear = num($("#daysPerYear")?.value);
  const costPerUnit = num($("#costPerUnit")?.value);
  const timePerPrepMin = num($("#timePerPrepMin")?.value);
  const hourlyCost = num($("#hourlyCost")?.value);
  const financingMode = $("#financingMode")?.value || "";

  const unitsPerYear = prepsPerDay * daysPerYear;

  // Unit savings
  const savingsPerUnit = costPerUnit * UNIT_SAVING_RATE;
  const savingsPerYear = unitsPerYear * savingsPerUnit;

  // Hours saved proxy (-60% of manual time)
  const hoursCurrent = (unitsPerYear * timePerPrepMin) / 60;
  const hoursSavedPerYear = hoursCurrent * HR_REDUCTION_RATE;

  // Value of time saved
  const laborValueSaved = hoursSavedPerYear * hourlyCost;

  // Total benefit (unit savings + labor value)
  const totalAnnualBenefit = savingsPerYear + laborValueSaved;

  // Break-even
  let breakEvenMonths = Infinity;
  if (totalAnnualBenefit > 0) {
    if (financingMode.includes("Achat")) {
      breakEvenMonths = (BUY_COST / totalAnnualBenefit) * 12;
    } else {
      const monthlyBenefit = totalAnnualBenefit / 12;
      breakEvenMonths = monthlyBenefit > 0 ? (RENT_MONTHLY / monthlyBenefit) : Infinity;
    }
  }

  return {
    prepsPerDay, daysPerYear, costPerUnit, timePerPrepMin, hourlyCost, financingMode,
    unitsPerYear,
    savingsPerYear,
    hoursSavedPerYear,
    laborValueSaved,
    totalAnnualBenefit,
    breakEvenMonths,
    notes: ($("#notes")?.value || "").trim(),
  };
}

function renderROI(){
  // Sécurité si les éléments n'existent pas encore
  if(!$("#kpiSavings")) return;

  const r = computeROI();
  $("#kpiSavings").textContent = euro0(r.savingsPerYear);
  $("#kpiHours").textContent = isFinite(r.hoursSavedPerYear) ? `${r1(r.hoursSavedPerYear)} h` : "—";
  
  // Le champ ajouté dans le HTML
  if($("#kpiLaborValue")) {
      $("#kpiLaborValue").textContent = euro0(r.laborValueSaved);
  }

  $("#kpiTotal").textContent = euro0(r.totalAnnualBenefit);

  const be = r.breakEvenMonths;
  $("#kpiBE").textContent = isFinite(be) ? `${r1(be)} mois` : "—";

  if($("#kpiAssumptions")) {
      $("#kpiAssumptions").textContent = `Hypothèses : –50% coût/unité + –60% temps (valorisé).`;
  }
}

// Live update
const inputs = ["#prepsPerDay","#daysPerYear","#costPerUnit","#timePerPrepMin","#hourlyCost","#financingMode"];
inputs.forEach(sel => {
    const el = $(sel);
    if(el) el.addEventListener("input", renderROI);
});

// Init
document.addEventListener("DOMContentLoaded", renderROI);

// ===== Lead submit =====
const toastOk = $("#toastOk");
const toastErr = $("#toastErr");
const submitBtn = $("#submitBtn");
const form = $("#leadForm");

if(form){
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if(toastOk) toastOk.style.display = "none";
      if(toastErr) toastErr.style.display = "none";

      // Simulation d'erreur si pas d'URL (pour éviter de casser la démo)
      if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("YOUR_APPS_SCRIPT")) {
        // En mode démo locale, on fait semblant que ça marche
        console.warn("Pas d'URL Apps Script configurée. Mode démo.");
        if(submitBtn) {
            submitBtn.textContent = "Envoi (Démo)...";
            setTimeout(() => {
                submitBtn.textContent = "Demander un rappel";
                if(toastOk) toastOk.style.display = "block";
                form.reset();
            }, 1000);
        }
        return;
      }

      const r = computeROI();
      const payload = {
        source: SOURCE,
        name: $("#name")?.value.trim(),
        email: $("#email")?.value.trim(),
        phone: $("#phone")?.value.trim(),
        pharmacy: $("#pharmacy")?.value.trim(),

        prepsPerDay: r.prepsPerDay,
        daysPerYear: r.daysPerYear,
        costPerUnit: r.costPerUnit,
        timePerPrepMin: r.timePerPrepMin,
        hourlyCost: r.hourlyCost,
        financingMode: r.financingMode,
        notes: r.notes,

        savingsPerYear: Math.round(r.savingsPerYear),
        hoursSavedPerYear: r1(r.hoursSavedPerYear),
        laborValueSaved: Math.round(r.laborValueSaved),
        totalAnnualBenefit: Math.round(r.totalAnnualBenefit),
        breakEvenMonths: r1(r.breakEvenMonths),
      };

      if(submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Envoi…";
      }

      try {
        const res = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json().catch(() => null);
        if (json && json.ok) {
          if(toastOk) toastOk.style.display = "block";
          form.reset();
        } else {
          if(toastErr) toastErr.style.display = "block";
        }
      } catch (err) {
        if(toastErr) toastErr.style.display = "block";
      } finally {
        if(submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Demander un rappel";
        }
      }
    });
}