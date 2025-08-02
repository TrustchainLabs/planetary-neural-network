import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatAmount',
  standalone: true,
  pure: true // Important: pure pipe for better performance
})
export class FormatAmountPipe implements PipeTransform {
  private cache = new Map<number, string>();

  transform(value: number, decimals?: number): string {
    if (value == null) return '';

    // Create cache key including decimals
    const cacheKey = decimals ? value * 1000 + decimals : value;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let formattedValue = value;

    if (decimals) {
      formattedValue = formattedValue / (10 ** decimals);
    }

    // TODO: Implement proper formatting with smartnodes v2
    const result = formattedValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // Cache the result
    this.cache.set(cacheKey, result);

    return result;
  }
}
