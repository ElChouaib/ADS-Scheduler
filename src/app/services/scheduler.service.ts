import { Injectable } from '@angular/core';
import {
  SchedulerConfig,
  SchedulerResult,
  WeeklyAssignment,
  CalendarSchedule,
  TeamSchedule,
  SchedulerMetrics,
  DayTotals,
  BadShiftDistribution,
  Team,
} from '../models/scheduler.models';

@Injectable({ providedIn: 'root' })
export class SchedulerService {

  solve(config: SchedulerConfig, variantIdx = 0): SchedulerResult {
    const feasibility = this.checkFeasibility(config);
    if (!feasibility.feasible) {
      return { status: 'IMPOSSIBLE', reason: feasibility.reason };
    }

    const rawPatterns = this.generatePatterns(config.office_days, config.days_per_person_per_week);
    if (rawPatterns.length === 0) {
      return {
        status: 'IMPOSSIBLE',
        reason: `Cannot select ${config.days_per_person_per_week} days from ${config.office_days.length} available office days.`,
      };
    }

    const forbidden = config.constraints.forbidden_day_pairs ?? [];
    const patterns = forbidden.length > 0 ? rawPatterns.filter(p => !this.isBadPattern(p, forbidden)) : rawPatterns;
    if (patterns.length === 0) {
      const labels = forbidden.map(p => p.split('+').map(d => d.slice(0, 3)).join(' + ')).join(', ');
      return {
        status: 'IMPOSSIBLE',
        reason: `No valid ${config.days_per_person_per_week}-day pattern exists: every possible combination contains a forbidden pair (${labels}). Remove a forbidden pair or add more office days.`,
      };
    }

    const solved = this.solveRotation(config, variantIdx);
    if (!solved) {
      return { status: 'IMPOSSIBLE', reason: this.diagnoseFailure(config) };
    }

    return this.buildResult(solved.weeks, config, variantIdx, solved.totalVariants);
  }

  // ── Feasibility ────────────────────────────────────────────────────────────

  private checkFeasibility(config: SchedulerConfig): { feasible: boolean; reason?: string } {
    const totalPeople = config.teams.reduce((s, t) => s + t.size, 0);
    const required = totalPeople * config.days_per_person_per_week;
    const available = config.office_days.length * config.max_people_per_day;

    if (required > available) {
      return {
        feasible: false,
        reason: `Total required attendance (${required} person-days) exceeds available capacity (${available} person-days = ${config.office_days.length} days × ${config.max_people_per_day} spots).`,
      };
    }

    if (config.days_per_person_per_week > config.office_days.length) {
      return {
        feasible: false,
        reason: `Each person must come ${config.days_per_person_per_week} days/week but only ${config.office_days.length} office day(s) are available.`,
      };
    }

    return { feasible: true };
  }

  // ── Pattern generation ─────────────────────────────────────────────────────

  generatePatterns(days: string[], choose: number): string[][] {
    return this.combinations(days, choose);
  }

  private combinations(arr: string[], k: number): string[][] {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const [first, ...rest] = arr;
    return [
      ...this.combinations(rest, k - 1).map(c => [first, ...c]),
      ...this.combinations(rest, k),
    ];
  }

  // ── Solver ─────────────────────────────────────────────────────────────────

  private solveRotation(config: SchedulerConfig, variantIdx: number): { weeks: WeeklyAssignment[]; totalVariants: number } | null {
    const freq = config.meeting_constraint.frequency;
    const allValid = this.findCapacityValidAssignments(config);
    if (allValid.length === 0) return null;

    if (freq === 'weekly') {
      const weeklyValid = allValid.filter(a => this.checkOverlap(a, config));
      if (weeklyValid.length === 0) return null;
      const weeks = this.buildRotation(weeklyValid, config, config.num_weeks, variantIdx);
      return { weeks, totalVariants: weeklyValid.length };
    }

    // For biweekly/monthly rotate the pool by variantIdx to get different results
    const offset = variantIdx % allValid.length;
    const rotated = [...allValid.slice(offset), ...allValid.slice(0, offset)];

    if (freq === 'biweekly') {
      const pair = this.findBiweeklyPair(rotated, config);
      if (!pair) return null;
      const weeks = Array.from({ length: config.num_weeks }, (_, i) => i % 2 === 0 ? pair[0] : pair[1]);
      return { weeks, totalVariants: allValid.length };
    }

    const schedule = this.findMonthlySchedule(rotated, config);
    if (!schedule) return null;
    return { weeks: schedule, totalVariants: allValid.length };
  }

  /** Find all assignments satisfying capacity only (no overlap check) */
  private findCapacityValidAssignments(config: SchedulerConfig): WeeklyAssignment[] {
    const results: WeeklyAssignment[] = [];
    const initialLoads: Record<string, number> = {};
    for (const d of config.office_days) initialLoads[d] = 0;

    const forbidden = config.constraints.forbidden_day_pairs ?? [];
    const rawPatterns = this.generatePatterns(config.office_days, config.days_per_person_per_week);
    const patterns = forbidden.length > 0 ? rawPatterns.filter(p => !this.isBadPattern(p, forbidden)) : rawPatterns;

    const backtrack = (idx: number, current: WeeklyAssignment, loads: Record<string, number>) => {
      if (results.length >= 2000) return;
      if (idx === config.teams.length) {
        results.push({ ...current });
        return;
      }
      const team = config.teams[idx];
      for (const pattern of patterns) {
        const newLoads = { ...loads };
        let valid = true;
        for (const day of pattern) {
          newLoads[day] = (newLoads[day] ?? 0) + team.size;
          if (newLoads[day] > config.max_people_per_day) { valid = false; break; }
        }
        if (valid) {
          current[team.name] = pattern;
          backtrack(idx + 1, current, newLoads);
          delete current[team.name];
        }
      }
    };

    backtrack(0, {}, initialLoads);
    return results;
  }

  // ── Overlap checkers ───────────────────────────────────────────────────────

  private checkOverlap(assignment: WeeklyAssignment, config: SchedulerConfig): boolean {
    if (config.meeting_constraint.type === 'direct_overlap') {
      return this.checkDirectOverlap(assignment, config.teams);
    }
    return this.checkIndirectOverlap(assignment, config.teams);
  }

  private checkDirectOverlap(assignment: WeeklyAssignment, teams: Team[]): boolean {
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const daysA = assignment[teams[i].name] ?? [];
        const daysB = assignment[teams[j].name] ?? [];
        if (!daysA.some(d => daysB.includes(d))) return false;
      }
    }
    return true;
  }

  private checkIndirectOverlap(assignment: WeeklyAssignment, teams: Team[]): boolean {
    const adj: Record<string, string[]> = {};
    for (const t of teams) adj[t.name] = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const daysA = assignment[teams[i].name] ?? [];
        const daysB = assignment[teams[j].name] ?? [];
        if (daysA.some(d => daysB.includes(d))) {
          adj[teams[i].name].push(teams[j].name);
          adj[teams[j].name].push(teams[i].name);
        }
      }
    }
    const visited = new Set([teams[0].name]);
    const queue = [teams[0].name];
    while (queue.length) {
      const curr = queue.shift()!;
      for (const nb of adj[curr]) {
        if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
      }
    }
    return visited.size === teams.length;
  }

  // ── Biweekly & monthly solvers ─────────────────────────────────────────────

  /** Precompute which team-pair keys are covered by each assignment */
  private buildPairSets(allValid: WeeklyAssignment[], teams: Team[]): Set<string>[] {
    return allValid.map(a => {
      const s = new Set<string>();
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const dA = a[teams[i].name] ?? [];
          const dB = a[teams[j].name] ?? [];
          if (dA.some(d => dB.includes(d))) s.add(`${i},${j}`);
        }
      }
      return s;
    });
  }

  private findBiweeklyPair(
    allValid: WeeklyAssignment[],
    config: SchedulerConfig
  ): [WeeklyAssignment, WeeklyAssignment] | null {
    const teams = config.teams;
    const type = config.meeting_constraint.type;

    if (type === 'indirect_overlap') {
      const pool = allValid.slice(0, 400);
      for (const A of pool)
        for (const B of pool)
          if (this.checkCollectiveOverlap([A, B], teams, type)) return [A, B];
      return null;
    }

    const totalPairs = (teams.length * (teams.length - 1)) / 2;
    const pairSets = this.buildPairSets(allValid, teams);

    for (let ai = 0; ai < allValid.length; ai++) {
      const covA = pairSets[ai];
      if (covA.size === totalPairs) return [allValid[ai], allValid[ai]];

      for (let bi = ai; bi < allValid.length; bi++) {
        let combinedSize = covA.size;
        for (const p of pairSets[bi]) if (!covA.has(p)) combinedSize++;
        if (combinedSize === totalPairs) return [allValid[ai], allValid[bi]];
      }
    }
    return null;
  }

  /**
   * Greedy set-cover monthly solver.
   * Uses the full valid-assignment pool (no artificial cap).
   * For each week, picks the assignment that covers the most still-uncovered
   * team-pairs, breaking ties by week-to-week variety.
   */
  private findMonthlySchedule(
    allValid: WeeklyAssignment[],
    config: SchedulerConfig
  ): WeeklyAssignment[] | null {
    const teams = config.teams;
    const type = config.meeting_constraint.type;
    const numWeeks = config.num_weeks;

    if (allValid.length === 0) return null;

    const totalPairs = (teams.length * (teams.length - 1)) / 2;
    const pairSets = this.buildPairSets(allValid, teams);

    const selected: WeeklyAssignment[] = [];
    const covered = new Set<string>();

    for (let w = 0; w < numWeeks; w++) {
      let bestIdx = 0;
      let bestScore = -Infinity;

      for (let i = 0; i < allValid.length; i++) {
        const newCov = covered.size < totalPairs
          ? [...pairSets[i]].filter(p => !covered.has(p)).length
          : 0;
        const variety = selected.length > 0
          ? this.weekVarietyScore(allValid[i], selected[selected.length - 1], teams)
          : 0;
        const score = newCov * 1000 + variety;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      }

      selected.push(allValid[bestIdx]);
      for (const p of pairSets[bestIdx]) covered.add(p);
    }

    if (type === 'indirect_overlap') {
      return this.checkCollectiveOverlap(selected, teams, type) ? selected : null;
    }
    return covered.size >= totalPairs ? selected : null;
  }

  /** All pairs of teams must share a day in at least one of the provided weekly assignments */
  private checkCollectiveOverlap(
    assignments: WeeklyAssignment[],
    teams: Team[],
    type: 'direct_overlap' | 'indirect_overlap'
  ): boolean {
    if (type === 'direct_overlap') {
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const everMet = assignments.some(a => {
            const dA = a[teams[i].name] ?? [];
            const dB = a[teams[j].name] ?? [];
            return dA.some(d => dB.includes(d));
          });
          if (!everMet) return false;
        }
      }
      return true;
    }
    // indirect: build cumulative adjacency across all weeks
    const adj: Record<string, Set<string>> = {};
    for (const t of teams) adj[t.name] = new Set();
    for (const a of assignments) {
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const dA = a[teams[i].name] ?? [];
          const dB = a[teams[j].name] ?? [];
          if (dA.some(d => dB.includes(d))) {
            adj[teams[i].name].add(teams[j].name);
            adj[teams[j].name].add(teams[i].name);
          }
        }
      }
    }
    const visited = new Set([teams[0].name]);
    const queue = [teams[0].name];
    while (queue.length) {
      const curr = queue.shift()!;
      for (const nb of adj[curr]) {
        if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
      }
    }
    return visited.size === teams.length;
  }

  // ── Rotation & fairness ────────────────────────────────────────────────────

  private buildRotation(
    validAssignments: WeeklyAssignment[],
    config: SchedulerConfig,
    numWeeks: number,
    variantIdx = 0
  ): WeeklyAssignment[] {
    const { avoid_day_pairs, fairness } = config.constraints;

    const scored = validAssignments.map(a => ({
      assignment: a,
      badCount: this.countBadShifts(a, config.teams, avoid_day_pairs),
    }));
    scored.sort((x, y) => x.badCount - y.badCount);

    // Rotate the sorted pool by variantIdx so each variant starts from a different base assignment
    const offset = variantIdx % scored.length;
    const pool = [...scored.slice(offset), ...scored.slice(0, offset)];

    const weeks: WeeklyAssignment[] = [];
    const badShiftCount: Record<string, number> = {};
    for (const t of config.teams) badShiftCount[t.name] = 0;

    for (let w = 0; w < numWeeks; w++) {
      let best = pool[0].assignment;
      let bestScore = -Infinity;

      for (const { assignment, badCount } of pool) {
        // Variety score: how many team-days differ from the previous week's assignment
        const variety = weeks.length > 0 ? this.weekVarietyScore(assignment, weeks[weeks.length - 1], config.teams) : 0;

        // Balance score: prefer assignment that keeps bad-shift counts even across teams
        const balancePenalty = fairness.balance_bad_shifts
          ? config.teams.reduce((s, t) => {
              const bad = this.isBadPattern(assignment[t.name] ?? [], avoid_day_pairs) ? 1 : 0;
              return s + badShiftCount[t.name] + bad;
            }, 0)
          : 0;

        // Combined: maximise variety, then minimise bad shifts, then minimise imbalance
        const score = variety * 100 - badCount * 10 - balancePenalty;
        if (score > bestScore) { bestScore = score; best = assignment; }
      }

      weeks.push(best);
      for (const t of config.teams) {
        if (this.isBadPattern(best[t.name] ?? [], avoid_day_pairs)) badShiftCount[t.name]++;
      }
    }

    return weeks;
  }

  /** Count how many team-days differ between two assignments (higher = more variety) */
  private weekVarietyScore(a: WeeklyAssignment, prev: WeeklyAssignment, teams: Team[]): number {
    return teams.reduce((s, t) => {
      const curr = a[t.name] ?? [];
      const p = prev[t.name] ?? [];
      return s + curr.filter(d => !p.includes(d)).length;
    }, 0);
  }

  private countBadShifts(a: WeeklyAssignment, teams: Team[], avoidPairs: string[]): number {
    return teams.filter(t => this.isBadPattern(a[t.name] ?? [], avoidPairs)).length;
  }

  isBadPattern(pattern: string[], avoidPairs: string[]): boolean {
    for (const pair of avoidPairs) {
      const days = pair.split('+').map(s => s.trim());
      if (days.every(d => pattern.includes(d))) return true;
    }
    return false;
  }

  // ── Result builder ─────────────────────────────────────────────────────────

  private buildResult(weeklyAssignments: WeeklyAssignment[], config: SchedulerConfig, variantIndex: number, totalVariants: number): SchedulerResult {
    const calendar: CalendarSchedule = {};
    const teamSchedule: TeamSchedule = {};
    const dailyTotals: Record<string, DayTotals> = {};
    const totalBadCount: Record<string, number> = {};
    const badShiftDist: BadShiftDistribution = {};

    for (let w = 0; w < config.num_weeks; w++) {
      const label = `Week ${w + 1}`;
      const assignment = weeklyAssignments[w];
      calendar[label] = {};
      teamSchedule[label] = assignment;
      dailyTotals[label] = {};

      for (const day of config.office_days) {
        calendar[label][day] = [];
        dailyTotals[label][day] = 0;
      }

      for (const [teamName, days] of Object.entries(assignment)) {
        const team = config.teams.find(t => t.name === teamName)!;
        for (const day of days) {
          calendar[label][day].push(teamName);
          dailyTotals[label][day] = (dailyTotals[label][day] ?? 0) + team.size;
        }
        if (this.isBadPattern(days, config.constraints.avoid_day_pairs)) {
          totalBadCount[teamName] = (totalBadCount[teamName] ?? 0) + 1;
        }
      }
    }

    for (const [teamName, count] of Object.entries(totalBadCount)) {
      if (count > 0) {
        const key = config.constraints.avoid_day_pairs.find(p =>
          this.isBadPattern(weeklyAssignments[0][teamName] ?? [], [p])
        ) ?? 'bad';
        if (!badShiftDist[key]) badShiftDist[key] = [];
        if (!badShiftDist[key].includes(teamName)) badShiftDist[key].push(teamName);
      }
    }

    const totalPeople = config.teams.reduce((s, t) => s + t.size, 0);
    const patternDistribution: Record<string, string> = {};
    for (const [name, days] of Object.entries(weeklyAssignments[0])) {
      patternDistribution[name] = days.join(' + ');
    }

    const metrics: SchedulerMetrics = {
      daily_totals: dailyTotals,
      bad_shift_distribution: badShiftDist,
      pattern_distribution: patternDistribution,
      total_people: totalPeople,
      required_capacity: totalPeople * config.days_per_person_per_week,
      available_capacity: config.office_days.length * config.max_people_per_day,
    };

    return { status: 'SUCCESS', calendar, team_schedule: teamSchedule, metrics, variantIndex, totalVariants };
  }

  // ── Diagnostics ────────────────────────────────────────────────────────────

  private diagnoseFailure(config: SchedulerConfig): string {
    const allValid = this.findCapacityValidAssignments(config);

    if (allValid.length === 0) {
      return `No combination of team patterns fits within the daily capacity of ${config.max_people_per_day} people per day.`;
    }

    if (config.meeting_constraint.frequency === 'weekly') {
      return `Capacity allows scheduling, but no single-week assignment satisfies the meeting constraint for all team pairs. Try adding more office days or relaxing the meeting frequency to biweekly.`;
    }

    return `Could not find a valid ${config.meeting_constraint.frequency} rotation satisfying all overlap constraints across ${config.num_weeks} weeks.`;
  }

  // ── Utilities (public for use in components) ───────────────────────────────

  getPatternLabel(days: string[]): string {
    return days.join(' + ');
  }

  computeDayLoad(assignment: WeeklyAssignment, day: string, teams: Team[]): number {
    return teams
      .filter(t => (assignment[t.name] ?? []).includes(day))
      .reduce((s, t) => s + t.size, 0);
  }
}
