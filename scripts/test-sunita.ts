import { generateSyntheticPortfolio, simulatePortfolioContagion } from '../src/engine';
import { Shock } from '../src/engine/types';

const p = generateSyntheticPortfolio(481516);
const lakshmi = p.borrowers.find(b => b.id === 'b-411')!;
const sunita = p.borrowers.find(b => b.id === 'b-413')!;

console.log('Lakshmi:', lakshmi.id, lakshmi.displayName);
console.log('Sunita:', sunita.id, sunita.displayName);

const edges = p.edges.filter(e => 
  (e.srcBorrowerId === lakshmi.id && e.dstBorrowerId === sunita.id) ||
  (e.srcBorrowerId === sunita.id && e.dstBorrowerId === lakshmi.id)
);
console.log('Guarantee edge between them:', edges);

const shock: Shock = {
  type: 'borrower',
  targetId: lakshmi.id,
  targetName: 'Lakshmi R. (Medical Shock)',
  startWeek: 19,
  magnitude: 0.92,
};

const sim = simulatePortfolioContagion(
  p.wards,
  p.officers,
  p.centres,
  p.jlgs,
  p.borrowers,
  p.edges,
  { totalWeeks: 78, shock }
);

const week22Snap = sim.snapshotsByWeek[21].find(s => s.borrowerId === sunita.id)!;
console.log(`\n=== LOGGING TO CONSOLE PER ITEM 1 ===`);
console.log(`Sunita (B-413) at Week 22:`);
console.log(`Latent Stress: ${(week22Snap.latentStress * 100).toFixed(1)}%`);
console.log(`Idiosyncratic Share: ${(week22Snap.shareIdio * 100).toFixed(1)}%`);
console.log(`Induced Share: ${(week22Snap.shareInduced * 100).toFixed(1)}%`);
console.log(`Covariate Share: ${(week22Snap.shareCovariate * 100).toFixed(1)}%`);
console.log(`Transmission Source: ${week22Snap.sourceBorrowerName} (${week22Snap.sourceBorrowerId})`);
console.log(`Channel: ${week22Snap.sourceChannel}`);
console.log(`Condition satisfied (induced_share > 0.3): ${week22Snap.shareInduced > 0.3}`);
