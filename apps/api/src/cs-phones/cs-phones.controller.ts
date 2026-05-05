import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CsPhonesService } from './cs-phones.service';

@Controller('cs-phones')
export class CsPhonesController {
  constructor(private readonly csPhonesService: CsPhonesService) {}

  @Get()
  async findAll() {
    return this.csPhonesService.findAll();
  }

  @Post()
  async create(@Body() body: { phone: string; name: string }) {
    return this.csPhonesService.create(body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<{ phone: string; name: string; isActive: boolean }>,
  ) {
    return this.csPhonesService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.csPhonesService.delete(id);
    return { ok: true };
  }

  @Post('reset-loads')
  async resetLoads() {
    await this.csPhonesService.resetLoads();
    return { ok: true };
  }

  @Get('manage')
  @Header('Content-Type', 'text/html')
  getManagePage(): string {
    return CS_PHONES_HTML;
  }
}

const CS_PHONES_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manage CS Phones</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 2rem; }
    .container { max-width: 700px; margin: 0 auto; }
    h1 { margin-bottom: 1.5rem; color: #333; }
    .card { background: #fff; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .form-row { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    input { padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem; }
    input[name="phone"] { flex: 1; }
    input[name="name"] { flex: 1; }
    button { padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; }
    .btn-add { background: #4CAF50; color: #fff; }
    .btn-add:hover { background: #45a049; }
    .btn-delete { background: #f44336; color: #fff; font-size: 0.8rem; padding: 0.3rem 0.6rem; }
    .btn-delete:hover { background: #d32f2f; }
    .btn-toggle { font-size: 0.8rem; padding: 0.3rem 0.6rem; }
    .btn-toggle.active { background: #4CAF50; color: #fff; }
    .btn-toggle.inactive { background: #ff9800; color: #fff; }
    .btn-reset { background: #2196F3; color: #fff; margin-top: 1rem; }
    .btn-reset:hover { background: #1976D2; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.6rem 0.5rem; border-bottom: 1px solid #eee; }
    th { color: #666; font-size: 0.8rem; text-transform: uppercase; }
    .load-badge { background: #e3f2fd; color: #1565c0; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem; }
    .status-active { color: #4CAF50; font-weight: 600; }
    .status-inactive { color: #999; }
    .empty { text-align: center; color: #999; padding: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>CS Phone Management</h1>
    <div class="card">
      <h3 style="margin-bottom:0.75rem">Add CS Phone</h3>
      <div class="form-row">
        <input name="phone" placeholder="Phone (e.g. 6281234567890)" />
        <input name="name" placeholder="Name" />
        <button class="btn-add" onclick="addPhone()">Add</button>
      </div>
    </div>
    <div class="card">
      <div id="table-container"></div>
      <button class="btn-reset" onclick="resetLoads()">Reset All Load Counters</button>
    </div>
  </div>
  <script>
    const API = window.location.origin + '/cs-phones';

    async function loadPhones() {
      const res = await fetch(API);
      const phones = await res.json();
      render(phones);
    }

    function render(phones) {
      const container = document.getElementById('table-container');
      if (phones.length === 0) {
        container.innerHTML = '<div class="empty">No CS phones configured yet.</div>';
        return;
      }
      let html = '<table><thead><tr><th>Name</th><th>Phone</th><th>Status</th><th>Load</th><th>Actions</th></tr></thead><tbody>';
      for (const p of phones) {
        const statusClass = p.isActive ? 'status-active' : 'status-inactive';
        const statusText = p.isActive ? 'Active' : 'Inactive';
        const toggleClass = p.isActive ? 'active' : 'inactive';
        const toggleText = p.isActive ? 'Deactivate' : 'Activate';
        html += '<tr>';
        html += '<td>' + esc(p.name) + '</td>';
        html += '<td>' + esc(p.phone) + '</td>';
        html += '<td class="' + statusClass + '">' + statusText + '</td>';
        html += '<td><span class="load-badge">' + p.loadCount + '</span></td>';
        html += '<td>';
        html += '<button class="btn-toggle ' + toggleClass + '" onclick="togglePhone(\\''+p.id+'\\', '+(!p.isActive)+')">' + toggleText + '</button> ';
        html += '<button class="btn-delete" onclick="deletePhone(\\''+p.id+'\\')">Delete</button>';
        html += '</td></tr>';
      }
      html += '</tbody></table>';
      container.innerHTML = html;
    }

    function esc(s) {
      const d = document.createElement('div');
      d.textContent = s;
      return d.innerHTML;
    }

    async function addPhone() {
      const phone = document.querySelector('input[name="phone"]').value.trim();
      const name = document.querySelector('input[name="name"]').value.trim();
      if (!phone || !name) return alert('Phone and name are required');
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name }),
      });
      document.querySelector('input[name="phone"]').value = '';
      document.querySelector('input[name="name"]').value = '';
      loadPhones();
    }

    async function deletePhone(id) {
      if (!confirm('Delete this CS phone?')) return;
      await fetch(API + '/' + id, { method: 'DELETE' });
      loadPhones();
    }

    async function togglePhone(id, isActive) {
      await fetch(API + '/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      loadPhones();
    }

    async function resetLoads() {
      if (!confirm('Reset load counters for all CS phones?')) return;
      await fetch(API + '/reset-loads', { method: 'POST' });
      loadPhones();
    }

    loadPhones();
  </script>
</body>
</html>`;
