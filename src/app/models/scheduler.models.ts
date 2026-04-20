export interface Team {
  id: string;
  name: string;
  size: number;
  color?: string;
}

export type OverlapType = 'direct_overlap' | 'indirect_overlap';
export type MeetingFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface MeetingConstraint {
  type: OverlapType;
  frequency: MeetingFrequency;
}

export interface FairnessConfig {
  balance_bad_shifts: boolean;
}

export interface SchedulerConstraints {
  teams_must_stay_together: boolean;
  avoid_day_pairs: string[];
  forbidden_day_pairs: string[];
  fairness: FairnessConfig;
}

export interface SchedulerConfig {
  teams: Team[];
  office_days: string[];
  days_per_person_per_week: number;
  max_people_per_day: number;
  meeting_constraint: MeetingConstraint;
  constraints: SchedulerConstraints;
  num_weeks: number;
}

/** teamName → list of days for that week */
export type WeeklyAssignment = Record<string, string[]>;

/** week label → day → list of team names present */
export type CalendarSchedule = Record<string, Record<string, string[]>>;

/** week label → teamName → days */
export type TeamSchedule = Record<string, WeeklyAssignment>;

export interface DayTotals {
  [day: string]: number;
}

export interface BadShiftDistribution {
  [pattern: string]: string[];
}

export interface SchedulerMetrics {
  daily_totals: Record<string, DayTotals>;
  bad_shift_distribution: BadShiftDistribution;
  pattern_distribution: Record<string, string>;
  total_people: number;
  required_capacity: number;
  available_capacity: number;
}

export interface SchedulerResult {
  status: 'SUCCESS' | 'IMPOSSIBLE';
  reason?: string;
  calendar?: CalendarSchedule;
  team_schedule?: TeamSchedule;
  metrics?: SchedulerMetrics;
  variantIndex?: number;
  totalVariants?: number;
}

export const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TEAM_COLORS = [
  '#4A90D9', '#E67E22', '#2ECC71', '#9B59B6',
  '#E74C3C', '#1ABC9C', '#F39C12', '#3498DB',
  '#D35400', '#27AE60'
];

export const DEFAULT_CONFIG: SchedulerConfig = {
  teams: [
    { id: '1', name: 'Buckle', size: 4 },
    { id: '2', name: 'IA', size: 4 },
    { id: '3', name: 'Equinodes', size: 4 },
    { id: '4', name: 'TX', size: 2 },
    { id: '5', name: 'SAP', size: 5 },
    { id: '6', name: 'Designer', size: 1 },
  ].map((t, i) => ({ ...t, color: TEAM_COLORS[i] })),
  office_days: ['Monday', 'Tuesday', 'Thursday', 'Friday'],
  days_per_person_per_week: 2,
  max_people_per_day: 14,
  meeting_constraint: {
    type: 'direct_overlap',
    frequency: 'monthly',
  },
  constraints: {
    teams_must_stay_together: true,
    avoid_day_pairs: [],
    forbidden_day_pairs: ['Monday+Tuesday', 'Monday+Friday', 'Tuesday+Thursday', 'Thursday+Friday'],
    fairness: { balance_bad_shifts: true },
  },
  num_weeks: 4,
};
