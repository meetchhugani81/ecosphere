/* ==========================================================================
   EcoSphere Core JavaScript Application
   Core Modules: Carbon Engine, State Management, UI Renderers, Chart Bindings
   ========================================================================== */

// 1. Carbon Calculation Engine (Exported to window for test visibility)
const CarbonEngine = {
  // Transport formulas (monthly basis)
  calculateTransport(carType, carMileage, transitMileage, flightHours) {
    let carFactor = 0;
    switch (carType) {
      case 'petrol': carFactor = 0.404; break;
      case 'hybrid': carFactor = 0.200; break;
      case 'ev': carFactor = 0.080; break;
      case 'moto': carFactor = 0.210; break;
      case 'none': carFactor = 0.000; break;
    }
    // weekly mileage * 4.33 weeks per month
    const carEmissions = carMileage * 4.33 * carFactor;
    const transitEmissions = transitMileage * 4.33 * 0.14;
    // flights: annual flight hours * 90kg / 12 months
    const flightEmissions = (flightHours * 90.0) / 12;
    
    return Number((carEmissions + transitEmissions + flightEmissions).toFixed(1));
  },

  // Home Energy formulas (monthly basis)
  calculateEnergy(electricityBill, heatingBill, cleanPct) {
    const kwhRate = 0.16; // $0.16 per kWh average
    const cleanReductionMultiplier = 1 - (cleanPct / 100);
    
    const electricityEmissions = (electricityBill / kwhRate) * 0.371 * cleanReductionMultiplier;
    // Heating fuel emission approximation ($1 = 0.42 kg CO2)
    const heatingEmissions = heatingBill * 0.42;

    return Number((electricityEmissions + heatingEmissions).toFixed(1));
  },

  // Diet & Food formulas (monthly basis)
  calculateDiet(dietType, localFood, minimizeWaste) {
    let dietEmissions = 0;
    switch (dietType) {
      case 'meat-heavy': dietEmissions = 275.0; break; // 3300 kg/yr / 12
      case 'average': dietEmissions = 208.3; break;    // 2500 kg/yr / 12
      case 'vegetarian': dietEmissions = 141.7; break; // 1700 kg/yr / 12
      case 'vegan': dietEmissions = 125.0; break;      // 1500 kg/yr / 12
    }
    
    if (localFood) dietEmissions -= 10;
    if (minimizeWaste) dietEmissions -= 15;
    
    return Number(Math.max(20, dietEmissions).toFixed(1));
  },

  // Consumption & Waste formulas (monthly basis)
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

window.CarbonEngine = CarbonEngine; // Expose globally for tests

// 2. Initial Application State
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
  // Saved challenges / habits database
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
  commitments: [], // list of challenge IDs committed to
  completedToday: [] // list of challenge IDs completed today
};

// 3. UI Chart Variables
let breakdownChart = null;
let projectionChart = null;

// 4. Initialize Core Listeners & App Lifecycle
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initFormInputs();
  initChallenges();
  recalculateEmissions();
  initCharts();
  
  // Connect test runner elements
  const runTestsBtn = document.getElementById('run-tests-btn');
  if (runTestsBtn) {
    runTestsBtn.addEventListener('click', () => {
      if (window.runTestSuite) {
        window.runTestSuite();
      }
    });
  }

  // Trigger Lucide icons rendering
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

// Navigation controller (Tab management)
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.content-section');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.getAttribute('data-target');
      
      // Update sidebar state
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Update active content tab
      sections.forEach(section => {
        section.classList.remove('active');
        if (section.getAttribute('id') === targetId) {
          section.classList.add('active');
        }
      });

      // Special resize hook for charts if switching back to overview dashboard
      if (targetId === 'dashboard') {
        if (breakdownChart) breakdownChart.resize();
        if (projectionChart) projectionChart.resize();
      }
    });
  });
}

// Bind Range Sliders, Dropdowns, Toggles to Calculations
function initFormInputs() {
  // Input fields binding helper
  const bindInput = (id, stateKey, isCheckbox = false) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('input', (e) => {
      const value = isCheckbox ? e.target.checked : e.target.value;
      AppState.inputs[stateKey] = isCheckbox ? value : (isNaN(value) ? value : Number(value));
      
      // Update UI Text values for range slider badges
      const valBadge = document.getElementById(`${id}-val`);
      if (valBadge) {
        valBadge.textContent = value;
      }
      
      recalculateEmissions();
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

// Global Core Calculation Controller
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

// Update Footprint Indicators, Gauges, Levels
function updateDashboardUI(t, e, d, c, total) {
  // 1. Update Numeric Values
  const valueDisplay = document.getElementById('current-footprint-value');
  if (valueDisplay) valueDisplay.textContent = total;

  // 2. Animate Circular Progress Ring
  const circle = document.getElementById('footprint-circle');
  if (circle) {
    const maxVal = 1000; // gauge cap scale
    const circumference = 565.48; // 2 * PI * 90
    const clampedVal = Math.min(total, maxVal);
    const offset = circumference - (clampedVal / maxVal) * circumference;
    circle.style.strokeDashoffset = offset;
  }

  // 3. Comparison status versus target baseline (Average is 400 kg/month)
  const compDisplay = document.getElementById('footprint-vs-avg');
  if (compDisplay) {
    const baseline = 400; // Global target: 4.8 tons/year = 400 kg/month
    const diffPct = Math.round((Math.abs(total - baseline) / baseline) * 100);
    if (total <= baseline) {
      compDisplay.innerHTML = `Nice! Your footprint is <span class="highlight">${diffPct}% below</span> the target global baseline (400 kg/mo).`;
    } else {
      compDisplay.innerHTML = `Attention: Your footprint is <span class="highlight danger">${diffPct}% above</span> the target global baseline (400 kg/mo).`;
    }
  }

  // 4. Update Equivalency Statistics
  const treeEl = document.getElementById('eq-trees');
  const flightEl = document.getElementById('eq-flights');
  const phoneEl = document.getElementById('eq-phones');

  if (treeEl) {
    // 1 mature tree absorbs ~1.8 kg CO2 per month
    treeEl.textContent = Math.max(1, Math.round(total / 1.8));
  }
  if (flightEl) {
    // 1 short flight (1 hour) is approx 90 kg CO2
    flightEl.textContent = (total / 90.0).toFixed(1);
  }
  if (phoneEl) {
    // 1 smartphone charge is approx 0.008 kg CO2
    phoneEl.textContent = Math.round(total / 0.008).toLocaleString();
  }

  // 5. Update Gamification Badges & Levels
  updateGamification();

  // 6. Refresh chart plots dynamically
  refreshCharts(t, e, d, c, total);
}

// Generate Personalized Recommendations based on highest sectors
function updateRecommendations(t, e, d, c) {
  const listEl = document.getElementById('recommendations-list');
  if (!listEl) return;
  
  listEl.innerHTML = '';
  
  const sectors = [
    { name: 'Transportation', value: t, icon: 'car', tip: 'Your transportation footprint is high. Consider carpooling, utility-shifting to public transit, or checking eco-driving styles to lower fuel costs.', threshold: 120 },
    { name: 'Home Energy', value: e, icon: 'home', tip: 'Heating and electricity are heavy drivers. Try turning down the thermostat by 2 degrees, washing clothes in cold water, or sourcing clean energy options.', threshold: 100 },
    { name: 'Diet & Food Sourcing', value: d, icon: 'soup', tip: 'Food accounts for significant lifecycle carbon. Committing to vegetarian meals twice a week and sourcing local items can save up to 40 kg CO2/month.', threshold: 140 },
    { name: 'Consumption & Waste', value: c, icon: 'shopping-bag', tip: 'Consumer patterns generate waste. Prioritize recycling programs, buy pre-owned products, and minimize plastic purchases.', threshold: 60 }
  ];

  // Sort sectors descending by emissions
  sectors.sort((a, b) => b.value - a.value);

  sectors.forEach(sec => {
    const isWarning = sec.value > sec.threshold;
    const card = document.createElement('div');
    card.className = 'glass-card rec-card';
    
    card.innerHTML = `
      <div class="rec-icon ${isWarning ? 'high-warning' : ''}">
        <i data-lucide="${sec.icon}"></i>
      </div>
      <div class="rec-content">
        <h4>${sec.name} Sector: ${sec.value} kg CO₂ / mo</h4>
        <p>${sec.tip}</p>
      </div>
    `;
    listEl.appendChild(card);
  });

  if (window.lucide) window.lucide.createIcons();
}

// Setup Gamification & Badge Leveling
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
  } else {
    level = 'Eco-Novice';
    minXp = 0;
    maxXp = 100;
  }

  AppState.user.level = level;

  // Render Streak Badge
  const streakEl = document.getElementById('streak-count');
  if (streakEl) streakEl.textContent = AppState.user.streak;

  // Render User Level
  const levelEl = document.getElementById('user-level');
  if (levelEl) levelEl.textContent = level;

  // Level progress bar
  const progressPctEl = document.getElementById('level-progress-pct');
  const progressFillEl = document.getElementById('level-progress-fill');
  if (progressPctEl && progressFillEl) {
    const pct = Math.min(100, Math.round(((xpCount - minXp) / (maxXp - minXp)) * 100));
    progressPctEl.textContent = `${pct}%`;
    progressFillEl.style.width = `${pct}%`;
  }
}

// Generate Challenge and Eco-Habit cards
function initChallenges() {
  const container = document.getElementById('challenges-container');
  if (!container) return;

  container.innerHTML = '';

  AppState.challenges.forEach(ch => {
    const isCommitted = AppState.commitments.includes(ch.id);
    const isCompleted = AppState.completedToday.includes(ch.id);
    
    const card = document.createElement('div');
    card.className = 'glass-card challenge-card';
    card.id = `challenge-${ch.id}`;
    
    card.innerHTML = `
      <div class="card-main">
        <span class="challenge-tag ${ch.cat}">${ch.cat}</span>
        <h4 class="challenge-title">${ch.title}</h4>
        <p class="challenge-desc">${ch.desc}</p>
        <span class="challenge-impact">Impact: -${ch.savings} kg CO₂ / mo</span>
      </div>
      <div class="challenge-actions">
        <button class="btn btn-outline ${isCommitted ? 'committed' : ''}" 
                onclick="toggleCommitment('${ch.id}')"
                aria-label="Commit to ${ch.title}">
          <i data-lucide="${isCommitted ? 'check-circle-2' : 'plus'}"></i>
          <span>${isCommitted ? 'Committed' : 'Commit'}</span>
        </button>
        <button class="btn btn-success" 
                onclick="completeChallenge('${ch.id}')" 
                ${isCompleted ? 'disabled' : ''}
                aria-label="Complete ${ch.title}">
          <i data-lucide="award"></i>
          <span>${isCompleted ? 'Done!' : 'Complete'}</span>
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  if (window.lucide) window.lucide.createIcons();
}

// Toggle Commit state for an action
window.toggleCommitment = function(challengeId) {
  const index = AppState.commitments.indexOf(challengeId);
  const challenge = AppState.challenges.find(c => c.id === challengeId);
  
  if (index === -1) {
    AppState.commitments.push(challengeId);
    AppState.user.xp += 10; // 10 XP for commitment
  } else {
    AppState.commitments.splice(index, 1);
    AppState.user.xp = Math.max(0, AppState.user.xp - 10);
  }
  
  initChallenges();
  recalculateEmissions();
};

// Complete a challenge logic
window.completeChallenge = function(challengeId) {
  if (AppState.completedToday.includes(challengeId)) return;
  
  const challenge = AppState.challenges.find(c => c.id === challengeId);
  AppState.completedToday.push(challengeId);
  AppState.user.xp += challenge.xp; // award xp
  
  // Award streak progress
  AppState.user.streak += 1;
  
  initChallenges();
  recalculateEmissions();
};

// 5. Chart.js Setup & Refresh Methods
function initCharts() {
  // Check if Chart.js is loaded
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
            'rgba(139, 92, 246, 0.7)',  // Violet
            'rgba(6, 182, 212, 0.7)',   // Cyan
            'rgba(16, 185, 129, 0.7)',  // Emerald Green
            'rgba(245, 158, 11, 0.7)'   // Amber
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

// Redraw chart indicators
function refreshCharts(t, e, d, c, total) {
  if (breakdownChart) {
    breakdownChart.data.datasets[0].data = [t, e, d, c];
    breakdownChart.update();
  }

  if (projectionChart) {
    // Calculate committed reduction sum
    let totalSavings = 0;
    AppState.commitments.forEach(cid => {
      const ch = AppState.challenges.find(x => x.id === cid);
      if (ch) totalSavings += ch.savings;
    });

    // Simulated 6 month projection paths
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
