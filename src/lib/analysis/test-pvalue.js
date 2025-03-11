// Import jStat
const jStat = require('jstat').jStat;

/**
 * Test function to verify p-value calculations
 */
function testPValueCalculation() {
  // Example from the user's prompt
  const F_value = 5.7;
  const numerator_df = 2;  // (3 styles - 1)
  const denominator_df = 24;

  // Calculate p-value using jStat
  const p_value = 1 - jStat.centralF.cdf(F_value, numerator_df, denominator_df);
  
  console.log("F-value:", F_value);
  console.log("Numerator df:", numerator_df);
  console.log("Denominator df:", denominator_df);
  console.log("p-value:", p_value);
  
  // Test a few more examples
  const examples = [
    { F: 1.5, dfNum: 1, dfDenom: 10 },
    { F: 3.2, dfNum: 2, dfDenom: 15 },
    { F: 10.5, dfNum: 3, dfDenom: 30 },
    { F: 0.8, dfNum: 1, dfDenom: 20 }
  ];
  
  console.log("\nAdditional examples:");
  examples.forEach(ex => {
    const pVal = 1 - jStat.centralF.cdf(ex.F, ex.dfNum, ex.dfDenom);
    console.log(`F=${ex.F}, dfNum=${ex.dfNum}, dfDenom=${ex.dfDenom} => p-value=${pVal}`);
  });
}

// Run the test
testPValueCalculation(); 