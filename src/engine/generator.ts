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

export const WARD_CONFIGS = [
  // Mumbai Central (10 wards) - Diverse profiles from commercial/affluent to dense informal hubs
  { id: 'w-01', name: 'Ward 1 · Colaba', district: 'Mumbai Central', lat: 18.9067, lng: 72.8147, riskFactor: 0.50 },
  { id: 'w-02', name: 'Ward 2 · Fort', district: 'Mumbai Central', lat: 18.9338, lng: 72.8350, riskFactor: 0.55 },
  { id: 'w-03', name: 'Ward 3 · Byculla', district: 'Mumbai Central', lat: 18.9774, lng: 72.8327, riskFactor: 1.15 },
  { id: 'w-04', name: 'Ward 4 · Dharavi East', district: 'Mumbai Central', lat: 19.0435, lng: 72.8562, riskFactor: 1.65 },
  { id: 'w-05', name: 'Ward 5 · Worli', district: 'Mumbai Central', lat: 19.0166, lng: 72.8166, riskFactor: 0.65 },
  { id: 'w-06', name: 'Ward 6 · Dadar', district: 'Mumbai Central', lat: 19.0192, lng: 72.8427, riskFactor: 0.85 },
  { id: 'w-07', name: 'Ward 7 · Parel', district: 'Mumbai Central', lat: 18.9950, lng: 72.8397, riskFactor: 0.95 },
  { id: 'w-08', name: 'Ward 8 · Matunga', district: 'Mumbai Central', lat: 19.0263, lng: 72.8517, riskFactor: 0.60 },
  { id: 'w-09', name: 'Ward 9 · Sion', district: 'Mumbai Central', lat: 19.0390, lng: 72.8619, riskFactor: 1.25 },
  { id: 'w-10', name: 'Ward 10 · Mahim', district: 'Mumbai Central', lat: 19.0407, lng: 72.8431, riskFactor: 0.90 },
  // Mumbai Suburban (10 wards) - High variance from coastal residential to low-lying flood-prone corridors
  { id: 'w-11', name: 'Ward 11 · Bandra West', district: 'Mumbai Suburban', lat: 19.0596, lng: 72.8295, riskFactor: 0.45 },
  { id: 'w-12', name: 'Ward 12 · Kurla West', district: 'Mumbai Suburban', lat: 19.0688, lng: 72.8795, riskFactor: 1.55 },
  { id: 'w-13', name: 'Ward 13 · Santacruz East', district: 'Mumbai Suburban', lat: 19.0805, lng: 72.8533, riskFactor: 0.80 },
  { id: 'w-14', name: 'Ward 14 · Andheri East', district: 'Mumbai Suburban', lat: 19.1136, lng: 72.8697, riskFactor: 1.05 },
  { id: 'w-15', name: 'Ward 15 · Govandi North', district: 'Mumbai Suburban', lat: 19.0560, lng: 72.9180, riskFactor: 1.75 },
  { id: 'w-16', name: 'Ward 16 · Vile Parle', district: 'Mumbai Suburban', lat: 19.1001, lng: 72.8431, riskFactor: 0.55 },
  { id: 'w-17', name: 'Ward 17 · Malad West', district: 'Mumbai Suburban', lat: 19.1866, lng: 72.8485, riskFactor: 1.20 },
  { id: 'w-18', name: 'Ward 18 · Borivali East', district: 'Mumbai Suburban', lat: 19.2294, lng: 72.8660, riskFactor: 0.70 },
  { id: 'w-19', name: 'Ward 19 · Ghatkopar', district: 'Mumbai Suburban', lat: 19.0867, lng: 72.9081, riskFactor: 0.90 },
  { id: 'w-20', name: 'Ward 20 · Mulund West', district: 'Mumbai Suburban', lat: 19.1720, lng: 72.9464, riskFactor: 0.75 },
  // Thane (10 wards) - Industrial manufacturing, commuter towns & peri-urban markets
  { id: 'w-21', name: 'Ward 21 · Thane West', district: 'Thane', lat: 19.2084, lng: 72.9734, riskFactor: 0.85 },
  { id: 'w-22', name: 'Ward 22 · Kopri', district: 'Thane', lat: 19.1864, lng: 72.9749, riskFactor: 1.00 },
  { id: 'w-23', name: 'Ward 23 · Naupada', district: 'Thane', lat: 19.1874, lng: 72.9754, riskFactor: 0.60 },
  { id: 'w-24', name: 'Ward 24 · Majiwada', district: 'Thane', lat: 19.2155, lng: 72.9789, riskFactor: 1.30 },
  { id: 'w-25', name: 'Ward 25 · Vartak Nagar', district: 'Thane', lat: 19.2064, lng: 72.9575, riskFactor: 1.10 },
  { id: 'w-26', name: 'Ward 26 · Kalwa', district: 'Thane', lat: 19.2001, lng: 72.9975, riskFactor: 1.45 },
  { id: 'w-27', name: 'Ward 27 · Mumbra', district: 'Thane', lat: 19.1726, lng: 73.0232, riskFactor: 1.70 },
  { id: 'w-28', name: 'Ward 28 · Diva', district: 'Thane', lat: 19.1867, lng: 73.0425, riskFactor: 1.50 },
  { id: 'w-29', name: 'Ward 29 · Manpada', district: 'Thane', lat: 19.2312, lng: 72.9691, riskFactor: 0.75 },
  { id: 'w-30', name: 'Ward 30 · Shilphata', district: 'Thane', lat: 19.1352, lng: 73.0401, riskFactor: 1.40 },
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
  'Sanjay D. (Officer 109)',
  'Rekha L. (Officer 110)',
  'Amit R. (Officer 111)',
  'Sunita G. (Officer 112)',
  'Vikram C. (Officer 113)',
  'Pooja K. (Officer 114)',
  'Rahul M. (Officer 115)',
  'Neha S. (Officer 116)',
  'Vijay B. (Officer 117)',
  'Sneha P. (Officer 118)',
  'Arun V. (Officer 119)',
  'Geeta T. (Officer 120)',
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
 * Deterministically generates a synthetic microfinance portfolio with rich realistic demographic and economic variance.
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

  // 3. Centres (approx 5-7 centres per ward)
  const centres: Centre[] = [];
  let centreCounter = 1;

  for (let wIdx = 0; wIdx < wards.length; wIdx++) {
    const ward = wards[wIdx];
    const numCentres = rng.intBetween(5, 7);
    for (let c = 0; c < numCentres; c++) {
      const cId = `c-${String(centreCounter).padStart(2, '0')}`;
      // Distribute officers across centres
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

  // 4. JLGs (Joint Liability Groups, 5 to 7 groups per centre)
  const jlgs: JLG[] = [];
  let jlgCounter = 1;

  for (let cIdx = 0; cIdx < centres.length; cIdx++) {
    const centre = centres[cIdx];
    const groupCount = rng.intBetween(5, 7);

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

  // 5. Borrowers (5 members per JLG)
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

      // Realistic demographic distributions based on ward economic profile
      const loanCycle = rng.intBetween(1, 5);
      const basePrincipal = 20000 + (loanCycle - 1) * 11000;
      const principal = basePrincipal + rng.intBetween(0, 5) * 2500;
      
      // Weekly EMI based on 52-week tenure at ~22% declining APR
      const weeklyEmi = Math.round((principal * 1.18) / 52);
      const hhIncome = rng.intBetween(12000, 42000);
      
      // Multi-lender exposure varies by ward risk profile
      const multiLenderChance = 0.15 * ward.riskFactor;
      const activeLenders = rng.next() < multiLenderChance ? rng.intBetween(2, 3) : 1;

      // Realistic spread of baseline latent stress (0.02 to 0.32)
      const baseComponent = 0.02 + rng.next() * 0.14 * ward.riskFactor;
      const baselineStress = Math.round(Math.min(0.32, Math.max(0.02, baseComponent)) * 1000) / 1000;

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
        // Guarantee transmission weight: 0.65 to 0.95
        const weight = Math.round((0.65 + rng.next() * 0.30) * 1000) / 1000;
        edges.push({
          id: `e-${edgeCounter++}`,
          kind: 'guarantee',
          srcBorrowerId: members[i],
          dstBorrowerId: members[j],
          dstEntityId: null,
          weight,
        });
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
          const weight = Math.round((0.35 + rng.next() * 0.30) * 1000) / 1000;
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
    const socialPairs = rng.intBetween(3, 6);

    for (let p = 0; p < socialPairs; p++) {
      const b1 = rng.pickOne(centreBorrowers);
      const eligible = centreBorrowers.filter(b => b.jlgId !== b1.jlgId && b.id !== b1.id);
      if (eligible.length > 0) {
        const b2 = rng.pickOne(eligible);
        const weight = Math.round((0.30 + rng.next() * 0.30) * 1000) / 1000;
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
