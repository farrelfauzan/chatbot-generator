import { Injectable, Logger } from '@nestjs/common';

export interface PrayerTimesData {
  timings: Record<string, string>;
  date: {
    readable: string;
    hijri: { date: string; month: { en: string } };
  };
  meta: { timezone: string };
}

/**
 * External API provider for Aladhan prayer times.
 * Pure HTTP wrapper — no business logic.
 */
@Injectable()
export class AladhanProvider {
  private readonly logger = new Logger(AladhanProvider.name);

  private cache = new Map<
    string,
    { data: PrayerTimesData; fetchedAt: number }
  >();

  async fetchPrayerTimes(
    city: string,
    country = 'Indonesia',
  ): Promise<PrayerTimesData | null> {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `${city}:${country}:${today}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < 3600_000) {
      return cached.data;
    }

    try {
      const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=20`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return null;

      const json = await res.json();
      if (json.code !== 200) return null;

      this.cache.set(cacheKey, { data: json.data, fetchedAt: Date.now() });
      this.evictStaleCache();

      return json.data;
    } catch (err) {
      this.logger.error(
        `Aladhan API failed for ${city}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  private evictStaleCache(): void {
    if (this.cache.size > 200) {
      const oldest = [...this.cache.entries()]
        .sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)
        .slice(0, 50);
      for (const [k] of oldest) this.cache.delete(k);
    }
  }
}
