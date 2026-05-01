/* ================================================
   ExpenseIQ — script.js
   All logic: data, rendering, charts, events
   ================================================ */

"use strict";

// ════════════════════════════════════════════════
// 1. CONSTANTS
// ════════════════════════════════════════════════

const CATS = {
  food:          { icon: "🍔", color: "#e08c52", label: "Food" },
  transport:     { icon: "🚗", color: "#4a9edd", label: "Transport" },
  shopping:      { icon: "🛍️", color: "#d85e8b", label: "Shopping" },
  health:        { icon: "💊", color: "#3ecf8e", label: "Health" },
  entertainment: { icon: "🎬", color: "#9b72e8", label: "Entertainment" },
  education:     { icon: "📚", color: "#3ec8c8", label: "Education" },
  bills:         { icon: "⚡", color: "#f0c040", label: "Bills" },
  other:         { icon: "📌", color: "#8a9bb0", label: "Other" },
};

const STORAGE_KEY = "expenseiq_v2";

// ════════════════════════════════════════════════
// 2. STATE
// ════════════════════════════════════════════════

let expenses     = loadData();
let selectedCat  = "food";
let currentFilter = "all";
let currentMonth = new Date().getMonth();
let currentYear  = new Date().getFullYear();
let barChart     = null;
let doughnutChart = null;

// ════════════════════════════════════════════════
// 3. PERSISTENCE
// ════════════════════════════════════════════════

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

// ════════════════════════════════════════════════
// 4. INIT
// ════════════════════════════════════════════════

function init() {
  // Set today's date as default
  document.getElementById("date").valueAsDate = new Date();

  // Today label
  document.getElementById("todayDate").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  updateMonthDisplay();
  renderAll();
}

// ════════════════════════════════════════════════
// 5. MONTH NAVIGATION
// ════════════════════════════════════════════════

function updateMonthDisplay() {
  const d = new Date(currentYear, currentMonth, 1);
  document.getElementById("monthDisplay").textContent = d.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

document.getElementById("prevMonth").addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  updateMonthDisplay();
  renderAll();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  updateMonthDisplay();
  renderAll();
});

// ════════════════════════════════════════════════
// 6. FILTER & CATEGORY SELECTION
// ════════════════════════════════════════════════

function setFilter(el) {
  document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
  el.classList.add("active");
  currentFilter = el.dataset.filter;
  renderList();
}

function selectCat(el) {
  document.querySelectorAll(".cat-pill").forEach((p) => p.classList.remove("active"));
  el.classList.add("active");
  selectedCat = el.dataset.cat;
}

// ════════════════════════════════════════════════
// 7. ADD / DELETE / CLEAR EXPENSES
// ════════════════════════════════════════════════

function addExpense() {
  const desc   = document.getElementById("desc").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const date   = document.getElementById("date").value;
  const mode   = document.getElementById("mode").value;
  const note   = document.getElementById("note").value.trim();

  if (!desc)              return showToast("⚠️ Please enter a description");
  if (!amount || amount <= 0) return showToast("⚠️ Enter a valid amount");
  if (!date)              return showToast("⚠️ Please select a date");

  const expense = {
    id: Date.now(),
    desc,
    amount,
    date,
    mode,
    note,
    cat: selectedCat,
  };

  expenses.unshift(expense);
  saveData();
  renderAll();
  clearForm();
  showToast("✅ Expense added!");
}

function deleteExpense(id) {
  expenses = expenses.filter((e) => e.id !== id);
  saveData();
  renderAll();
  showToast("🗑️ Deleted");
}

function clearAll() {
  if (getMonthExpenses().length === 0) return;
  if (!confirm("Clear all expenses for this month?")) return;

  const prefix = buildMonthPrefix(currentYear, currentMonth);
  expenses = expenses.filter((e) => !e.date.startsWith(prefix));
  saveData();
  renderAll();
  showToast("🗑️ All cleared");
}

function clearForm() {
  document.getElementById("desc").value   = "";
  document.getElementById("amount").value = "";
  document.getElementById("note").value   = "";
  document.getElementById("date").valueAsDate = new Date();
}

// ════════════════════════════════════════════════
// 8. HELPERS
// ════════════════════════════════════════════════

function buildMonthPrefix(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getMonthExpenses(y, m) {
  const prefix = buildMonthPrefix(y ?? currentYear, m ?? currentMonth);
  return expenses.filter((e) => e.date.startsWith(prefix));
}

function fmt(n) {
  return (
    "₹" +
    n.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

// ════════════════════════════════════════════════
// 9. RENDER ALL
// ════════════════════════════════════════════════

function renderAll() {
  renderStats();
  renderList();
  renderBarChart();
  renderDoughnut();
  renderCatBreakdown();
}

// ════════════════════════════════════════════════
// 10. STATS CARDS
// ════════════════════════════════════════════════

function renderStats() {
  const me    = getMonthExpenses();
  const total = me.reduce((a, e) => a + e.amount, 0);

  document.getElementById("totalSpent").textContent = fmt(total);
  document.getElementById("totalTrans").textContent = me.length;

  // Average per day
  const today = new Date();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const days =
    currentYear === today.getFullYear() && currentMonth === today.getMonth()
      ? today.getDate()
      : daysInMonth;

  document.getElementById("avgDay").textContent = days > 0 ? fmt(total / days) : "₹0";

  // Top category
  const catTotals = {};
  me.forEach((e) => (catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount));
  const top = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

  if (top) {
    const c = CATS[top[0]] || CATS.other;
    document.getElementById("topCat").textContent    = `${c.icon} ${c.label}`;
    document.getElementById("topCatSub").textContent = fmt(top[1]);
  } else {
    document.getElementById("topCat").textContent    = "—";
    document.getElementById("topCatSub").textContent = "No data";
  }
}

// ════════════════════════════════════════════════
// 11. TRANSACTION LIST
// ════════════════════════════════════════════════

function renderList() {
  const me     = getMonthExpenses();
  const search = document.getElementById("searchInput").value.toLowerCase().trim();

  const filtered = me.filter((e) => {
    if (currentFilter !== "all" && e.cat !== currentFilter) return false;
    if (search && !e.desc.toLowerCase().includes(search) && !e.cat.includes(search)) return false;
    return true;
  });

  const container = document.getElementById("transList");

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-emoji">🔍</div>
        <p>No expenses found</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered
    .map((e) => {
      const cat    = CATS[e.cat] || CATS.other;
      const dateStr = new Date(e.date + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });

      return `
      <div class="trans-item">
        <div class="trans-icon" style="background:${cat.color}20">${cat.icon}</div>
        <div class="trans-info">
          <div class="trans-name">${escapeHtml(e.desc)}</div>
          <div class="trans-meta">
            <span class="trans-cat-badge" style="background:${cat.color}20;color:${cat.color}">${cat.label}</span>
            <span>${dateStr}</span>
            <span>${e.mode}</span>
          </div>
        </div>
        <div class="trans-amount">${fmt(e.amount)}</div>
        <button class="trans-del" onclick="deleteExpense(${e.id})" title="Delete">✕</button>
      </div>`;
    })
    .join("");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ════════════════════════════════════════════════
// 12. BAR CHART — Monthly Trend
// ════════════════════════════════════════════════

function renderBarChart() {
  const labels = [];
  const totals = [];

  for (let i = 5; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m < 0) { m += 12; y--; }

    const label = new Date(y, m, 1).toLocaleDateString("en-IN", { month: "short" });
    const total = getMonthExpenses(y, m).reduce((a, e) => a + e.amount, 0);

    labels.push(label);
    totals.push(total);
  }

  const ctx = document.getElementById("barChart").getContext("2d");
  if (barChart) barChart.destroy();

  // Gradient for current month bar
  const grad = ctx.createLinearGradient(0, 0, 0, 230);
  grad.addColorStop(0, "rgba(62, 207, 142, 0.85)");
  grad.addColorStop(1, "rgba(62, 207, 142, 0.15)");

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data: totals,
          backgroundColor: totals.map((_, i) =>
            i === 5 ? grad : "rgba(62, 207, 142, 0.15)"
          ),
          borderColor: totals.map((_, i) =>
            i === 5 ? "#3ecf8e" : "rgba(62, 207, 142, 0.35)"
          ),
          borderWidth: 1,
          borderRadius: 7,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#162c42",
          borderColor: "#3ecf8e",
          borderWidth: 1,
          titleColor: "#3ecf8e",
          bodyColor: "#dde8f0",
          padding: 10,
          callbacks: {
            label: (ctx) => " ₹" + ctx.raw.toLocaleString("en-IN"),
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#3e5c78", font: { family: "Outfit", size: 11 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            color: "#3e5c78",
            font: { family: "Outfit", size: 11 },
            callback: (v) => "₹" + (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v),
          },
        },
      },
    },
  });
}

// ════════════════════════════════════════════════
// 13. DOUGHNUT CHART — Category Breakdown
// ════════════════════════════════════════════════

function renderDoughnut() {
  const me = getMonthExpenses();
  const catTotals = {};
  me.forEach((e) => (catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount));

  const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const ctx = document.getElementById("doughnutChart").getContext("2d");

  if (doughnutChart) doughnutChart.destroy();

  // Empty state chart
  if (entries.length === 0) {
    doughnutChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["No Data"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["rgba(255,255,255,0.05)"],
            borderColor: ["transparent"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
      },
    });
    return;
  }

  doughnutChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: entries.map(([k]) => CATS[k]?.label || k),
      datasets: [
        {
          data: entries.map(([, v]) => v),
          backgroundColor: entries.map(([k]) => (CATS[k]?.color || "#8a9bb0") + "cc"),
          borderColor: entries.map(([k]) => CATS[k]?.color || "#8a9bb0"),
          borderWidth: 1,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: {
          position: "right",
          labels: {
            color: "#7a9bb8",
            font: { family: "Outfit", size: 11 },
            boxWidth: 10,
            padding: 10,
          },
        },
        tooltip: {
          backgroundColor: "#162c42",
          borderColor: "rgba(62,207,142,0.3)",
          borderWidth: 1,
          titleColor: "#dde8f0",
          bodyColor: "#7a9bb8",
          padding: 10,
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = Math.round((ctx.raw / total) * 100);
              return ` ₹${ctx.raw.toLocaleString("en-IN")} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

// ════════════════════════════════════════════════
// 14. CATEGORY BREAKDOWN BARS
// ════════════════════════════════════════════════

function renderCatBreakdown() {
  const me = getMonthExpenses();
  const catTotals = {};
  me.forEach((e) => (catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount));

  const total   = me.reduce((a, e) => a + e.amount, 0);
  const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const cont    = document.getElementById("catBreakdown");

  if (entries.length === 0) {
    cont.innerHTML = `<div class="no-data-msg">No data yet</div>`;
    return;
  }

  cont.innerHTML = entries
    .map(([cat, amt]) => {
      const c   = CATS[cat] || CATS.other;
      const pct = total > 0 ? Math.round((amt / total) * 100) : 0;

      return `
      <div class="budget-item">
        <div class="budget-row">
          <span class="cat-name">${c.icon} ${c.label}</span>
          <span class="cat-spent">
            ${fmt(amt)}
            <span style="color:var(--text3);font-size:11px">(${pct}%)</span>
          </span>
        </div>
        <div class="budget-bar-wrap">
          <div class="budget-bar" style="width:${pct}%;background:${c.color}"></div>
        </div>
      </div>`;
    })
    .join("");
}

// ════════════════════════════════════════════════
// 15. TOAST NOTIFICATION
// ════════════════════════════════════════════════

let toastTimer = null;

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

// ════════════════════════════════════════════════
// 16. KEYBOARD SHORTCUT — Enter to add
// ════════════════════════════════════════════════

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.ctrlKey) addExpense();
});

// ════════════════════════════════════════════════
// 17. START
// ════════════════════════════════════════════════

init();
