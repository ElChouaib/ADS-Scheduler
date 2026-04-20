import { Component, Input, OnChanges } from '@angular/core';
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

@Component({
  selector: 'app-calendar-view',
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.scss'],
})
export class CalendarViewComponent implements OnChanges {
  @Input() calendar!: CalendarSchedule;
  @Input() config!: SchedulerConfig;

  weeks: WeekRow[] = [];
  activeWeek = 0;

  readonly weekAccents = ['#4A90D9', '#2ECC71', '#9B59B6', '#F5A623', '#E74C3C', '#1ABC9C', '#3498DB', '#E67E22'];

  constructor(public i18n: I18nService) {}

  ngOnChanges(): void {
    if (!this.calendar || !this.config) return;
    this.weeks = Object.entries(this.calendar).map(([label, dayMap], index) => {
      const cells: DayCell[] = ALL_DAYS.map(day => {
        const isOfficeDay = this.config.office_days.includes(day);
        const teamNames: string[] = isOfficeDay ? (dayMap[day] ?? []) : [];
        const teams = teamNames.map(n => this.config.teams.find(t => t.name === n)!).filter(Boolean);
        const total = teams.reduce((s, t) => s + t.size, 0);
        const loadPct = Math.min(100, Math.round((total / this.config.max_people_per_day) * 100));
        return {
          day,
          dayShort: day.slice(0, 3).toUpperCase(),
          teams,
          total,
          loadPct,
          isEmpty: teams.length === 0,
          overCapacity: total > this.config.max_people_per_day,
          isOfficeDay,
        };
      });
      const peakCell = cells.reduce((a, b) => b.total > a.total ? b : a, cells[0]);
      return {
        label,
        index,
        cells,
        totalPeople: this.config.teams.reduce((s, t) => s + t.size, 0),
        peakDay: peakCell?.day ?? '',
      };
    });
  }

  weekColor(index: number): string {
    return this.weekAccents[index % this.weekAccents.length];
  }

  getLoadClass(pct: number): string {
    if (pct >= 100) return 'over';
    if (pct >= 85) return 'high';
    if (pct >= 60) return 'mid';
    return 'low';
  }

  trackByLabel(_: number, w: WeekRow): string { return w.label; }
  trackByDay(_: number, c: DayCell): string { return c.day; }
  trackByName(_: number, t: Team): string { return t.name; }
}
