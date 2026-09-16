import { SeededRNG } from './rng';
import {
  Borrower,
  Centre,
  Edge,
  JLG,
  Officer,
  Ward,
} from './types';

const INDIAN_FIRST_NAMES = [
  'Lakshmi', 'Sunita', 'Kavitha', 'Rekha', 'Meena', 'Fatima', 'Geeta', 'Anitha',
  'Shobha', 'Pooja', 'Rani', 'Sangeeta', 'Usha', 'Savita', 'Parvati', 'Radha',
  'Shanti', 'Asha', 'Kusum', 'Manju', 'Padma', 'Bhavani', 'Lalita', 'Kamla',
  'Kalyani', 'Nirmala', 'Devi', 'Vandana', 'Saroj', 'Pushpa', 'Champa', 'Sarita',
];

const INDIAN_INITIALS = ['R.', 'M.', 'S.', 'D.', 'P.', 'B.', 'K.', 'V.', 'L.', 'N.', 'A.', 'T.', 'G.', 'H.', 'J.'];

const OCCUPATIONS = [
  'Tailoring & Alterations',
  'Vegetable & Fruit Vendor',
  'Chai & Snack Stall',
  'Sari & Textile Weaving',
  'Bangle & Artificial Jewellery',
  'Kirana Grocery Store',
  'Flower Garland Seller',
  'Home Meal Preparation (Dabba)',
  'Domestic Housekeeping Service',
  'Leather Bag Stitching',
  'Dairy & Cattle Feed',
  'Beauty Parlour / Henna Artist',
];

const WARD_CONFIGS = [
  { id: 'w-01', name: 'Ward 4 · Dharavi East', district: 'Mumbai Central', lat: 19.0435, lng: 72.8562, riskFactor: 1.15 },
  { id: 'w-02', name: 'Ward 7 · Kurla West', district: 'Mumbai Suburban', lat: 19.0688, lng: 72.8795, riskFactor: 0.95 },
  { id: 'w-03', name: 'Ward 11 · Govandi North', district: 'Mumbai Suburban', lat: 19.0560, lng: 72.9180, riskFactor: 1.25 },
  { id: 'w-04', name: 'Ward 15 · Chembur South', district: 'Mumbai Central', lat: 19.0340, lng: 72.9020, riskFactor: 0.85 },
];

const OFFICER_NAMES = [
  'Ramesh K. (Officer 101)',
  'Anjali N. (Officer 102)',
  'Suresh P. (Officer 103)',
  'Deepa V. (Officer 104)',
  'Manoj T. (Officer 105)',
  'Kavita B. (Officer 106)',
  'Rajesh S. (Officer 107)',
  'Priya M. (Officer 108)',
];

export interface GeneratedPortfolio {
  seed: number;
  wards: Ward[];
  officers: Officer[];
  centres: Centre[];
  jlgs: JLG[];
  borrowers: Borrower[];
  edges: Edge[];
}

/**
 * Deterministically generates a synthetic microfinance portfolio.
 * Guarantees identical output for any given seed.
 */
export function generateSyntheticPortfolio(seed = 481516): GeneratedPortfolio {
  const rng = new SeededRNG(seed);

  // 1. Wards
  const wards: Ward[] = WARD_CONFIGS.map(w => ({ ...w }));

  // 2. Officers
  const officers: Officer[] = OFFICER_NAMES.map((name, idx) => ({
    id: `off-0${idx + 1}`,
    name,
    joinedOn: `202${rng.intBetween(1, 4)}-0${rng.intBetween(1, 9)}-15`,
    experienceYears: rng.intBetween(1, 6),
    assignedCentreIds: [],
  }));

  // 3. Centres (24 centres across 4 wards = 6 centres per ward)
  const centres: Centre[] = [];
  let centreCounter = 1;

  for (let wIdx = 0; wIdx < wards.length; wIdx++) {
    const ward = wards[wIdx];
    for (let c = 0; c < 6; c++) {
      const cId = `c-${String(centreCounter).padStart(2, '0')}`;
      // Distribute officers across centres (each officer has ~3 centres)
      const officerIdx = (centreCounter - 1) % officers.length;
      const officer = officers[officerIdx];
      officer.assignedCentreIds.push(cId);

      centres.push({
        id: cId,
        name: `${ward.name.split('·')[1].trim()} Centre ${c + 1}`,
        wardId: ward.id,
        officerId: officer.id,
        meetingDay: (centreCounter + c) % 6, // Mon to Sat
        meetingLocation: `Community Hall Block ${c + 1}, ${ward.district}`,
      });
      centreCounter++;
    }
  }

  // 4. JLGs (Joint Liability Groups, 3 to 4 groups per centre, ~80 groups total)
  const jlgs: JLG[] = [];
  let jlgCounter = 1;

  for (let cIdx = 0; cIdx < centres.length; cIdx++) {
    const centre = centres[cIdx];
    const groupCount = rng.intBetween(3, 4);

    for (let g = 0; g < groupCount; g++) {
      const jlgId = `jlg-${String(jlgCounter).padStart(3, '0')}`;
      jlgs.push({
        id: jlgId,
        name: `Group ${g + 1} (${centre.name.replace(' Centre', '')})`,
        centreId: centre.id,
        formedOn: `202${rng.intBetween(2, 4)}-0${rng.intBetween(1, 9)}-01`,
        size: 5, // Canonical Indian MFI JLG size of 5 borrowers
        borrowerIds: [],
      });
      jlgCounter++;
    }
  }

  // 5. Borrowers (5 members per JLG = ~400 borrowers total)
  const borrowers: Borrower[] = [];
  let borrowerCounter = 1;

  for (let jIdx = 0; jIdx < jlgs.length; jIdx++) {
    const jlg = jlgs[jIdx];
    const centre = centres.find(c => c.id === jlg.centreId)!;
    const ward = wards.find(w => w.id === centre.wardId)!;

    for (let m = 0; m < jlg.size; m++) {
      const bId = `b-${String(borrowerCounter).padStart(3, '0')}`;
      const firstName = rng.pickOne(INDIAN_FIRST_NAMES);
      const initial = rng.pickOne(INDIAN_INITIALS);
      let displayName = `${firstName} ${initial}`;
      if (bId === 'b-411') {
        displayName = 'Lakshmi R.';
      } else if (bId === 'b-413') {
        displayName = 'Sunita K.';
      }
      const occupation = rng.pickOne(OCCUPATIONS);

      const loanCycle = rng.intBetween(1, 5);
      const basePrincipal = 25000 + (loanCycle - 1) * 12000;
      const principal = basePrincipal + rng.intBetween(0, 4) * 2000;
      // Weekly EMI based on 52-week tenure at ~22% declining APR
      const weeklyEmi = Math.round((principal * 1.18) / 52);
      const hhIncome = rng.intBetween(14000, 34000);
      const activeLenders = rng.next() > 0.82 ? rng.intBetween(2, 3) : 1;

      // Base latent stress baseline (calm healthy level 0.04 - 0.18)
      const baselineStress = Math.round((0.04 + rng.next() * 0.12 * ward.riskFactor) * 1000) / 1000;

      const borrower: Borrower = {
        id: bId,
        jlgId: jlg.id,
        centreId: centre.id,
        wardId: ward.id,
        displayName,
        occupation,
        hhIncomeMonthly: hhIncome,
        hhSize: rng.intBetween(3, 6),
        loanCycle,
        activeLenders,
        principal,
        emi: weeklyEmi,
        baselineStress,
      };

      borrowers.push(borrower);
      jlg.borrowerIds.push(bId);
      borrowerCounter++;
    }
  }

  // 6. Edges: 5 Typed Channels
  const edges: Edge[] = [];
  let edgeCounter = 1;

  // Channel 1: Guarantee edges (complete clique within each JLG)
  for (let jIdx = 0; jIdx < jlgs.length; jIdx++) {
    const jlg = jlgs[jIdx];
    const members = jlg.borrowerIds;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        // High transmission weight: 0.70 to 0.92
        const weight = Math.round((0.70 + rng.next() * 0.22) * 1000) / 1000;
        edges.push({
          id: `e-${edgeCounter++}`,
          kind: 'guarantee',
          srcBorrowerId: members[i],
          dstBorrowerId: members[j],
          dstEntityId: null,
          weight,
        });
        // Symmetrical guarantee
        edges.push({
          id: `e-${edgeCounter++}`,
          kind: 'guarantee',
          srcBorrowerId: members[j],
          dstBorrowerId: members[i],
          dstEntityId: null,
          weight,
        });
      }
    }
  }

  // Channel 2: Income / shared market edges (borrowers sharing same occupation in same centre)
  for (let cIdx = 0; cIdx < centres.length; cIdx++) {
    const centre = centres[cIdx];
    const centreBorrowers = borrowers.filter(b => b.centreId === centre.id);

    for (let i = 0; i < centreBorrowers.length; i++) {
      for (let j = i + 1; j < centreBorrowers.length; j++) {
        const b1 = centreBorrowers[i];
        const b2 = centreBorrowers[j];
        if (b1.jlgId !== b2.jlgId && b1.occupation === b2.occupation) {
          const weight = Math.round((0.35 + rng.next() * 0.25) * 1000) / 1000;
          edges.push({
            id: `e-${edgeCounter++}`,
            kind: 'income',
            srcBorrowerId: b1.id,
            dstBorrowerId: b2.id,
            dstEntityId: null,
            weight,
          });
        }
      }
    }
  }

  // Channel 3: Social / kinship edges (cross-JLG neighbor ties within same centre)
  for (let cIdx = 0; cIdx < centres.length; cIdx++) {
    const centre = centres[cIdx];
    const centreBorrowers = borrowers.filter(b => b.centreId === centre.id);
    const socialPairs = rng.intBetween(2, 4);

    for (let p = 0; p < socialPairs; p++) {
      const b1 = rng.pickOne(centreBorrowers);
      const eligible = centreBorrowers.filter(b => b.jlgId !== b1.jlgId && b.id !== b1.id);
      if (eligible.length > 0) {
        const b2 = rng.pickOne(eligible);
        const weight = Math.round((0.28 + rng.next() * 0.22) * 1000) / 1000;
        edges.push({
          id: `e-${edgeCounter++}`,
          kind: 'social',
          srcBorrowerId: b1.id,
          dstBorrowerId: b2.id,
          dstEntityId: null,
          weight,
        });
      }
    }
  }

  // Channel 4: Ward covariate edges (linking each borrower to their ward entity)
  for (let bIdx = 0; bIdx < borrowers.length; bIdx++) {
    const b = borrowers[bIdx];
    edges.push({
      id: `e-${edgeCounter++}`,
      kind: 'ward',
      srcBorrowerId: b.id,
      dstBorrowerId: null,
      dstEntityId: b.wardId,
      weight: 0.65,
    });
  }

  // Channel 5: Officer edges (linking each borrower to their centre officer entity)
  for (let bIdx = 0; bIdx < borrowers.length; bIdx++) {
    const b = borrowers[bIdx];
    const centre = centres.find(c => c.id === b.centreId)!;
    edges.push({
      id: `e-${edgeCounter++}`,
      kind: 'officer',
      srcBorrowerId: b.id,
      dstBorrowerId: null,
      dstEntityId: centre.officerId,
      weight: 0.70,
    });
  }

  return {
    seed,
    wards,
    officers,
    centres,
    jlgs,
    borrowers,
    edges,
  };
}
