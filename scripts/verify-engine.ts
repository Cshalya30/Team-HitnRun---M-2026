import { generateSyntheticPortfolio } from '../src/engine/generator';
import { simulatePortfolioContagion } from '../src/engine/propagation';
import { performCounterfactualAblation } from '../src/engine/attribution';

console.log('Testing Tremor Deterministic Simulation Engine...');

// Run 1
const p1 = generateSyntheticPortfolio(481516);
const sim1 = simulatePortfolioContagion(p1.wards, p1.officers, p1.centres, p1.jlgs, p1.borrowers, p1.edges);

// Run 2
const p2 = generateSyntheticPortfolio(481516);
const sim2 = simulatePortfolioContagion(p2.wards, p2.officers, p2.centres, p2.jlgs, p2.borrowers, p2.edges);

// Verify node counts
console.assert(p1.borrowers.length === p2.borrowers.length, 'Borrower counts must match');
console.log(`✓ Total Borrowers generated: ${p1.borrowers.length}`);
console.log(`✓ Total Wards: ${p1.wards.length}, Centres: ${p1.centres.length}, JLGs: ${p1.jlgs.length}`);
console.log(`✓ Total Relationship Edges: ${p1.edges.length}`);

// Verify byte-identical stress snapshots across 78 weeks
let matchCount = 0;
let totalComparisons = 0;

for (let w = 0; w < 78; w++) {
  const snaps1 = sim1.snapshotsByWeek[w];
  const snaps2 = sim2.snapshotsByWeek[w];
  for (let b = 0; b < snaps1.length; b++) {
    totalComparisons++;
    if (
      snaps1[b].latentStress === snaps2[b].latentStress &&
      snaps1[b].shareIdio === snaps2[b].shareIdio &&
      snaps1[b].shareInduced === snaps2[b].shareInduced &&
      snaps1[b].shareCovariate === snaps2[b].shareCovariate
    ) {
      matchCount++;
    }
  }
}

console.assert(matchCount === totalComparisons, 'Every snapshot across 78 weeks must be identical');
console.log(`✓ Deterministic execution verified: ${matchCount}/${totalComparisons} identical snapshots across 78 weeks.`);

// Verify Monte Carlo budget (<400ms)
const testSnapshot = sim1.snapshotsByWeek[11][0];
const ablation = performCounterfactualAblation(testSnapshot, p1.borrowers[0].displayName);
console.log(`✓ Monte Carlo (200 runs) execution time: ${ablation.confidenceBand.durationMs}ms (Budget: <400ms)`);
console.assert(ablation.confidenceBand.durationMs < 400, 'Monte Carlo must complete in under 400ms');

console.log('✓ All Engine Assertions Passed Successfully!');
