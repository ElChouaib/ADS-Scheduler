import { Pipe, PipeTransform } from '@angular/core';
import { I18nService } from '../services/i18n.service';

@Pipe({ name: 'i18n', pure: false })
export class I18nPipe implements PipeTransform {
  constructor(private i18n: I18nService) {}
  transform(key: string): string {
    return this.i18n.t(key);
  }
}
