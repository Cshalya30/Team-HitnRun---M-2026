export type EdgeKind = 'guarantee' | 'income' | 'social' | 'ward' | 'officer';

export interface Ward {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  riskFactor: number;
}

export interface Officer {
  id: string;
  name: string;
  joinedOn: string;
  experienceYears: number;
  assignedCentreIds: string[];
}

export interface Centre {
  id: string;
  name: string;
  wardId: string;
  officerId: string;
  meetingDay: number; // 0 = Monday, 6 = Sunday
  meetingLocation: string;
}

export interface JLG {
  id: string;
  name: string;
  centreId: string;
  formedOn: string;
  size: number;
  borrowerIds: string[];
}

export interface Borrower {
  id: string;
  jlgId: string;
  centreId: string;
  wardId: string;
  displayName: string;
  occupation: string;
  hhIncomeMonthly: number; // in INR
  hhSize: number;
  loanCycle: number;
  activeLenders: number;
  principal: number; // in INR
  emi: number; // weekly EMI in INR
  baselineStress: number;
}

export interface Edge {
  id: string;
  kind: EdgeKind;
  srcBorrowerId: string;
  dstBorrowerId: string | null;
  dstEntityId: string | null; // wardId or officerId when dstBorrowerId is null
  weight: number; // 0.0 to 1.0
}

export interface StressSignals {
  attendance: number;       // 0..1 (irregular attendance at weekly centre meeting)
  crossPayment: number;     // 0..1 (proxy payments made on behalf of or received from group peer)
  instalmentDelay: number;  // 0..1 (days past due / partial EMI payment)
  loanCycle: number;        // 0..1 (cycle debt accumulation strain)
  multiLender: number;      // 0..1 (exposure to 2+ external micro-lenders)
  dtiBurden: number;        // 0..1 (debt-to-income ratio burden)
  socialDisruption: number; // 0..1 (interpersonal tension / JLG cohesion breakdown)
  seasonalMismatch: number; // 0..1 (local crop/market cash flow seasonality)
}

export type DominantStressType = 'idio' | 'induced' | 'covariate' | 'unflagged';

export interface StressSnapshot {
  borrowerId: string;
  weekIndex: number; // 1 to 78
  latentStress: number; // 0.0 to 1.0
  shareIdio: number; // 0.0 to 1.0
  shareInduced: number; // 0.0 to 1.0
  shareCovariate: number; // 0.0 to 1.0
  ciLow: number; // 10th percentile Monte Carlo
  ciHigh: number; // 90th percentile Monte Carlo
  sourceBorrowerId: string | null; // primary upstream source of induced stress
  sourceBorrowerName: string | null;
  sourceChannel: EdgeKind | null;
  dominantStressType: DominantStressType;
  signals: StressSignals;
  signalContributions: Record<keyof StressSignals, number>;
  dpd: number; // Days past due
  isEscalated: boolean; // Transient suppression filter: false if brief noise, true if escalated
}

export type ShockType = 'borrower' | 'ward' | 'officer';

export interface Shock {
  type: ShockType;
  targetId: string;
  targetName: string;
  startWeek: number;
  magnitude: number; // 0.0 to 1.0
}

export type InterventionType = 
  | 'moratorium'
  | 'liquidity_bridge'
  | 'group_split'
  | 'officer_reassignment'
  | 'ward_relief'
  | 'intensive_visit';

export interface Intervention {
  id: string;
  type: InterventionType;
  title: string;
  description: string;
  targetBorrowerId?: string;
  targetCentreId?: string;
  targetWardId?: string;
  appliedWeek: number;
  durationWeeks: number;
}

export interface WardAggregate {
  wardId: string;
  name: string;
  totalBorrowers: number;
  flaggedCount: number;
  escalatedCount: number;
  avgLatentStress: number;
  contagionVelocity: number; // week-over-week delta
  dominantChannel: EdgeKind;
}

export interface TransientWeeklyMetrics {
  week: number;
  observedAlerts: number;
  suppressedCount: number;
  escalatedCount: number;
}

export interface SimulationOutput {
  seed: number;
  wards: Ward[];
  officers: Officer[];
  centres: Centre[];
  jlgs: JLG[];
  borrowers: Borrower[];
  edges: Edge[];
  // Precomputed 78-week snapshots per borrower
  snapshotsByBorrower: Map<string, StressSnapshot[]>;
  // Fast lookup by week: weekIndex -> Map<borrowerId, StressSnapshot>
  snapshotsByWeek: StressSnapshot[][];
  // Ward aggregate metrics per week
  wardAggregatesByWeek: WardAggregate[][];
  // Transient suppression stats per week
  transientMetrics: TransientWeeklyMetrics[];
  // Active shock if any
  activeShock: Shock | null;
  // Active intervention if any
  activeIntervention: Intervention | null;
}
