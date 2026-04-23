import { Injectable } from '@nestjs/common';
import { AlQuranProvider } from './alquran.provider';

@Injectable()
export class QuranService {
  constructor(private readonly provider: AlQuranProvider) {}

  async searchQuran(query: string): Promise<string> {
    // Try to parse as surah:ayah reference (e.g., "2:255")
    const refMatch = query.match(/^(\d+):(\d+)$/);
    if (refMatch) {
      return this.formatAyah(Number(refMatch[1]), Number(refMatch[2]));
    }

    // Try surah name lookup
    const surahs = await this.provider.getSurahList();
    const matchedSurah = surahs.find(
      (s) =>
        s.englishName.toLowerCase().includes(query.toLowerCase()) ||
        s.name.includes(query),
    );

    if (matchedSurah) {
      return this.formatSurahInfo(matchedSurah.number);
    }

    // Keyword search
    const matches = await this.provider.searchByKeyword(query);
    if (matches.length === 0) {
      return `Tidak ditemukan hasil untuk "${query}" di Al-Quran.`;
    }

    const lines = [`🔍 Hasil pencarian "${query}" di Al-Quran:`, ''];
    for (const match of matches) {
      lines.push(
        `*${match.surahEnglish}* (${match.surahArabic}) ayat ${match.numberInSurah}:`,
      );
      lines.push(match.text);
      lines.push('');
    }
    return lines.join('\n');
  }

  async getAyah(surah: number, ayah: number): Promise<string> {
    if (surah < 1 || surah > 114) {
      return 'Nomor surah harus antara 1-114.';
    }
    return this.formatAyah(surah, ayah);
  }

  private async formatAyah(surah: number, ayah: number): Promise<string> {
    const result = await this.provider.getAyah(surah, ayah);
    if (!result) {
      return `Ayat ${surah}:${ayah} tidak ditemukan. Pastikan nomor surah dan ayat benar.`;
    }

    return [
      `📖 *${result.surahName}* (${result.surahArabic}) — Ayat ${result.numberInSurah}`,
      '',
      result.arabicText,
      '',
      `_${result.translation}_`,
    ].join('\n');
  }

  private async formatSurahInfo(surahNumber: number): Promise<string> {
    const s = await this.provider.getSurahInfo(surahNumber);
    if (!s) return `Surah ${surahNumber} tidak ditemukan.`;

    return [
      `📖 *${s.englishName}* (${s.name})`,
      `Arti: ${s.englishNameTranslation}`,
      `Jumlah ayat: ${s.numberOfAyahs}`,
      `Tipe: ${s.revelationType === 'Meccan' ? 'Makkiyah' : 'Madaniyah'}`,
      '',
      `Ketik "${s.number}:1" untuk membaca ayat pertama.`,
    ].join('\n');
  }
}
