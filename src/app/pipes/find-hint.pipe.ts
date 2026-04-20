import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'findHint' })
export class FindHintPipe implements PipeTransform {
  transform(options: { value: string; hint: string }[], value: string): string {
    return options.find(o => o.value === value)?.hint ?? '';
  }
}
