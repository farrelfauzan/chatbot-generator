import { Inject, Injectable, Logger } from '@nestjs/common';
import { EmbeddingProvider } from '../embedding/embedding.provider';
import { MEMO_REPOSITORY } from './memo.repository.interface';
import type { IMemoRepository } from './memo.repository.interface';

@Injectable()
export class MemoService {
  private readonly logger = new Logger(MemoService.name);

  constructor(
    @Inject(MEMO_REPOSITORY) private readonly repo: IMemoRepository,
    private readonly embedding: EmbeddingProvider,
  ) {}

  async createMemo(
    customerId: string,
    content: string,
    options?: { title?: string; tags?: string[]; reminderAt?: Date },
  ): Promise<string> {
    const memo = await this.repo.create(customerId, content, options);

    // Embed asynchronously — don't block the response
    this.embedMemo(memo.id, content).catch((err) =>
      this.logger.warn(`Failed to embed memo ${memo.id}: ${err.message}`),
    );

    let result = `Sudah dicatat ✅`;
    if (options?.title) result += `\n📝 *${options.title}*`;
    if (options?.reminderAt) {
      result += `\n⏰ Pengingat: ${options.reminderAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`;
    }
    return result;
  }

  async listMemos(customerId: string): Promise<string> {
    const memos = await this.repo.findByCustomer(customerId);
    if (memos.length === 0) return 'Belum ada catatan tersimpan 📝';

    const lines = ['📝 *Catatan Kamu:*', ''];
    for (let i = 0; i < memos.length; i++) {
      const memo = memos[i];
      const title = memo.title || memo.content.substring(0, 60);
      const reminder = memo.reminderAt
        ? ` ⏰ ${memo.reminderAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
        : '';
      lines.push(`${i + 1}. ${title}${reminder}`);
    }

    const total = await this.repo.countByCustomer(customerId);
    if (total > 20) lines.push(`\n_(menampilkan 20 dari ${total} catatan)_`);
    return lines.join('\n');
  }

  async getMemoByNumber(
    customerId: string,
    memoNumber: number,
  ): Promise<string> {
    const memos = await this.repo.findByCustomer(customerId);
    const index = memoNumber - 1;
    if (index < 0 || index >= memos.length) {
      return `Nomor catatan tidak valid. Kamu punya ${memos.length} catatan (1-${memos.length}).`;
    }

    const memo = memos[index];
    const lines = [`📝 *Catatan #${memoNumber}*`];
    if (memo.title) lines.push(`Judul: ${memo.title}`);
    lines.push('', memo.content);
    if (memo.tags.length > 0) lines.push('', `Tags: ${memo.tags.join(', ')}`);
    if (memo.reminderAt) {
      lines.push(
        `⏰ Pengingat: ${memo.reminderAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
      );
    }
    lines.push(
      `📅 Dibuat: ${memo.createdAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
    );
    return lines.join('\n');
  }

  async deleteMemo(customerId: string, memoNumber: number): Promise<string> {
    const memos = await this.repo.findByCustomer(customerId);
    const index = memoNumber - 1;
    if (index < 0 || index >= memos.length) {
      return `Nomor catatan tidak valid. Kamu punya ${memos.length} catatan (1-${memos.length}).`;
    }

    const memo = memos[index];
    await this.repo.deleteById(memo.id);
    const title = memo.title || memo.content.substring(0, 40);
    return `Catatan "${title}" dihapus ✅`;
  }

  async searchMemos(customerId: string, query: string): Promise<string> {
    // Try semantic search first
    try {
      const queryEmbedding = await this.embedding.embedText(query);
      const results = await this.repo.searchSemantic(
        customerId,
        queryEmbedding,
      );
      if (results.length > 0) {
        const lines = ['🔍 *Catatan ditemukan:*', ''];
        for (let i = 0; i < results.length; i++) {
          lines.push(
            `${i + 1}. ${results[i].title || results[i].content.substring(0, 60)}`,
          );
          lines.push(`   ${results[i].content}`);
          lines.push('');
        }
        return lines.join('\n');
      }
    } catch (err) {
      this.logger.warn(
        `Semantic memo search failed, falling back to text: ${(err as Error).message}`,
      );
    }

    // Fallback: text search
    const memos = await this.repo.searchText(customerId, query);
    if (memos.length === 0)
      return `Tidak ditemukan catatan terkait "${query}".`;

    const lines = ['🔍 *Catatan ditemukan:*', ''];
    for (let i = 0; i < memos.length; i++) {
      lines.push(
        `${i + 1}. ${memos[i].title || memos[i].content.substring(0, 60)}`,
      );
      lines.push(`   ${memos[i].content}`);
      lines.push('');
    }
    return lines.join('\n');
  }

  private async embedMemo(memoId: string, content: string): Promise<void> {
    const vector = await this.embedding.embedText(content);
    await this.repo.updateEmbedding(memoId, vector);
  }
}
