import { Component, Input, OnChanges } from '@angular/core';
import { SchedulerConfig, SchedulerMetrics } from '../../models/scheduler.models';

interface DayBar {
  day: string;
  avgLoad: number;
  maxLoad: number;
  capacity: number;
  pct: number;
  status: 'ok' | 'tight' | 'full';
}

@Component({
  selector: 'app-metrics-view',
  templateUrl: './metrics-view.component.html',
  styleUrls: ['./metrics-view.component.scss'],
})
export class MetricsViewComponent implements OnChanges {
  @Input() metrics!: SchedulerMetrics;
  @Input() config!: SchedulerConfig;

  dayBars: DayBar[] = [];
  weekKeys: string[] = [];
  patternRows: { team: string; pattern: string; color: string }[] = [];
  badShiftEntries: { pattern: string; teams: string[] }[] = [];
  utilizationPct = 0;

  ngOnChanges(): void {
    if (!this.metrics || !this.config) return;
    this.weekKeys = Object.keys(this.metrics.daily_totals);
    this.buildDayBars();
    this.buildPatternRows();
    this.buildBadShifts();
    this.utilizationPct = Math.round((this.metrics.required_capacity / this.metrics.available_capacity) * 100);
  }

  private buildDayBars(): void {
    const cap = this.config.max_people_per_day;
    const weekCount = this.weekKeys.length;

    this.dayBars = this.config.office_days.map(day => {
      const loads = this.weekKeys.map(wk => this.metrics.daily_totals[wk]?.[day] ?? 0);
      const avg = loads.reduce((s, v) => s + v, 0) / weekCount;
      const max = Math.max(...loads);
      const pct = Math.round((avg / cap) * 100);
      return {
        day,
        avgLoad: Math.round(avg * 10) / 10,
        maxLoad: max,
        capacity: cap,
        pct,
        status: pct >= 100 ? 'full' : pct >= 80 ? 'tight' : 'ok',
      };
    });
  }

  private buildPatternRows(): void {
    this.patternRows = Object.entries(this.metrics.pattern_distribution).map(([team, pattern]) => ({
      team,
      pattern,
      color: this.config.teams.find(t => t.name === team)?.color ?? '#888',
    }));
  }

  private buildBadShifts(): void {
    this.badShiftEntries = Object.entries(this.metrics.bad_shift_distribution).map(([pattern, teams]) => ({
      pattern,
      teams,
    }));
  }

  getTeamColor(name: string): string {
    return this.config.teams.find(t => t.name === name)?.color ?? '#888';
  }

  getWeekDayPct(week: string, day: string): number {
    const load = this.metrics.daily_totals[week]?.[day] ?? 0;
    const cap = this.config.max_people_per_day;
    return cap > 0 ? Math.min(100, Math.round((load / cap) * 100)) : 0;
  }

  getWeekDayClass(week: string, day: string): string {
    const pct = this.getWeekDayPct(week, day);
    if (pct >= 100) return 'over';
    if (pct >= 85) return 'high';
    if (pct >= 60) return 'mid';
    return 'low';
  }
}

