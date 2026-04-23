import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import type {
  IntentClassification,
  ChatIntent,
} from '@chatbot-generator/shared-types';

const KEYWORD_RULES: Array<{ patterns: RegExp; intent: ChatIntent }> = [
  {
    patterns:
      /\b(hi|halo|hello|hey|selamat|pagi|siang|sore|malam|assalamualaikum)\b/i,
    intent: 'greeting',
  },
  {
    patterns:
      /\b(shalat|sholat|salat|adzan|azan|subuh|dzuhur|ashar|maghrib|isya)\b/i,
    intent: 'ask_prayer_times',
  },
  {
    patterns: /\b(catat|simpan|memo|note|ingat|tulis)\b/i,
    intent: 'save_memo',
  },
  {
    patterns: /\b(jadwal|schedule|kirim nanti|reminder|ingatkan)\b/i,
    intent: 'schedule_message',
  },
  {
    patterns: /\b(quran|alquran|surah|ayat|tafsir|hadits|hadith|islam)\b/i,
    intent: 'ask_islamic',
  },
  {
    patterns: /\b(quote|motivasi|inspirasi|semangat)\b/i,
    intent: 'ask_quote',
  },
  {
    patterns: /\b(admin|manusia|cs|customer service|bantuan|help)\b/i,
    intent: 'request_human_help',
  },
];

@Injectable()
export class IntentService {
  private readonly logger = new Logger(IntentService.name);

  constructor(private readonly llm: LlmService) {}

  async classify(
    message: string,
    conversationStage: string,
  ): Promise<IntentClassification> {
    // 1. Fast keyword matching first
    const keywordMatch = this.matchKeyword(message);
    if (keywordMatch) {
      this.logger.debug(`Intent (keyword): "${keywordMatch}" for "${message}"`);
      return { intent: keywordMatch, confidence: 0.95 };
    }

    // 2. LLM fallback
    try {
      const result = await this.llm.classifyIntent(message, conversationStage);
      this.logger.debug(
        `Intent (LLM): "${result.intent}" (${result.confidence}) for "${message}"`,
      );
      return result;
    } catch (err) {
      this.logger.warn(
        'LLM intent classification failed, defaulting to general_qa',
        err,
      );
      return { intent: 'general_qa', confidence: 0.5 };
    }
  }

  private matchKeyword(message: string): ChatIntent | null {
    for (const rule of KEYWORD_RULES) {
      if (rule.patterns.test(message)) {
        return rule.intent;
      }
    }
    return null;
  }
}
