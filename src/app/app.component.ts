import { Component } from '@angular/core';
import { SchedulerConfig, SchedulerResult } from './models/scheduler.models';
import { SchedulerService } from './services/scheduler.service';
import { I18nService, Lang } from './services/i18n.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  result: SchedulerResult | null = null;
  loading = false;
  activeTab = 0;
  sidebarOpen = true;
  lastConfig: SchedulerConfig | null = null;
  variantIdx = 0;

  readonly langs: Lang[] = ['en', 'fr', 'ar'];

  constructor(private scheduler: SchedulerService, public i18n: I18nService) {}

  setLang(lang: Lang): void { this.i18n.setLang(lang); }

  onConfigChange(config: SchedulerConfig): void {
    this.lastConfig = config;
    this.variantIdx = 0;
    this.loading = true;
    setTimeout(() => {
      this.result = this.scheduler.solve(config, 0);
      this.loading = false;
    }, 0);
  }

  reroll(): void {
    if (!this.lastConfig) return;
    const total = this.result?.totalVariants ?? 1;
    this.variantIdx = (this.variantIdx + 1) % total;
    this.loading = true;
    const config = this.lastConfig;
    const idx = this.variantIdx;
    setTimeout(() => {
      this.result = this.scheduler.solve(config, idx);
      this.loading = false;
    }, 0);
  }

  get totalVariants(): number {
    return this.result?.totalVariants ?? 1;
  }

  get weekLabels(): string[] {
    if (!this.result?.team_schedule) return [];
    return Object.keys(this.result.team_schedule);
  }

  get displayedColumns(): string[] {
    return ['team', ...this.weekLabels.map((_, i) => `week_${i + 1}`), 'badShifts'];
  }


  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
}
