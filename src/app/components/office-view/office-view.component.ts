import { Component, Input, OnChanges } from '@angular/core';
import { CalendarSchedule, SchedulerConfig } from '../../models/scheduler.models';

export interface DeskSlot {
  occupied: boolean;
  teamName?: string;
  teamColor?: string;
  initial?: string;
}

@Component({
  selector: 'app-office-view',
  templateUrl: './office-view.component.html',
  styleUrls: ['./office-view.component.scss'],
})
export class OfficeViewComponent implements OnChanges {
  @Input() calendar!: CalendarSchedule;
  @Input() config!: SchedulerConfig;

  weekKeys: string[] = [];
  selectedWeek = 0;
  selectedDay = '';

  // Zone A: always 2 cols × 2 rows = 4 desks
  zoneARow1: DeskSlot[] = [];
  zoneARow2: DeskSlot[] = [];

  // Zone B: always exactly 2 rows, cols computed from remaining people
  zoneBRow1: DeskSlot[] = [];
  zoneBRow2: DeskSlot[] = [];
  zoneBCols = 4;

  teamsToday: Array<{ name: string; color: string; count: number; initial: string }> = [];

  ngOnChanges(): void {
    this.weekKeys = Object.keys(this.calendar || {});
    this.selectedWeek = 0;
    this.selectedDay = this.config?.office_days?.[0] ?? '';
    this.buildFloorPlan();
  }

  selectWeek(i: number): void {
    this.selectedWeek = i;
    this.buildFloorPlan();
  }

  selectDay(day: string): void {
    this.selectedDay = day;
    this.buildFloorPlan();
  }

  private buildFloorPlan(): void {
    if (!this.calendar || !this.config || !this.weekKeys.length) return;

    const weekKey = this.weekKeys[this.selectedWeek];
    const teamNamesOnDay: string[] = this.calendar[weekKey]?.[this.selectedDay] ?? [];
    const teamMap = new Map(this.config.teams.map(t => [t.name, t]));

    const personSlots: Array<{ teamName: string; color: string; initial: string }> = [];
    this.teamsToday = [];

    for (const teamName of teamNamesOnDay) {
      const team = teamMap.get(teamName);
      if (!team) continue;
      const color = team.color ?? '#888';
      const initial = teamName.length >= 2 ? teamName.substring(0, 2).toUpperCase() : teamName.toUpperCase();
      for (let i = 0; i < team.size; i++) {
        personSlots.push({ teamName, color, initial });
      }
      this.teamsToday.push({ name: teamName, color, count: team.size, initial });
    }

    const makeDesk = (i: number, offset: number): DeskSlot => {
      const p = personSlots[offset + i];
      return p
        ? { occupied: true, teamName: p.teamName, teamColor: p.color, initial: p.initial }
        : { occupied: false };
    };

    // Zone A: fixed 2 cols × 2 rows
    this.zoneARow1 = [makeDesk(0, 0), makeDesk(1, 0)];
    this.zoneARow2 = [makeDesk(2, 0), makeDesk(3, 0)];

    // Zone B: exactly 2 rows, cols = max(4, ceil(remaining / 2))
    const zoneBPeople = Math.max(0, personSlots.length - 4);
    this.zoneBCols = Math.max(4, Math.ceil(zoneBPeople / 2));
    this.zoneBRow1 = Array.from({ length: this.zoneBCols }, (_, i) => makeDesk(i, 4));
    this.zoneBRow2 = Array.from({ length: this.zoneBCols }, (_, i) => makeDesk(this.zoneBCols + i, 4));
  }

  get daysToday(): string[] {
    return this.config?.office_days ?? [];
  }

  get totalOnDay(): number {
    return this.teamsToday.reduce((s, t) => s + t.count, 0);
  }

  get capacityPct(): number {
    const cap = this.config?.max_people_per_day;
    if (!cap) return 0;
    return Math.round((this.totalOnDay / cap) * 100);
  }

  get isFull(): boolean {
    return this.totalOnDay >= (this.config?.max_people_per_day ?? Infinity);
  }
}
