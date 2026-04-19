import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Company Info ────────────────────────────────────

  async getCompanyInfo() {
    const rows = await this.prisma.client.companyInfo.findMany();
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async upsertCompanyInfo(data: Record<string, string>) {
    for (const [key, value] of Object.entries(data)) {
      await this.prisma.client.companyInfo.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }
    return this.getCompanyInfo();
  }

  async getPaymentInstructions(): Promise<string> {
    const company = await this.getCompanyInfo();
    const companyName = company['company_name'] ?? 'Toko Kami';
    return `Pembayaran ${companyName} dilakukan melalui DOKU payment link. Link akan dikirimkan saat order dikonfirmasi.`;
  }
}
