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
    patterns: /\b(katalog|catalog|produk|product|daftar|list|lihat)\b/i,
    intent: 'browse_catalog',
  },
  {
    patterns: /\b(stok|stock|ready|tersedia|available|ada)\b/i,
    intent: 'ask_stock',
  },
  {
    patterns: /\b(harga|price|berapa|biaya|cost|tarif)\b/i,
    intent: 'ask_price',
  },
  {
    patterns: /\b(rekomen|suggest|saran|cocok|recommend)\b/i,
    intent: 'ask_recommendation',
  },
  {
    patterns: /\b(pesan|order|beli|buy|checkout)\b/i,
    intent: 'create_order',
  },
  { patterns: /\b(invoice|tagihan|nota|faktur)\b/i, intent: 'request_invoice' },
  {
    patterns: /\b(bayar|transfer|payment|sudah bayar|bukti|lunas)\b/i,
    intent: 'confirm_payment',
  },
  {
    patterns: /\b(status|tracking|sampai mana|dimana pesanan)\b/i,
    intent: 'ask_order_status',
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
