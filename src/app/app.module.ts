import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Angular Material
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';

// App
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ConfigPanelComponent } from './components/config-panel/config-panel.component';
import { CalendarViewComponent } from './components/calendar-view/calendar-view.component';
import { TeamViewComponent } from './components/team-view/team-view.component';
import { MetricsViewComponent } from './components/metrics-view/metrics-view.component';
import { OfficeViewComponent } from './components/office-view/office-view.component';
import { Office3dViewComponent } from './components/office-3d-view/office-3d-view.component';
import { FindHintPipe } from './pipes/find-hint.pipe';
import { I18nPipe } from './pipes/i18n.pipe';
import { I18nService } from './services/i18n.service';

const MATERIAL = [
  MatToolbarModule, MatSidenavModule, MatButtonModule, MatIconModule,
  MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule,
  MatSlideToggleModule, MatTabsModule, MatTableModule, MatChipsModule,
  MatDividerModule, MatProgressBarModule, MatProgressSpinnerModule,
  MatTooltipModule, MatCardModule, MatBadgeModule,
];

@NgModule({
  declarations: [
    AppComponent,
    ConfigPanelComponent,
    CalendarViewComponent,
    TeamViewComponent,
    MetricsViewComponent,
    OfficeViewComponent,
    Office3dViewComponent,
    FindHintPipe,
    I18nPipe,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    ...MATERIAL,
  ],
  providers: [I18nService],
  bootstrap: [AppComponent],
})
export class AppModule {}
