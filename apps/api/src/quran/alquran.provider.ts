import { Injectable, Logger } from '@nestjs/common';

export interface SurahInfo {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface AyahResult {
  surahName: string;
  surahArabic: string;
  numberInSurah: number;
  arabicText: string;
  translation: string;
}

export interface SearchMatch {
  surahEnglish: string;
  surahArabic: string;
  numberInSurah: number;
  text: string;
}

/**
 * External API provider for Al-Quran Cloud.
 * Pure HTTP wrapper — no business logic.
 */
@Injectable()
export class AlQuranProvider {
  private readonly logger = new Logger(AlQuranProvider.name);
  private surahCache: SurahInfo[] | null = null;

  async getAyah(surah: number, ayah: number): Promise<AyahResult | null> {
    try {
      const [arRes, idRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`, {
          signal: AbortSignal.timeout(10_000),
        }),
        fetch(
          `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/id.indonesian`,
          {
            signal: AbortSignal.timeout(10_000),
          },
        ),
      ]);

      if (!arRes.ok || !idRes.ok) return null;

      const arJson = (await arRes.json()) as any;
      const idJson = (await idRes.json()) as any;

      if (arJson.code !== 200 || idJson.code !== 200) return null;

      return {
        surahName: arJson.data.surah.englishName,
        surahArabic: arJson.data.surah.name,
        numberInSurah: arJson.data.numberInSurah,
        arabicText: arJson.data.text,
        translation: idJson.data.text,
      };
    } catch (err) {
      this.logger.error(`getAyah failed: ${(err as Error).message}`);
      return null;
    }
  }

  async getSurahInfo(surahNumber: number): Promise<SurahInfo | null> {
    try {
      const res = await fetch(
        `https://api.alquran.cloud/v1/surah/${surahNumber}`,
        { signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) return null;

      const json = (await res.json()) as any;
      if (json.code !== 200) return null;

      return json.data;
    } catch (err) {
      this.logger.error(`getSurahInfo failed: ${(err as Error).message}`);
      return null;
    }
  }

  async searchByKeyword(query: string): Promise<SearchMatch[]> {
    try {
      const url = `https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/id.indonesian`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return [];

      const json = (await res.json()) as any;
      if (json.code !== 200 || !json.data?.matches?.length) return [];

      return json.data.matches.slice(0, 3).map((m: any) => ({
        surahEnglish: m.surah.englishName,
        surahArabic: m.surah.name,
        numberInSurah: m.numberInSurah,
        text: m.text,
      }));
    } catch (err) {
      this.logger.error(`Quran search failed: ${(err as Error).message}`);
      return [];
    }
  }

  async getSurahList(): Promise<SurahInfo[]> {
    if (this.surahCache) return this.surahCache;

    try {
      const res = await fetch('https://api.alquran.cloud/v1/surah', {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return [];

      const json = (await res.json()) as any;
      if (json.code !== 200) return [];

      this.surahCache = json.data as SurahInfo[];
      return this.surahCache;
    } catch {
      return [];
    }
  }
}
