import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ALL_DAYS,
  DEFAULT_CONFIG,
  SchedulerConfig,
  TEAM_COLORS,
} from '../../models/scheduler.models';
import { I18nService } from '../../services/i18n.service';

const STORAGE_KEY = 'ads_shift_config';

@Component({
  selector: 'app-config-panel',
  templateUrl: './config-panel.component.html',
  styleUrls: ['./config-panel.component.scss'],
})
export class ConfigPanelComponent implements OnInit {
  @Input() loading = false;
  @Output() configChange = new EventEmitter<SchedulerConfig>();

  form!: FormGroup;
  readonly allDays = ALL_DAYS;
  readonly teamColors = TEAM_COLORS;

  readonly frequencies = [
    { value: 'weekly',   hintKey: 'cfg.meeting.weekly_hint' },
    { value: 'biweekly', hintKey: 'cfg.meeting.biweekly_hint' },
    { value: 'monthly',  hintKey: 'cfg.meeting.monthly_hint' },
  ];

  newTeamName = '';
  newTeamSize = 2;

  selectedBadPairs = new Set<string>();
  selectedForbiddenPairs = new Set<string>();

  savedFlash = false;

  constructor(private fb: FormBuilder, public i18n: I18nService) {}

  ngOnInit(): void {
    const saved = this.loadFromStorage();
    this.buildForm(saved ?? DEFAULT_CONFIG);
    this.emit();
  }

  private buildForm(cfg: SchedulerConfig): void {
    this.selectedBadPairs = new Set(cfg.constraints.avoid_day_pairs);
    this.selectedForbiddenPairs = new Set(cfg.constraints.forbidden_day_pairs ?? []);
    this.form = this.fb.group({
      officeDays: this.fb.group(
        ALL_DAYS.reduce((acc, d) => ({ ...acc, [d]: cfg.office_days.includes(d) }), {} as Record<string, boolean>)
      ),
      daysPerPersonPerWeek: [cfg.days_per_person_per_week, [Validators.min(1), Validators.max(5)]],
      maxPeoplePerDay: [cfg.max_people_per_day, [Validators.min(1), Validators.max(200)]],
      numWeeks: [cfg.num_weeks, [Validators.min(1), Validators.max(12)]],
      meetingFrequency: [cfg.meeting_constraint.frequency],
      balanceBadShifts: [cfg.constraints.fairness.balance_bad_shifts],
      teams: this.fb.array(cfg.teams.map(t => this.makeTeamGroup(t.name, t.size, t.color!))),
    });
  }

  private makeTeamGroup(name: string, size: number, color: string): FormGroup {
    return this.fb.group({
      name: [name, Validators.required],
      size: [size, [Validators.required, Validators.min(1), Validators.max(100)]],
      color: [color],
    });
  }

  get teamsArray(): FormArray {
    return this.form.get('teams') as FormArray;
  }

  addTeam(): void {
    const name = this.newTeamName.trim();
    if (!name) return;
    const color = this.teamColors[this.teamsArray.length % this.teamColors.length];
    this.teamsArray.push(this.makeTeamGroup(name, this.newTeamSize, color));
    this.newTeamName = '';
    this.newTeamSize = 2;
    this.emit();
  }

  removeTeam(i: number): void {
    this.teamsArray.removeAt(i);
    this.emit();
  }

  toggleDay(day: string): void {
    const ctrl = (this.form.get('officeDays') as FormGroup).get(day)!;
    ctrl.setValue(!ctrl.value);
    const days = this.selectedDays();
    for (const pair of [...this.selectedBadPairs]) {
      if (pair.split('+').some(d => !days.includes(d))) this.selectedBadPairs.delete(pair);
    }
    for (const pair of [...this.selectedForbiddenPairs]) {
      if (pair.split('+').some(d => !days.includes(d))) this.selectedForbiddenPairs.delete(pair);
    }
    this.emit();
  }

  isDaySelected(day: string): boolean {
    return !!(this.form.get('officeDays') as FormGroup).get(day)?.value;
  }

  selectedDays(): string[] {
    return ALL_DAYS.filter(d => this.isDaySelected(d));
  }

  get availablePairs(): string[] {
    const days = this.selectedDays();
    const pairs: string[] = [];
    for (let i = 0; i < days.length; i++) {
      for (let j = i + 1; j < days.length; j++) {
        pairs.push(`${days[i]}+${days[j]}`);
      }
    }
    return pairs;
  }

  get badShiftPairs(): string[] {
    return this.availablePairs.filter(p => !this.selectedForbiddenPairs.has(p));
  }

  toggleBadPair(pair: string): void {
    if (this.selectedBadPairs.has(pair)) {
      this.selectedBadPairs.delete(pair);
    } else {
      this.selectedBadPairs.add(pair);
    }
    this.emit();
  }

  isBadPair(pair: string): boolean {
    return this.selectedBadPairs.has(pair);
  }

  toggleForbiddenPair(pair: string): void {
    if (this.selectedForbiddenPairs.has(pair)) {
      this.selectedForbiddenPairs.delete(pair);
    } else {
      this.selectedForbiddenPairs.add(pair);
    }
    this.emit();
  }

  isForbiddenPair(pair: string): boolean {
    return this.selectedForbiddenPairs.has(pair);
  }

  pairLabel(pair: string): string {
    return pair.split('+').map(d => d.slice(0, 3)).join(' + ');
  }

  currentFrequencyHint(): string {
    const key = this.frequencies.find(f => f.value === this.form.get('meetingFrequency')?.value)?.hintKey ?? '';
    return key ? this.i18n.t(key) : '';
  }

  private buildConfig(): SchedulerConfig | null {
    if (this.form.invalid) return null;
    const v = this.form.value;
    return {
      teams: this.teamsArray.controls.map((c, i) => ({
        id: String(i + 1),
        name: c.get('name')!.value,
        size: +c.get('size')!.value,
        color: c.get('color')!.value,
      })),
      office_days: this.selectedDays(),
      days_per_person_per_week: +v.daysPerPersonPerWeek,
      max_people_per_day: +v.maxPeoplePerDay,
      num_weeks: +v.numWeeks,
      meeting_constraint: { type: 'direct_overlap', frequency: v.meetingFrequency },
      constraints: {
        teams_must_stay_together: true,
        avoid_day_pairs: [...this.selectedBadPairs],
        forbidden_day_pairs: [...this.selectedForbiddenPairs],
        fairness: { balance_bad_shifts: v.balanceBadShifts },
      },
    };
  }

  emit(): void {
    const cfg = this.buildConfig();
    if (cfg) this.configChange.emit(cfg);
  }

  saveConfig(): void {
    const cfg = this.buildConfig();
    if (!cfg) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    this.savedFlash = true;
    setTimeout(() => (this.savedFlash = false), 2000);
  }

  private loadFromStorage(): SchedulerConfig | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SchedulerConfig) : null;
    } catch {
      return null;
    }
  }

  reset(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.buildForm(DEFAULT_CONFIG);
    this.emit();
  }

  get totalPeople(): number {
    return this.teamsArray.controls.reduce((s, c) => s + (+c.get('size')!.value || 0), 0);
  }
}
