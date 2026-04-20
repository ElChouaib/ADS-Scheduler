import { Component, Input, OnChanges } from '@angular/core';
import { CalendarSchedule, SchedulerConfig } from '../../models/scheduler.models';

export interface AgentSlot {
  teamName: string;
  teamColor: string;
  initial: string;
  animDelay: number;
}

@Component({
  selector: 'app-office-3d-view',
  templateUrl: './office-3d-view.component.html',
  styleUrls: ['./office-3d-view.component.scss'],
})
export class Office3dViewComponent implements OnChanges {
  @Input() calendar!: CalendarSchedule;
  @Input() config!: SchedulerConfig;

  weekKeys: string[] = [];
  selectedWeek = 0;
  selectedDay = '';

  zoneASlots: (AgentSlot | null)[] = [null, null, null, null];
  zoneBRows: (AgentSlot | null)[][] = [[], []];
  zoneBCols = 4;

  teamsToday: Array<{ name: string; color: string; count: number; initial: string }> = [];
  scanning = false;
  missionActive = false;
  renderKey = 0;

  ngOnChanges(): void {
    this.weekKeys = Object.keys(this.calendar || {});
    this.selectedWeek = 0;
    this.selectedDay = this.config?.office_days?.[0] ?? '';
    this.rebuild();
  }

  selectWeek(i: number): void {
    this.selectedWeek = i;
    this.triggerScan();
    this.rebuild();
  }

  selectDay(day: string): void {
    this.selectedDay = day;
    this.triggerScan();
    this.rebuild();
  }

  private triggerScan(): void {
    this.scanning = false;
    setTimeout(() => (this.scanning = true), 20);
    setTimeout(() => (this.scanning = false), 700);
  }

  private rebuild(): void {
    if (!this.calendar || !this.config || !this.weekKeys.length) return;
    this.renderKey++;

    const weekKey = this.weekKeys[this.selectedWeek];
    const teamNames: string[] = this.calendar[weekKey]?.[this.selectedDay] ?? [];
    const teamMap = new Map(this.config.teams.map(t => [t.name, t]));

    const slots: AgentSlot[] = [];
    this.teamsToday = [];

    for (const name of teamNames) {
      const team = teamMap.get(name);
      if (!team) continue;
      const color = team.color ?? '#888';
      const initial = name.substring(0, 2).toUpperCase();
      this.teamsToday.push({ name, color, count: team.size, initial });
      for (let i = 0; i < team.size; i++) {
        slots.push({ teamName: name, teamColor: color, initial, animDelay: slots.length * 90 });
      }
    }

    this.zoneASlots = Array.from({ length: 4 }, (_, i) => slots[i] ?? null);

    const remaining = slots.slice(4);
    const cap = this.config.max_people_per_day;
    const zoneBTotal = Math.max(0, cap - 4);
    this.zoneBCols = Math.max(4, Math.ceil(Math.max(remaining.length, zoneBTotal) / 2));
    this.zoneBRows = [
      Array.from({ length: this.zoneBCols }, (_, i) => remaining[i] ?? null),
      Array.from({ length: this.zoneBCols }, (_, i) => remaining[this.zoneBCols + i] ?? null),
    ];

    this.missionActive = slots.length > 0;
  }

  get totalOnDay(): number {
    return this.teamsToday.reduce((s, t) => s + t.count, 0);
  }

  get capacityPct(): number {
    const cap = this.config?.max_people_per_day ?? 1;
    return Math.min(100, Math.round((this.totalOnDay / cap) * 100));
  }

  get daysToday(): string[] {
    return this.config?.office_days ?? [];
  }

  get threatLevel(): string {
    const p = this.capacityPct;
    if (p >= 100) return 'CRITICAL';
    if (p >= 85) return 'HIGH';
    if (p >= 60) return 'MODERATE';
    return 'LOW';
  }

  get threatClass(): string {
    const p = this.capacityPct;
    if (p >= 100) return 'critical';
    if (p >= 85) return 'high';
    if (p >= 60) return 'moderate';
    return 'low';
  }

  get zoneAHasAgents(): boolean {
    return this.zoneASlots.some(s => !!s);
  }

  get zoneBHasAgents(): boolean {
    return this.zoneBRows.some(row => row.some(s => !!s));
  }
}
