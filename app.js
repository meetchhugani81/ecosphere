/* ==========================================================================
   EcoSphere Core JavaScript Application
   Core Modules: Carbon Engine, State Management, UI Renderers, Chart Bindings
   Optimizations: Strict Mode, Full Input Debouncing, and XSS Secure DOM Methods
   ========================================================================== */

"use strict";

/**
 * Carbon calculation factors and algorithms.
 * Based on EPA and IPCC standard emission coefficients.
 */
const CarbonEngine = {
  /**
   * Calculates monthly transportation emissions.
   * @param {string} carType - Type of vehicle (petrol, hybrid, ev, moto, none).
   * @param {number} carMileage - Weekly mileage driven.
   * @param {number} transitMileage - Weekly public transit mileage.
   * @param {number} flightHours - Annual flight hours.
   * @returns {number} Monthly CO2 emissions in kg.
   */
  calculateTransport(carType, carMileage, transitMileage, flightHours) {
    let carFactor = 0;
    switch (carType) {
      case 'petrol': carFactor = 0.404; break;
      case 'hybrid': carFactor = 0.200; break;
      case 'ev': carFactor = 0.080; break;
      case 'moto': carFactor = 0.210; break;
      case 'none': carFactor = 0.000; break;
    }
    const carEmissions = carMileage * 4.33 * carFactor;
    const transitEmissions = transitMileage * 4.33 * 0.14;
    const flightEmissions = (flightHours * 90.0) / 12;
    
    return Number((carEmissions + transitEmissions + flightEmissions).toFixed(1));
  },

  /**
   * Calculates monthly home energy emissions.
   * @param {number} electricityBill - Monthly electrical bill in dollars.
   * @param {number} heatingBill - Monthly heating utility bill in dollars.
   * @param {number} cleanPct - Percentage of electricity from renewables.
   * @returns {number} Monthly CO2 emissions in kg.
   */
  calculateEnergy(electricityBill, heatingBill, cleanPct) {
    const kwhRate = 0.16;
    const cleanReductionMultiplier = 1 - (cleanPct / 100);
    
    const electricityEmissions = (electricityBill / kwhRate) * 0.371 * cleanReductionMultiplier;
    const heatingEmissions = heatingBill * 0.42;

    return Number((electricityEmissions + heatingEmissions).toFixed(1));
  },

  /**
   * Calculates monthly diet and food emissions.
   * @param {string} dietType - Diet profile (meat-heavy, average, vegetarian, vegan).
   * @param {boolean} localFood - True if sourcing local food.
   * @param {boolean} minimizeWaste - True if minimizing waste.
   * @returns {number} Monthly CO2 emissions in kg.
   */
  calculateDiet(dietType, localFood, minimizeWaste) {
    let dietEmissions = 0;
    switch (dietType) {
      case 'meat-heavy': dietEmissions = 275.0; break;
      case 'average': dietEmissions = 208.3; break;
      case 'vegetarian': dietEmissions = 141.7; break;
      case 'vegan': dietEmissions = 125.0; break;
    }
    
    if (localFood) dietEmissions -= 10;
    if (minimizeWaste) dietEmissions -= 15;
    
    return Number(Math.max(20, dietEmissions).toFixed(1));
  },

  /**
   * Calculates monthly consumption and shopping emissions.
   * @param {string} shoppingLevel - Shopping frequency (minimal, average, high).
   * @param {boolean} recycle - True if actively recycling.
   * @returns {number} Monthly CO2 emissions in kg.
   */
  calculateConsumption(shoppingLevel, recycle) {
    let shoppingEmissions = 0;
    switch (shoppingLevel) {
      case 'minimal': shoppingEmissions = 30.0; break;
      case 'average': shoppingEmissions = 90.0; break;
      case 'high': shoppingEmissions = 220.0; break;
    }
    
    if (recycle) {
      shoppingEmissions -= 25;
    } else {
      shoppingEmissions += 10;
    }
    
    return Number(Math.max(5, shoppingEmissions).toFixed(1));
  }
};

window.CarbonEngine = CarbonEngine;

// Central Application State
const AppState = {
  user: {
    name: 'Eco-Warrior',
    xp: 65,
    streak: 2,
    level: 'Eco-Novice',
    lastActionDate: null
  },
  inputs: {
    carType: 'petrol',
    carMileage: 100,
    transitMileage: 20,
    flightHours: 8,
    electricityBill: 80,
    heatingBill: 40,
    cleanPct: 0,
    dietType: 'average',
    localFood: false,
    minimizeWaste: true,
    shoppingLevel: 'average',
    recycle: true
  },
  challenges: [
    { id: 'bike-transit', title: 'Bike or Bus to Work', desc: 'Swap one car trip for public transit or a bike ride.', cat: 'transport', savings: 28, xp: 20 },
    { id: 'led-upgrade', title: 'Switch to LED Lighting', desc: 'Replace traditional bulbs with power-saving LEDs.', cat: 'energy', savings: 8, xp: 15 },
    { id: 'meatless-day', title: 'Meatless Day', desc: 'Eat vegan or vegetarian meals for the entire day.', cat: 'diet', savings: 12, xp: 15 },
    { id: 'cold-wash', title: 'Wash Laundry in Cold Water', desc: 'Saves heating energy used by washing machines.', cat: 'energy', savings: 6, xp: 10 },
    { id: 'air-dry', title: 'Line Dry Clothes', desc: 'Ditch the tumble dryer entirely and air-dry garments.', cat: 'energy', savings: 10, xp: 10 },
    { id: 'compost-waste', title: 'Zero Food Waste Day', desc: 'Carefully portion meals and compost organic waste.', cat: 'diet', savings: 15, xp: 15 },
    { id: 'unplug-standby', title: 'Unplug Standby Electronics', desc: 'Prevent vampire draw by switching off power strips.', cat: 'energy', savings: 5, xp: 10 },
    { id: 'thrift-shopping', title: 'Buy Secondhand Only', desc: 'Purchase pre-owned clothing or tech to save raw manufacturing emissions.', cat: 'waste', savings: 35, xp: 25 }
  ],
  commitments: [],
  completedToday: []
};

// UI Chart references
let breakdownChart = null;
let projectionChart = null;

/**
 * Creates a debounced function that delays execution.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The delay in milliseconds.
 * @returns {Function}
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

const debouncedRecalculate = debounce(recalculateEmissions, 150);

// App Lifecycle Initialization
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initFormInputs();
  initChallenges();
  recalculateEmissions();
  initCharts();
  
  const runTestsBtn = document.getElementById('run-tests-btn');
  if (runTestsBtn) {
    runTestsBtn.addEventListener('click', () => {
      if (window.runTestSuite) {
        window.runTestSuite();
      }
    });
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
});

/**
 * Binds tabs to overview/calculator views.
 */
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.content-section');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.getAttribute('data-target');
      
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      sections.forEach(section => {
        section.classList.remove('active');
        if (section.getAttribute('id') === targetId) {
          section.classList.add('active');
        }
      });

      if (targetId === 'dashboard') {
        if (breakdownChart) breakdownChart.resize();
        if (projectionChart) projectionChart.resize();
      }
    });
  });
}

/**
 * Binds range inputs and dropdowns to State updates.
 */
function initFormInputs() {
  const bindInput = (id, stateKey, isCheckbox = false) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('input', (e) => {
      const value = isCheckbox ? e.target.checked : e.target.value;
      AppState.inputs[stateKey] = isCheckbox ? value : (isNaN(value) ? value : Number(value));
      
      const valBadge = document.getElementById(`${id}-val`);
      if (valBadge) {
        valBadge.textContent = value.toString();
      }
      
      // Debounce heavy updates to save CPU cycles
      debouncedRecalculate();
    });
  };

  bindInput('car-type', 'carType');
  bindInput('car-mileage', 'carMileage');
  bindInput('transit-mileage', 'transitMileage');
  bindInput('flights-yearly', 'flightHours');
  bindInput('energy-electricity', 'electricityBill');
  bindInput('energy-heating', 'heatingBill');
  bindInput('energy-clean-pct', 'cleanPct');
  bindInput('diet-type', 'dietType');
  bindInput('diet-local', 'localFood', true);
  bindInput('diet-waste', 'minimizeWaste', true);
  bindInput('shopping-level', 'shoppingLevel');
  bindInput('waste-recycle', 'recycle', true);
}

/**
 * Performs recalculations and triggers UI updates.
 */
function recalculateEmissions() {
  const t = CarbonEngine.calculateTransport(
    AppState.inputs.carType,
    AppState.inputs.carMileage,
    AppState.inputs.transitMileage,
    AppState.inputs.flightHours
  );
  
  const e = CarbonEngine.calculateEnergy(
    AppState.inputs.electricityBill,
    AppState.inputs.heatingBill,
    AppState.inputs.cleanPct
  );

  const d = CarbonEngine.calculateDiet(
    AppState.inputs.dietType,
    AppState.inputs.localFood,
    AppState.inputs.minimizeWaste
  );

  const c = CarbonEngine.calculateConsumption(
    AppState.inputs.shoppingLevel,
    AppState.inputs.recycle
  );

  const total = Number((t + e + d + c).toFixed(1));
  
  updateDashboardUI(t, e, d, c, total);
  updateRecommendations(t, e, d, c);
}

/**
 * Safely updates UI footprint values and gauge using clean DOM methods.
 */
function updateDashboardUI(t, e, d, c, total) {
  const valueDisplay = document.getElementById('current-footprint-value');
  if (valueDisplay) valueDisplay.textContent = total.toString();

  const circle = document.getElementById('footprint-circle');
  if (circle) {
    const maxVal = 1000;
    const circumference = 565.48;
    const clampedVal = Math.min(total, maxVal);
    const offset = circumference - (clampedVal / maxVal) * circumference;
    circle.style.strokeDashoffset = offset.toString();
  }

  // Safe DOM structure generation instead of vulnerable innerHTML
  const compDisplay = document.getElementById('footprint-vs-avg');
  if (compDisplay) {
    compDisplay.textContent = ''; 
    const baseline = 400;
    const diffPct = Math.round((Math.abs(total - baseline) / baseline) * 100);

    const prefix = document.createTextNode(total <= baseline ? 'Nice! Your footprint is ' : 'Attention: Your footprint is ');
    const span = document.createElement('span');
    span.className = total <= baseline ? 'highlight' : 'highlight danger';
    span.textContent = `${diffPct}% ${total <= baseline ? 'below' : 'above'}`;
    const suffix = document.createTextNode(' the target global baseline (400 kg/mo).');

    compDisplay.appendChild(prefix);
    compDisplay.appendChild(span);
    compDisplay.appendChild(suffix);
  }

  const treeEl = document.getElementById('eq-trees');
  const flightEl = document.getElementById('eq-flights');
  const phoneEl = document.getElementById('eq-phones');

  if (treeEl) treeEl.textContent = Math.max(1, Math.round(total / 1.8)).toString();
  if (flightEl) flightEl.textContent = (total / 90.0).toFixed(1);
  if (phoneEl) phoneEl.textContent = Math.round(total / 0.008).toLocaleString();

  updateGamification();
  refreshCharts(t, e, d, c, total);
}

/**
 * Safely builds recommendation cards without innerHTML.
 */
function updateRecommendations(t, e, d, c) {
  const listEl = document.getElementById('recommendations-list');
  if (!listEl) return;
  
  listEl.textContent = '';
  
  const sectors = [
    { name: 'Transportation', value: t, icon: 'car', tip: 'Your transportation footprint is high. Consider carpooling, utility-shifting to public transit, or checking eco-driving styles to lower fuel costs.', threshold: 120 },
    { name: 'Home Energy', value: e, icon: 'home', tip: 'Heating and electricity are heavy drivers. Try turning down the thermostat by 2 degrees, washing clothes in cold water, or sourcing clean energy options.', threshold: 100 },
    { name: 'Diet & Food Sourcing', value: d, icon: 'soup', tip: 'Food accounts for significant lifecycle carbon. Committing to vegetarian meals twice a week and sourcing local items can save up to 40 kg CO2/month.', threshold: 140 },
    { name: 'Consumption & Waste', value: c, icon: 'shopping-bag', tip: 'Consumer patterns generate waste. Prioritize recycling programs, buy pre-owned products, and minimize plastic purchases.', threshold: 60 }
  ];

  sectors.sort((x, y) => y.value - x.value);

  sectors.forEach(sec => {
    const isWarning = sec.value > sec.threshold;
    const card = document.createElement('div');
    card.className = 'glass-card rec-card';
    
    const iconWrapper = document.createElement('div');
    iconWrapper.className = `rec-icon ${isWarning ? 'high-warning' : ''}`;
    const iconEl = document.createElement('i');
    iconEl.setAttribute('data-lucide', sec.icon);
    iconWrapper.appendChild(iconEl);

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'rec-content';
    
    const header = document.createElement('h4');
    header.textContent = `${sec.name} Sector: ${sec.value} kg CO₂ / mo`;
    
    const description = document.createElement('p');
    description.textContent = sec.tip;

    contentWrapper.appendChild(header);
    contentWrapper.appendChild(description);

    card.appendChild(iconWrapper);
    card.appendChild(contentWrapper);
    listEl.appendChild(card);
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Refreshes gamified states, levels, and progress bars.
 */
function updateGamification() {
  const xpCount = AppState.user.xp;
  let level = 'Eco-Novice';
  let minXp = 0;
  let maxXp = 100;

  if (xpCount >= 600) {
    level = 'Planet Savior';
    minXp = 600;
    maxXp = 1000;
  } else if (xpCount >= 300) {
    level = 'Climate Champion';
    minXp = 300;
    maxXp = 600;
  } else if (xpCount >= 100) {
    level = 'Carbon Guardian';
    minXp = 100;
    maxXp = 300;
  }

  AppState.user.level = level;

  const streakEl = document.getElementById('streak-count');
  if (streakEl) streakEl.textContent = AppState.user.streak.toString();

  const levelEl = document.getElementById('user-level');
  if (levelEl) levelEl.textContent = level;

  const progressPctEl = document.getElementById('level-progress-pct');
  const progressFillEl = document.getElementById('level-progress-fill');
  if (progressPctEl && progressFillEl) {
    const pct = Math.min(100, Math.round(((xpCount - minXp) / (maxXp - minXp)) * 100));
    progressPctEl.textContent = `${pct}%`;
    progressFillEl.style.width = `${pct}%`;
  }
}

/**
 * Securely builds habit cards avoiding raw innerHTML structures.
 */
function initChallenges() {
  const container = document.getElementById('challenges-container');
  if (!container) return;

  container.textContent = '';

  AppState.challenges.forEach(ch => {
    const isCommitted = AppState.commitments.includes(ch.id);
    const isCompleted = AppState.completedToday.includes(ch.id);
    
    const card = document.createElement('div');
    card.className = 'glass-card challenge-card';
    card.id = `challenge-${ch.id}`;
    
    // Main content container
    const cardMain = document.createElement('div');
    cardMain.className = 'card-main';

    const categoryTag = document.createElement('span');
    categoryTag.className = `challenge-tag ${ch.cat}`;
    categoryTag.textContent = ch.cat;

    const title = document.createElement('h4');
    title.className = 'challenge-title';
    title.textContent = ch.title;

    const desc = document.createElement('p');
    desc.className = 'challenge-desc';
    desc.textContent = ch.desc;

    const impact = document.createElement('span');
    impact.className = 'challenge-impact';
    impact.textContent = `Impact: -${ch.savings} kg CO₂ / mo`;

    cardMain.appendChild(categoryTag);
    cardMain.appendChild(title);
    cardMain.appendChild(desc);
    cardMain.appendChild(impact);

    // Button actions container
    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'challenge-actions';

    const commitBtn = document.createElement('button');
    commitBtn.className = `btn btn-outline ${isCommitted ? 'committed' : ''}`;
    commitBtn.setAttribute('aria-label', `Commit to ${ch.title}`);
    commitBtn.onclick = () => toggleCommitment(ch.id);

    const commitIcon = document.createElement('i');
    commitIcon.setAttribute('data-lucide', isCommitted ? 'check-circle-2' : 'plus');
    const commitText = document.createElement('span');
    commitText.textContent = isCommitted ? 'Committed' : 'Commit';
    
    commitBtn.appendChild(commitIcon);
    commitBtn.appendChild(commitText);

    const completeBtn = document.createElement('button');
    completeBtn.className = 'btn btn-success';
    completeBtn.setAttribute('aria-label', `Complete ${ch.title}`);
    if (isCompleted) {
      completeBtn.setAttribute('disabled', 'true');
    }
    completeBtn.onclick = () => completeChallenge(ch.id);

    const completeIcon = document.createElement('i');
    completeIcon.setAttribute('data-lucide', 'award');
    const completeText = document.createElement('span');
    completeText.textContent = isCompleted ? 'Done!' : 'Complete';

    completeBtn.appendChild(completeIcon);
    completeBtn.appendChild(completeText);

    actionsWrapper.appendChild(commitBtn);
    actionsWrapper.appendChild(completeBtn);

    card.appendChild(cardMain);
    card.appendChild(actionsWrapper);
    container.appendChild(card);
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Toggles commitment state.
 * @param {string} challengeId
 */
window.toggleCommitment = function(challengeId) {
  const index = AppState.commitments.indexOf(challengeId);
  if (index === -1) {
    AppState.commitments.push(challengeId);
    AppState.user.xp += 10;
  } else {
    AppState.commitments.splice(index, 1);
    AppState.user.xp = Math.max(0, AppState.user.xp - 10);
  }
  
  initChallenges();
  recalculateEmissions();
};

/**
 * Completes carbon challenge.
 * @param {string} challengeId
 */
window.completeChallenge = function(challengeId) {
  if (AppState.completedToday.includes(challengeId)) return;
  
  const challenge = AppState.challenges.find(c => c.id === challengeId);
  AppState.completedToday.push(challengeId);
  AppState.user.xp += challenge.xp;
  AppState.user.streak += 1;
  
  initChallenges();
  recalculateEmissions();
};

// Chart.js initialization
function initCharts() {
  if (typeof Chart === 'undefined') return;

  const ctxPie = document.getElementById('breakdownChart');
  if (ctxPie) {
    breakdownChart = new Chart(ctxPie, {
      type: 'doughnut',
      data: {
        labels: ['Transportation', 'Home Energy', 'Diet & Food', 'Consumption'],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: [
            'rgba(139, 92, 246, 0.7)',
            'rgba(6, 182, 212, 0.7)',
            'rgba(16, 185, 129, 0.7)',
            'rgba(245, 158, 11, 0.7)'
          ],
          borderColor: 'rgba(15, 23, 42, 0.9)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 11 }
            }
          }
        }
      }
    });
  }

  const ctxLine = document.getElementById('projectionChart');
  if (ctxLine) {
    projectionChart = new Chart(ctxLine, {
      type: 'line',
      data: {
        labels: ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'],
        datasets: [
          {
            label: 'Business As Usual',
            data: [0, 0, 0, 0, 0, 0],
            borderColor: 'rgba(239, 68, 68, 0.8)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            tension: 0.1
          },
          {
            label: 'EcoSphere Path',
            data: [0, 0, 0, 0, 0, 0],
            borderColor: 'rgba(16, 185, 129, 0.9)',
            borderWidth: 3,
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            fill: true,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8' }
          },
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.02)' },
            ticks: { color: '#94a3b8' }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 11 }
            }
          }
        }
      }
    });
  }
}

// Refreshes the active values of charts
function refreshCharts(t, e, d, c, total) {
  if (breakdownChart) {
    breakdownChart.data.datasets[0].data = [t, e, d, c];
    breakdownChart.update();
  }

  if (projectionChart) {
    let totalSavings = 0;
    AppState.commitments.forEach(cid => {
      const ch = AppState.challenges.find(x => x.id === cid);
      if (ch) totalSavings += ch.savings;
    });

    const bauPath = [total, total, total, total, total, total];
    const ecoPath = [
      total,
      Math.max(10, total - totalSavings * 0.3),
      Math.max(10, total - totalSavings * 0.6),
      Math.max(10, total - totalSavings * 0.85),
      Math.max(10, total - totalSavings),
      Math.max(10, total - totalSavings)
    ];

    projectionChart.data.datasets[0].data = bauPath.map(v => Math.round(v));
    projectionChart.data.datasets[1].data = ecoPath.map(v => Math.round(v));
    projectionChart.update();
  }
}
