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

  // ─── Bank Accounts ──────────────────────────────────

  async getBankAccounts() {
    return this.prisma.client.bankAccount.findMany({
      orderBy: [{ isDefault: 'desc' }, { bankName: 'asc' }],
    });
  }

  async createBankAccount(data: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    isDefault?: boolean;
  }) {
    if (data.isDefault) {
      await this.prisma.client.bankAccount.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.client.bankAccount.create({ data });
  }

  async updateBankAccount(
    id: string,
    data: {
      bankName?: string;
      accountNumber?: string;
      accountHolder?: string;
      isDefault?: boolean;
      isActive?: boolean;
    },
  ) {
    if (data.isDefault) {
      await this.prisma.client.bankAccount.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.client.bankAccount.update({ where: { id }, data });
  }

  async deleteBankAccount(id: string) {
    return this.prisma.client.bankAccount.delete({ where: { id } });
  }

  async getDefaultBankAccount() {
    return this.prisma.client.bankAccount.findFirst({
      where: { isDefault: true, isActive: true },
    });
  }

  async getPaymentInstructions(): Promise<string> {
    const company = await this.getCompanyInfo();
    const banks = await this.prisma.client.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { isDefault: 'desc' },
    });

    if (banks.length === 0) {
      return 'Silakan hubungi admin untuk informasi pembayaran.';
    }

    const bankLines = banks
      .map(
        (b) =>
          `• *${b.bankName}*\n  No. Rek: ${b.accountNumber}\n  A/N: ${b.accountHolder}`,
      )
      .join('\n\n');

    const companyName = company['company_name'] ?? 'Toko Kami';
    return `💳 *Pembayaran ${companyName}*\n\nTransfer ke salah satu rekening berikut:\n\n${bankLines}\n\nSetelah transfer, kirimkan bukti pembayaran di chat ini.`;
  }
}
