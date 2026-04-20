import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { ALL_DAYS, CalendarSchedule, SchedulerConfig, Team } from '../../models/scheduler.models';
import { I18nService } from '../../services/i18n.service';

export interface DayCell {
  day: string;
  dayShort: string;
  teams: Team[];
  total: number;
  loadPct: number;
  isEmpty: boolean;
  overCapacity: boolean;
  isOfficeDay: boolean;
}

export interface WeekRow {
  label: string;
  index: number;
  cells: DayCell[];
  totalPeople: number;
  peakDay: string;
}

export interface Violation {
  severity: 'error' | 'warning';
  icon: string;
  title: string;
  detail: string;
}

@Component({
  selector: 'app-calendar-view',
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.scss'],
})
export class CalendarViewComponent implements OnChanges {
  @Input() calendar!: CalendarSchedule;
  @Input() config!: SchedulerConfig;
  @Output() calendarChange = new EventEmitter<CalendarSchedule>();

  weeks: WeekRow[] = [];
  editWeeks: WeekRow[] = [];
  activeWeek = 0;
  isModified = false;
  violations: Violation[] = [];

  readonly weekAccents = ['#4A90D9', '#2ECC71', '#9B59B6', '#F5A623', '#E74C3C', '#1ABC9C', '#3498DB', '#E67E22'];

  private _selfEmit = false;

  constructor(public i18n: I18nService) {}

  ngOnChanges(): void {
    if (this._selfEmit) { this._selfEmit = false; return; }
    if (!this.calendar || !this.config) return;
    this.weeks = this.buildWeeks();
    this.editWeeks = this.deepClone(this.weeks);
    this.isModified = false;
    this.violations = [];
  }

  private buildWeeks(): WeekRow[] {
    return Object.entries(this.calendar).map(([label, dayMap], index) => {
      const cells: DayCell[] = ALL_DAYS.map(day => {
        const isOfficeDay = this.config.office_days.includes(day);
        const teamNames: string[] = isOfficeDay ? (dayMap[day] ?? []) : [];
        const teams = teamNames.map(n => this.config.teams.find(t => t.name === n)!).filter(Boolean);
        const total = teams.reduce((s, t) => s + t.size, 0);
        const loadPct = Math.min(100, Math.round((total / this.config.max_people_per_day) * 100));
        return { day, dayShort: day.slice(0, 3).toUpperCase(), teams, total, loadPct,
                 isEmpty: teams.length === 0, overCapacity: total > this.config.max_people_per_day, isOfficeDay };
      });
      const peakCell = cells.reduce((a, b) => b.total > a.total ? b : a, cells[0]);
      return { label, index, cells,
               totalPeople: this.config.teams.reduce((s, t) => s + t.size, 0),
               peakDay: peakCell?.day ?? '' };
    });
  }

  private deepClone(ws: WeekRow[]): WeekRow[] {
    return ws.map(w => ({ ...w, cells: w.cells.map(c => ({ ...c, teams: [...c.teams] })) }));
  }

  // ── Drop list IDs ────────────────────────────────────────────────

  dropListId(weekIdx: number, dayIdx: number): string {
    return `w${weekIdx}d${dayIdx}`;
  }

  /** Connected IDs = all other office-day columns in the same week */
  connectedTo(weekIdx: number, dayIdx: number): string[] {
    return this.editWeeks[weekIdx].cells
      .map((c, i) => ({ c, i }))
      .filter(({ c, i }) => c.isOfficeDay && i !== dayIdx)
      .map(({ i }) => this.dropListId(weekIdx, i));
  }

  // ── Drop handler ─────────────────────────────────────────────────

  onDrop(event: CdkDragDrop<Team[]>, weekIdx: number): void {
    if (event.previousContainer === event.container) return;

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    this.refreshCells(this.editWeeks[weekIdx]);
    this.isModified = true;
    this.violations = this.checkViolations();
    this._selfEmit = true;
    this.calendarChange.emit(this.toCalendarSchedule());
  }

  private refreshCells(week: WeekRow): void {
    for (const cell of week.cells) {
      cell.total = cell.teams.reduce((s, t) => s + t.size, 0);
      cell.loadPct = Math.min(100, Math.round((cell.total / this.config.max_people_per_day) * 100));
      cell.isEmpty = cell.teams.length === 0;
      cell.overCapacity = cell.total > this.config.max_people_per_day;
    }
  }

  reset(): void {
    this.editWeeks = this.deepClone(this.weeks);
    this.isModified = false;
    this.violations = [];
    this._selfEmit = true;
    this.calendarChange.emit(this.toCalendarSchedule());
  }

  private toCalendarSchedule(): CalendarSchedule {
    const cal: CalendarSchedule = {};
    for (const week of this.editWeeks) {
      cal[week.label] = {};
      for (const cell of week.cells) {
        if (cell.isOfficeDay) {
          cal[week.label][cell.day] = cell.teams.map(t => t.name);
        }
      }
    }
    return cal;
  }

  // ── Constraint checker ───────────────────────────────────────────

  private checkViolations(): Violation[] {
    const v: Violation[] = [];
    const dpw = this.config.days_per_person_per_week;
    const cap = this.config.max_people_per_day;
    const forbidden = this.config.constraints.forbidden_day_pairs ?? [];
    const bad = this.config.constraints.avoid_day_pairs ?? [];
    const freq = this.config.meeting_constraint.frequency;

    for (const week of this.editWeeks) {
      // Derive team→days assignment from cells
      const assign: Record<string, string[]> = {};
      for (const t of this.config.teams) assign[t.name] = [];
      for (const cell of week.cells) {
        if (!cell.isOfficeDay) continue;
        for (const t of cell.teams) assign[t.name].push(cell.day);
      }

      // Capacity
      for (const cell of week.cells) {
        if (!cell.isOfficeDay || cell.total <= cap) continue;
        v.push({
          severity: 'error', icon: 'groups',
          title: `${week.label} · ${this.i18n.day(cell.day)} over capacity`,
          detail: `${cell.total} people scheduled, max is ${cap}.`,
        });
      }

      // Days per person per week
      for (const t of this.config.teams) {
        const n = assign[t.name].length;
        if (n !== dpw) {
          v.push({
            severity: 'error', icon: 'event_busy',
            title: `${week.label} · ${t.name}: wrong day count`,
            detail: `Has ${n} day${n !== 1 ? 's' : ''}, expected ${dpw}.`,
          });
        }
      }

      // Forbidden pairs
      for (const t of this.config.teams) {
        for (const pair of forbidden) {
          const days = pair.split('+');
          if (days.every(d => assign[t.name].includes(d))) {
            v.push({
              severity: 'error', icon: 'block',
              title: `${week.label} · ${t.name}: forbidden combination`,
              detail: `${days.map(d => this.i18n.dayShort(d)).join(' + ')} is strictly forbidden.`,
            });
          }
        }
      }

      // Bad (undesirable) pairs — warning only
      for (const t of this.config.teams) {
        for (const pair of bad) {
          const days = pair.split('+');
          if (days.every(d => assign[t.name].includes(d))) {
            v.push({
              severity: 'warning', icon: 'warning_amber',
              title: `${week.label} · ${t.name}: undesirable combination`,
              detail: `${days.map(d => this.i18n.dayShort(d)).join(' + ')} is marked as a bad shift.`,
            });
          }
        }
      }

      // Meeting overlap (weekly → every pair must share a day this week)
      if (freq === 'weekly') {
        for (let i = 0; i < this.config.teams.length; i++) {
          for (let j = i + 1; j < this.config.teams.length; j++) {
            const tA = this.config.teams[i];
            const tB = this.config.teams[j];
            if (!assign[tA.name].some(d => assign[tB.name].includes(d))) {
              v.push({
                severity: 'error', icon: 'handshake',
                title: `${week.label} · ${tA.name} & ${tB.name} never overlap`,
                detail: `Weekly meeting requires all teams to share at least one day.`,
              });
            }
          }
        }
      }
    }

    // Meeting overlap across weeks (biweekly / monthly)
    if (freq !== 'weekly') {
      for (let i = 0; i < this.config.teams.length; i++) {
        for (let j = i + 1; j < this.config.teams.length; j++) {
          const tA = this.config.teams[i];
          const tB = this.config.teams[j];
          const everMet = this.editWeeks.some(week => {
            const assign: Record<string, string[]> = {};
            for (const t of this.config.teams) assign[t.name] = [];
            for (const cell of week.cells) {
              if (!cell.isOfficeDay) continue;
              for (const t of cell.teams) assign[t.name].push(cell.day);
            }
            return assign[tA.name].some(d => assign[tB.name].includes(d));
          });
          if (!everMet) {
            v.push({
              severity: 'error', icon: 'handshake',
              title: `${tA.name} & ${tB.name} never overlap across all weeks`,
              detail: `${freq === 'biweekly' ? 'Biweekly' : 'Monthly'} meeting requires at least one shared day over the full schedule.`,
            });
          }
        }
      }
    }

    return v;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  get errorCount(): number  { return this.violations.filter(v => v.severity === 'error').length; }
  get warnCount(): number   { return this.violations.filter(v => v.severity === 'warning').length; }

  weekColor(index: number): string { return this.weekAccents[index % this.weekAccents.length]; }

  getLoadClass(pct: number): string {
    if (pct >= 100) return 'over';
    if (pct >= 85)  return 'high';
    if (pct >= 60)  return 'mid';
    return 'low';
  }

  trackByLabel(_: number, w: WeekRow): string { return w.label; }
  trackByDay(_: number, c: DayCell): string   { return c.day; }
  trackByName(_: number, t: Team): string     { return t.name; }
}
