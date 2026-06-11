/* ==========================================================================
   EcoSphere Test Suite
   Automated unit testing for Carbon Calculation Engine formulas & baselines
   ========================================================================== */

(function() {
  // Simple Assert Library
  const Assert = {
    logs: [],
    passCount: 0,
    failCount: 0,

    reset() {
      this.logs = [];
      this.passCount = 0;
      this.failCount = 0;
    },

    info(msg) {
      this.logs.push({ type: 'info', text: `[INFO] ${msg}` });
      console.log(`%c[INFO] ${msg}`, 'color: #94a3b8');
    },

    assertEqual(actual, expected, desc) {
      if (Math.abs(actual - expected) < 0.05) {
        this.passCount++;
        this.logs.push({ type: 'pass', text: `[PASS] ${desc} (Got: ${actual})` });
        console.log(`%c[PASS] ${desc} (Got: ${actual})`, 'color: #4ade80');
      } else {
        this.failCount++;
        this.logs.push({ type: 'fail', text: `[FAIL] ${desc} (Expected: ${expected}, Got: ${actual})` });
        console.error(`[FAIL] ${desc} (Expected: ${expected}, Got: ${actual})`);
      }
    }
  };

  // Run Test Suite function
  function runTestSuite() {
    Assert.reset();
    Assert.info("Starting EcoSphere System Integrity Tests...");
    
    const engine = window.CarbonEngine;
    if (!engine) {
      Assert.logs.push({ type: 'fail', text: "[CRITICAL] Carbon Calculation Engine not found on window object!" });
      updateTestUI();
      return;
    }

    // --- TRANSPORT TESTS ---
    Assert.info("Running Transportation Formula Tests...");
    
    // Petrol Car Calculation: 100 miles/wk, 0 transit, 0 flights.
    // Formula: 100 * 4.33 * 0.404 = 174.9 kg
    Assert.assertEqual(
      engine.calculateTransport('petrol', 100, 0, 0),
      174.9,
      "Petrol Car 100 miles/week calculation"
    );

    // Hybrid Car Calculation: 100 miles/wk, 0 transit, 0 flights.
    // Formula: 100 * 4.33 * 0.200 = 86.6 kg
    Assert.assertEqual(
      engine.calculateTransport('hybrid', 100, 0, 0),
      86.6,
      "Hybrid Car 100 miles/week calculation"
    );

    // EV Calculation: 150 miles/wk, 0 transit, 0 flights.
    // Formula: 150 * 4.33 * 0.080 = 52.0 kg
    Assert.assertEqual(
      engine.calculateTransport('ev', 150, 0, 0),
      52.0,
      "Electric Vehicle 150 miles/week calculation"
    );

    // Public Transit: 0 car, 200 miles/wk transit, 0 flights.
    // Formula: 200 * 4.33 * 0.14 = 121.2 kg
    Assert.assertEqual(
      engine.calculateTransport('none', 0, 200, 0),
      121.2,
      "Public Transit 200 miles/week calculation"
    );

    // Flights: 0 car, 0 transit, 12 flights/yr.
    // Formula: (12 * 90.0) / 12 = 90.0 kg
    Assert.assertEqual(
      engine.calculateTransport('none', 0, 0, 12),
      90.0,
      "Yearly 12 flight hours monthly breakdown"
    );


    // --- HOME ENERGY TESTS ---
    Assert.info("Running Home Energy Formula Tests...");

    // Electricity: $100 bill, $0 heating, 0% clean power.
    // Formula: (100 / 0.16) * 0.371 * 1.0 = 231.9 kg
    Assert.assertEqual(
      engine.calculateEnergy(100, 0, 0),
      231.9,
      "Electricity bill $100 with 0% renewable share"
    );

    // Electricity: $100 bill, $0 heating, 100% clean power.
    // Formula: (100 / 0.16) * 0.371 * 0.0 = 0.0 kg
    Assert.assertEqual(
      engine.calculateEnergy(100, 0, 100),
      0.0,
      "Electricity bill $100 with 100% renewable share"
    );

    // Heating Fuel: $0 electricity, $100 heating.
    // Formula: 100 * 0.42 = 42.0 kg
    Assert.assertEqual(
      engine.calculateEnergy(0, 100, 0),
      42.0,
      "Heating fuel bill $100 calculation"
    );


    // --- DIET & FOOD TESTS ---
    Assert.info("Running Diet & Food Sourcing Tests...");

    // Vegan: Base 125.0 kg, local food (-10), minimized waste (-15)
    // Formula: 125.0 - 10 - 15 = 100 kg
    Assert.assertEqual(
      engine.calculateDiet('vegan', true, true),
      100.0,
      "Vegan profile with local food and zero waste"
    );

    // Heavy Meat: Base 275.0 kg, no local food, high waste (no deductions)
    // Formula: 275.0 kg
    Assert.assertEqual(
      engine.calculateDiet('meat-heavy', false, false),
      275.0,
      "Heavy Meat profile with standard sourcing"
    );


    // --- CONSUMPTION TESTS ---
    Assert.info("Running Consumption & Shopping Tests...");

    // Average Shopping: Base 90.0 kg, recycling (-25)
    // Formula: 90.0 - 25 = 65.0 kg
    Assert.assertEqual(
      engine.calculateConsumption('average', true),
      65.0,
      "Average shopping habits with active recycling"
    );

    // High Shopping: Base 220.0 kg, no recycling (+10)
    // Formula: 220.0 + 10 = 230.0 kg
    Assert.assertEqual(
      engine.calculateConsumption('high', false),
      230.0,
      "Frequent shopping habits with no recycling"
    );

    Assert.info("Unit tests completed.");
    updateTestUI();
  }

  // Update DOM Test Console
  function updateTestUI() {
    const terminal = document.getElementById('test-log');
    const summaryBadge = document.getElementById('test-summary');

    if (!terminal) return;

    terminal.innerHTML = '';
    Assert.logs.forEach(log => {
      const line = document.createElement('div');
      line.className = `terminal-line-${log.type}`;
      line.textContent = log.text;
      terminal.appendChild(line);
    });

    if (summaryBadge) {
      if (Assert.failCount === 0) {
        summaryBadge.innerHTML = `<span class="test-badge-pass">✅ ${Assert.passCount} / ${Assert.passCount} passed</span>`;
      } else {
        summaryBadge.innerHTML = `<span class="test-badge-fail">❌ ${Assert.failCount} failed, ${Assert.passCount} passed</span>`;
      }
    }
  }

  // Expose run function globally
  window.runTestSuite = runTestSuite;
})();
