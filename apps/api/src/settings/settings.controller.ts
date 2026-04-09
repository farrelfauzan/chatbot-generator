import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  // ─── Company Info ────────────────────────────────────

  @Get('company')
  getCompanyInfo() {
    return this.settings.getCompanyInfo();
  }

  @Put('company')
  updateCompanyInfo(@Body() body: Record<string, string>) {
    return this.settings.upsertCompanyInfo(body);
  }

  // ─── Bank Accounts ──────────────────────────────────

  @Get('bank-accounts')
  getBankAccounts() {
    return this.settings.getBankAccounts();
  }

  @Post('bank-accounts')
  createBankAccount(
    @Body()
    body: {
      bankName: string;
      accountNumber: string;
      accountHolder: string;
      isDefault?: boolean;
    },
  ) {
    return this.settings.createBankAccount(body);
  }

  @Patch('bank-accounts/:id')
  updateBankAccount(
    @Param('id') id: string,
    @Body()
    body: {
      bankName?: string;
      accountNumber?: string;
      accountHolder?: string;
      isDefault?: boolean;
      isActive?: boolean;
    },
  ) {
    return this.settings.updateBankAccount(id, body);
  }

  @Delete('bank-accounts/:id')
  deleteBankAccount(@Param('id') id: string) {
    return this.settings.deleteBankAccount(id);
  }
}
