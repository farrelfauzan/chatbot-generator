import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
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
}
