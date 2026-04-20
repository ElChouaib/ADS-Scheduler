import { Component, Input, OnChanges } from '@angular/core';
import { TeamSchedule, SchedulerConfig, Team } from '../../models/scheduler.models';
import { SchedulerService } from '../../services/scheduler.service';

interface TeamRow {
  team: Team;
  weekPatterns: string[];
  hasBadShift: boolean;
  badShiftWeeks: number[];
}

@Component({
  selector: 'app-team-view',
  templateUrl: './team-view.component.html',
  styleUrls: ['./team-view.component.scss'],
})
export class TeamViewComponent implements OnChanges {
  @Input() teamSchedule!: TeamSchedule;
  @Input() config!: SchedulerConfig;
  @Input() displayedColumns: string[] = [];

  rows: TeamRow[] = [];
  weekLabels: string[] = [];

  constructor(private scheduler: SchedulerService) {}

  ngOnChanges(): void {
    if (!this.teamSchedule || !this.config) return;
    this.weekLabels = Object.keys(this.teamSchedule);

    this.rows = this.config.teams.map(team => {
      const weekPatterns = this.weekLabels.map(w =>
        (this.teamSchedule[w]?.[team.name] ?? []).join(' + ')
      );
      const badShiftWeeks = this.weekLabels
        .map((w, i) => ({ i, days: this.teamSchedule[w]?.[team.name] ?? [] }))
        .filter(({ days }) => this.scheduler.isBadPattern(days, this.config.constraints.avoid_day_pairs))
        .map(({ i }) => i + 1);

      return {
        team,
        weekPatterns,
        hasBadShift: badShiftWeeks.length > 0,
        badShiftWeeks,
      };
    });
  }
}
