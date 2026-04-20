import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Lang = 'en' | 'fr' | 'ar';

const T: Record<Lang, Record<string, string>> = {
  en: {
    // App shell
    'app.status.generated': 'Schedule generated',
    'app.status.impossible': 'Impossible',
    'app.loading': 'Computing optimal schedule…',
    'app.empty.title': 'Configure your schedule',
    'app.empty.desc': 'Set your teams, office days, and constraints in the panel on the left — your schedule generates automatically.',
    // Tabs
    'tab.calendar': 'Calendar',
    'tab.teams': 'Teams',
    'tab.metrics': 'Metrics',
    'tab.office': 'Office',
    'tab.tactical': 'Tactical',
    // Reroll
    'reroll.combo': 'Combination',
    'reroll.of': 'of',
    'reroll.btn': 'Next combination',
    'reroll.tip.disabled': 'Only one valid combination exists',
    'reroll.tip.active': 'Cycle to the next valid combination',
    // Impossible card
    'impossible.title': 'Schedule Impossible',
    'impossible.suggestions': 'Suggestions to fix this:',
    'impossible.tip.max': 'Increase Max people / day in the config',
    'impossible.tip.days': 'Add more office days',
    'impossible.tip.dpw': 'Reduce days / person / week',
    'impossible.tip.size': 'Reduce total team sizes',
    'impossible.tip.freq': 'Relax meeting frequency to biweekly or monthly',
    // Config sidebar
    'sidebar.title': 'Configuration',
    // Config — Teams
    'cfg.teams': 'Teams',
    'cfg.team.name': 'Name',
    'cfg.team.size': 'Size',
    'cfg.team.new_name': 'New team name',
    'cfg.team.placeholder': 'e.g. DevOps',
    'cfg.team.add': 'Add',
    'cfg.team.count': 'teams',
    'cfg.team.people': 'people',
    // Config — Office days
    'cfg.office_days': 'Office Days',
    'cfg.office_days.warn': 'Select at least one office day.',
    // Config — Attendance
    'cfg.attendance': 'Attendance',
    'cfg.attendance.dpw': 'Days / person / week',
    'cfg.attendance.dpw_hint': 'Days each person attends per week',
    'cfg.attendance.max': 'Max people / day',
    'cfg.attendance.max_hint': 'Office capacity per day',
    // Config — Meeting
    'cfg.meeting': 'Meeting Constraints',
    'cfg.meeting.freq': 'Meeting frequency',
    'cfg.meeting.weekly_hint': 'All teams must meet every single week',
    'cfg.meeting.biweekly_hint': 'All teams must meet at least once every 2 weeks',
    'cfg.meeting.monthly_hint': 'All teams must meet at least once over the full schedule',
    // Config — Schedule
    'cfg.schedule': 'Schedule Settings',
    'cfg.schedule.num_weeks': 'Number of weeks',
    'cfg.schedule.num_weeks_hint': 'How many weeks to generate (1–12)',
    // Config — Fairness
    'cfg.fairness': 'Fairness',
    'cfg.fairness.bad_label': 'Mark day combinations as undesirable',
    'cfg.fairness.no_pairs': 'Select at least 2 office days to configure bad shifts.',
    'cfg.fairness.all_forbidden': 'All combinations are already forbidden.',
    'cfg.fairness.bad_hint': 'Highlighted pairs are considered bad shifts and distributed fairly across teams.',
    'cfg.fairness.forbidden_label': 'Strictly forbidden combinations',
    'cfg.fairness.forbidden_no_pairs': 'Select at least 2 office days to configure forbidden pairs.',
    'cfg.fairness.forbidden_hint': 'No team will ever be assigned these day combinations. May cause IMPOSSIBLE.',
    'cfg.fairness.balance': 'Balance bad shifts across teams',
    'cfg.save': 'Save settings',
    'cfg.saved': 'Saved!',
    'cfg.reset': 'Reset to defaults',
    // Calendar
    'cal.office_days': 'office day',
    'cal.office_days_pl': 'office days',
    'cal.people': 'people scheduled',
    'cal.no_teams': 'No teams',
    // Days
    'day.Monday': 'Monday', 'day.Tuesday': 'Tuesday', 'day.Wednesday': 'Wednesday',
    'day.Thursday': 'Thursday', 'day.Friday': 'Friday',
    'day.Mon': 'Mon', 'day.Tue': 'Tue', 'day.Wed': 'Wed', 'day.Thu': 'Thu', 'day.Fri': 'Fri',
    // Freq labels
    'freq.weekly': 'Weekly', 'freq.biweekly': 'Biweekly', 'freq.monthly': 'Monthly',
  },

  fr: {
    'app.status.generated': 'Planning généré',
    'app.status.impossible': 'Impossible',
    'app.loading': 'Calcul du planning optimal…',
    'app.empty.title': 'Configurez votre planning',
    'app.empty.desc': 'Définissez vos équipes, jours de bureau et contraintes dans le panneau à gauche — votre planning se génère automatiquement.',
    'tab.calendar': 'Calendrier',
    'tab.teams': 'Équipes',
    'tab.metrics': 'Métriques',
    'tab.office': 'Bureau',
    'tab.tactical': 'Tactique',
    'reroll.combo': 'Combinaison',
    'reroll.of': 'sur',
    'reroll.btn': 'Combinaison suivante',
    'reroll.tip.disabled': 'Une seule combinaison valide existe',
    'reroll.tip.active': 'Passer à la prochaine combinaison valide',
    'impossible.title': 'Planning Impossible',
    'impossible.suggestions': 'Suggestions pour résoudre cela :',
    'impossible.tip.max': 'Augmenter le max de personnes / jour dans la config',
    'impossible.tip.days': 'Ajouter plus de jours de bureau',
    'impossible.tip.dpw': 'Réduire les jours / personne / semaine',
    'impossible.tip.size': 'Réduire la taille totale des équipes',
    'impossible.tip.freq': 'Assouplir la fréquence à bihebdomadaire ou mensuel',
    'sidebar.title': 'Configuration',
    'cfg.teams': 'Équipes',
    'cfg.team.name': 'Nom',
    'cfg.team.size': 'Taille',
    'cfg.team.new_name': 'Nom de la nouvelle équipe',
    'cfg.team.placeholder': 'ex. DevOps',
    'cfg.team.add': 'Ajouter',
    'cfg.team.count': 'équipes',
    'cfg.team.people': 'personnes',
    'cfg.office_days': 'Jours de bureau',
    'cfg.office_days.warn': 'Sélectionnez au moins un jour de bureau.',
    'cfg.attendance': 'Présence',
    'cfg.attendance.dpw': 'Jours / personne / semaine',
    'cfg.attendance.dpw_hint': 'Jours de présence au bureau par semaine',
    'cfg.attendance.max': 'Max personnes / jour',
    'cfg.attendance.max_hint': 'Capacité du bureau par jour',
    'cfg.meeting': 'Contraintes de réunion',
    'cfg.meeting.freq': 'Fréquence des réunions',
    'cfg.meeting.weekly_hint': 'Toutes les équipes doivent se réunir chaque semaine',
    'cfg.meeting.biweekly_hint': 'Toutes les équipes doivent se réunir au moins une fois toutes les 2 semaines',
    'cfg.meeting.monthly_hint': 'Toutes les équipes doivent se réunir au moins une fois sur tout le planning',
    'cfg.schedule': 'Paramètres du planning',
    'cfg.schedule.num_weeks': 'Nombre de semaines',
    'cfg.schedule.num_weeks_hint': 'Combien de semaines à générer (1–12)',
    'cfg.fairness': 'Équité',
    'cfg.fairness.bad_label': 'Marquer les combinaisons de jours comme indésirables',
    'cfg.fairness.no_pairs': 'Sélectionnez au moins 2 jours de bureau.',
    'cfg.fairness.all_forbidden': 'Toutes les combinaisons sont déjà interdites.',
    'cfg.fairness.bad_hint': 'Les paires surlignées sont considérées comme de mauvais créneaux.',
    'cfg.fairness.forbidden_label': 'Combinaisons strictement interdites',
    'cfg.fairness.forbidden_no_pairs': 'Sélectionnez au moins 2 jours de bureau.',
    'cfg.fairness.forbidden_hint': "Aucune équipe ne sera jamais assignée à ces combinaisons. Peut causer IMPOSSIBLE.",
    'cfg.fairness.balance': 'Équilibrer les mauvais créneaux entre les équipes',
    'cfg.save': 'Sauvegarder',
    'cfg.saved': 'Sauvegardé !',
    'cfg.reset': 'Réinitialiser',
    'cal.office_days': 'jour de bureau',
    'cal.office_days_pl': 'jours de bureau',
    'cal.people': 'personnes planifiées',
    'cal.no_teams': 'Aucune équipe',
    'day.Monday': 'Lundi', 'day.Tuesday': 'Mardi', 'day.Wednesday': 'Mercredi',
    'day.Thursday': 'Jeudi', 'day.Friday': 'Vendredi',
    'day.Mon': 'Lun', 'day.Tue': 'Mar', 'day.Wed': 'Mer', 'day.Thu': 'Jeu', 'day.Fri': 'Ven',
    'freq.weekly': 'Hebdomadaire', 'freq.biweekly': 'Bihebdomadaire', 'freq.monthly': 'Mensuel',
  },

  ar: {
    'app.status.generated': 'تم إنشاء الجدول',
    'app.status.impossible': 'مستحيل',
    'app.loading': 'جارٍ احتساب الجدول الأمثل…',
    'app.empty.title': 'قم بإعداد جدولك',
    'app.empty.desc': 'حدد فرقك وأيام المكتب والقيود في اللوحة — سيتم إنشاء الجدول تلقائياً.',
    'tab.calendar': 'التقويم',
    'tab.teams': 'الفرق',
    'tab.metrics': 'المقاييس',
    'tab.office': 'المكتب',
    'tab.tactical': 'التكتيكي',
    'reroll.combo': 'التوليفة',
    'reroll.of': 'من',
    'reroll.btn': 'التوليفة التالية',
    'reroll.tip.disabled': 'توجد توليفة واحدة صالحة فقط',
    'reroll.tip.active': 'الانتقال إلى التوليفة الصالحة التالية',
    'impossible.title': 'الجدول مستحيل',
    'impossible.suggestions': 'اقتراحات لإصلاح ذلك:',
    'impossible.tip.max': 'زيادة الحد الأقصى للأشخاص/يوم في الإعدادات',
    'impossible.tip.days': 'إضافة المزيد من أيام المكتب',
    'impossible.tip.dpw': 'تقليل الأيام/شخص/أسبوع',
    'impossible.tip.size': 'تقليل أحجام الفرق الإجمالية',
    'impossible.tip.freq': 'تخفيف تكرار الاجتماعات إلى نصف أسبوعي أو شهري',
    'sidebar.title': 'الإعدادات',
    'cfg.teams': 'الفرق',
    'cfg.team.name': 'الاسم',
    'cfg.team.size': 'الحجم',
    'cfg.team.new_name': 'اسم الفريق الجديد',
    'cfg.team.placeholder': 'مثال: DevOps',
    'cfg.team.add': 'إضافة',
    'cfg.team.count': 'فرق',
    'cfg.team.people': 'أشخاص',
    'cfg.office_days': 'أيام المكتب',
    'cfg.office_days.warn': 'اختر يوماً واحداً على الأقل.',
    'cfg.attendance': 'الحضور',
    'cfg.attendance.dpw': 'أيام/شخص/أسبوع',
    'cfg.attendance.dpw_hint': 'أيام حضور كل شخص أسبوعياً',
    'cfg.attendance.max': 'الحد الأقصى للأشخاص/يوم',
    'cfg.attendance.max_hint': 'سعة المكتب اليومية',
    'cfg.meeting': 'قيود الاجتماعات',
    'cfg.meeting.freq': 'تكرار الاجتماعات',
    'cfg.meeting.weekly_hint': 'يجب أن تجتمع جميع الفرق كل أسبوع',
    'cfg.meeting.biweekly_hint': 'يجب أن تجتمع الفرق مرة واحدة على الأقل كل أسبوعين',
    'cfg.meeting.monthly_hint': 'يجب أن تجتمع الفرق مرة واحدة على الأقل طوال الجدول',
    'cfg.schedule': 'إعدادات الجدول',
    'cfg.schedule.num_weeks': 'عدد الأسابيع',
    'cfg.schedule.num_weeks_hint': 'عدد الأسابيع المراد إنشاؤها (1-12)',
    'cfg.fairness': 'العدالة',
    'cfg.fairness.bad_label': 'وضع علامة على مجموعات الأيام كغير مرغوبة',
    'cfg.fairness.no_pairs': 'اختر يومين على الأقل لتكوين النوبات.',
    'cfg.fairness.all_forbidden': 'جميع التوليفات محظورة بالفعل.',
    'cfg.fairness.bad_hint': 'الأزواج المميزة تُعتبر نوبات سيئة وتوزع بعدالة على الفرق.',
    'cfg.fairness.forbidden_label': 'المجموعات المحظورة تماماً',
    'cfg.fairness.forbidden_no_pairs': 'اختر يومين على الأقل لتكوين الأزواج المحظورة.',
    'cfg.fairness.forbidden_hint': 'لن يُعيَّن أي فريق لهذه المجموعات أبداً. قد يسبب IMPOSSIBLE.',
    'cfg.fairness.balance': 'توزيع النوبات السيئة على الفرق',
    'cfg.save': 'حفظ الإعدادات',
    'cfg.saved': 'تم الحفظ!',
    'cfg.reset': 'إعادة التعيين',
    'cal.office_days': 'يوم مكتبي',
    'cal.office_days_pl': 'أيام مكتبية',
    'cal.people': 'شخص مجدول',
    'cal.no_teams': 'لا توجد فرق',
    'day.Monday': 'الإثنين', 'day.Tuesday': 'الثلاثاء', 'day.Wednesday': 'الأربعاء',
    'day.Thursday': 'الخميس', 'day.Friday': 'الجمعة',
    'day.Mon': 'إث', 'day.Tue': 'ثل', 'day.Wed': 'أر', 'day.Thu': 'خم', 'day.Fri': 'جم',
    'freq.weekly': 'أسبوعي', 'freq.biweekly': 'نصف أسبوعي', 'freq.monthly': 'شهري',
  },
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private _lang = new BehaviorSubject<Lang>('en');

  readonly lang$ = this._lang.asObservable();

  get lang(): Lang { return this._lang.value; }
  get isRTL(): boolean { return this._lang.value === 'ar'; }

  setLang(lang: Lang): void {
    this._lang.next(lang);
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }

  t(key: string): string {
    return T[this._lang.value]?.[key] ?? T.en[key] ?? key;
  }

  day(name: string): string {
    return this.t('day.' + name);
  }

  dayShort(name: string): string {
    return this.t('day.' + name.slice(0, 3));
  }

  freq(value: string): string {
    return this.t('freq.' + value);
  }
}
