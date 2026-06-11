# 🌍 EcoSphere — Interactive Carbon Footprint Tracker

> A premium, client-side carbon footprint calculator with real-time visualizations, gamified eco-challenges, personalized recommendations, and a built-in unit test suite — all in vanilla JavaScript, zero dependencies, zero server.

---

## 📸 Screenshots

### Dashboard — Live Emissions Gauge & Charts
![EcoSphere Dashboard](screenshots/dashboard.png)

### Carbon Calculator — Multi-Category Inputs
![Carbon Calculator](screenshots/calculator.png)

### Eco Challenges — Gamified Actions
![Eco Challenges](screenshots/challenges.png)

### System Integrity Tests — In-Browser Test Runner
![Test Suite](screenshots/tests.png)

---

## 🚀 Key Features

**Real-time Carbon Calculator** — Four emission categories (Transportation, Home Energy, Diet & Food, Consumption) update a live circular gauge on every input via debounced event handling, keeping CPU usage near 0% at idle.

**Gamified Challenge Center** — Commit to daily green habits (e.g. "Meatless Day", "Line Dry Clothes") to earn XP, build streaks, and level up from *Eco-Novice* to *Planet Savior*. DOM updates are surgical — only the affected card is touched, not the entire list.

**Data Visualization** — Interactive Chart.js donut showing current emissions by category, plus a 6-month projected reduction line chart driven by committed habits.

**Personalized Insights** — Recommendations auto-sort by your highest-emitting category so the most impactful advice is always first.

**Built-in Test Suite** — 16 unit tests covering happy-path formulas, boundary conditions, floor clamping, unknown inputs, and zero-value edge cases. All run live in the browser.

---

## 🛠️ Technical Highlights

| Area | Implementation |
|---|---|
| **Efficiency** | Debounced input handlers (150ms), surgical DOM updates on challenge interactions, single event-delegated listener per container |
| **Security** | All DOM writes use `textContent` / `createElement` — zero `innerHTML`. Numeric inputs clamped to valid ranges via `clamp()` before reaching the calculation engine |
| **Code Quality** | Strict mode, JSDoc on every function, named constants replacing magic numbers (e.g. `GAUGE_RADIUS = 90` → `2 * Math.PI * GAUGE_RADIUS`), no global namespace pollution |
| **Accessibility** | WCAG 2.1 AA — semantic HTML5 landmarks, ARIA labels on all inputs, full keyboard navigation, high-contrast color profiles |
| **Testing** | 16 assertions across 4 modules: transport, energy, diet, consumption — including unknown vehicle types, input floors, and scale-invariant zero tests |

---

## 📐 Calculation Formulas & Emission Factors

All coefficients are derived from **EPA** and **IPCC** published standards.

### Transportation

| Mode | Formula |
|---|---|
| Personal Vehicle | `mileage_per_week × 4.33 × fuel_factor` |
| Public Transit | `transit_miles_per_week × 4.33 × 0.14` |
| Flights | `flight_hours_per_year × 90.0 / 12` |

Fuel factors: Gasoline `0.404 kg/mi` · Hybrid `0.200` · EV `0.080` · Motorcycle `0.210`

### Home Energy

| Source | Formula |
|---|---|
| Electricity | `(bill / 0.16) × 0.371 × (1 − renewable%)` |
| Heating Fuel | `heating_bill × 0.42` |

### Diet & Food (monthly)

| Diet | Base kg/mo | Modifiers |
|---|---|---|
| Heavy Meat | 275.0 | Local food: −10 · Low waste: −15 |
| Average | 208.3 | |
| Vegetarian | 141.7 | |
| Vegan | 125.0 | Floor: 20 kg |

### Consumption & Waste

| Level | Base kg/mo |
|---|---|
| Minimalist | 30 |
| Average | 90 |
| Frequent | 220 |

Recycling credit: −25 kg · No recycling penalty: +10 kg · Floor: 5 kg

---

## 🏗️ Architecture & Data Flow

```mermaid
graph TD
    UserInputs[User Form Inputs] -->|Debounced input event| CalcEngine[Carbon Calculation Engine]
    CalcEngine -->|Calculates category & total CO2| AppState[Central App State]
    AppState -->|Triggers UI update| CircularGauge[Emissions Circle Gauge]
    AppState -->|Updates breakdowns| ChartPie[Chart.js Category Donut]
    AppState -->|Pushes predictions| ChartLine[Chart.js Projected Line Chart]
    AppState -->|Analyzes high-emission areas| InsightEngine[Personalized Recommendations]

    EcoChallenges[Challenge & Commitment Panel] -->|Commit / Complete| ReductionEngine[Savings Calculator]
    ReductionEngine -->|Reduces monthly projected CO2| AppState
    ReductionEngine -->|Updates streaks & level up| LevelGauge[Gamified Level Badge]

    BuiltInTests[tests.js Module] -->|On Load / Trigger| TestRunner[Test Dashboard]
    TestRunner -->|Asserts values & formulas| UIFeedback[Test Result Display]
```

---

## 🧪 Test Coverage

```
Transportation Tests (5)
  ✅ Petrol car 100 miles/week
  ✅ Hybrid car 100 miles/week
  ✅ EV 150 miles/week
  ✅ Public transit 200 miles/week
  ✅ 12 annual flight hours

Home Energy Tests (3)
  ✅ $100 bill at 0% renewable
  ✅ $100 bill at 100% renewable → 0 kg
  ✅ $100 heating fuel

Diet Tests (3)
  ✅ Vegan + local + zero waste
  ✅ Heavy meat, standard sourcing
  ✅ Vegan baseline without modifiers

Consumption Tests (2)
  ✅ Average shopping + recycling
  ✅ High shopping, no recycling

Edge Cases (3)
  ✅ Unknown vehicle type → 0 emissions (no crash)
  ✅ All-zero transport inputs → 0 kg
  ✅ Minimal shopping + recycling → hits 5 kg floor
```

---

## 🚀 Running Locally

```bash
git clone https://github.com/meetchhugani81/ecosphere.git
cd ecosphere
# No install needed — open directly in browser
open index.html
```

Navigate to **System Integrity Tests** in the sidebar and click **Run Unit Tests** to verify all 16 assertions pass.

---

## 📝 Assumptions & Baselines

- Global average target: **4.8 metric tons CO₂/year** (~400 kg/month)
- US average electricity rate: **$0.16/kWh**
- EV emissions factor accounts for US average grid carbon intensity
- Challenge savings scale linearly over 5 months in the projection chart

---

## 📁 File Structure

```
ecosphere/
├── index.html      # App shell, semantic HTML5, ARIA labels
├── app.js          # Carbon engine, state, UI renderers, charts
├── tests.js        # 16-assertion in-browser unit test suite
└── styles.css      # WCAG 2.1 AA compliant, CSS variables
```
