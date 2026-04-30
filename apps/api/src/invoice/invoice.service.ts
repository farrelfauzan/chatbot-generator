import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { SettingsService } from '../settings/settings.service';
import { S3Service } from '../s3/s3.service';

export interface InvoiceOrderData {
  orderNumber: string;
  paidAt: Date;
  items: {
    productNameSnapshot: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly settings: SettingsService,
    private readonly s3: S3Service,
  ) {}

  /**
   * Generate a PDF invoice for a paid order, upload to S3, and return the URL.
   */
  async generateInvoice(order: InvoiceOrderData): Promise<{
    buffer: Buffer;
    url: string;
    key: string;
    filename: string;
  }> {
    const company = await this.settings.getCompanyInfo();
    const pdfBytes = await this.buildPdf(order, company);
    const buffer = Buffer.from(pdfBytes);

    const filename = `invoice-${order.orderNumber}.pdf`;
    const { key, url } = await this.s3.upload(
      buffer,
      filename,
      'application/pdf',
    );

    this.logger.log(`Invoice generated: ${filename} → ${url}`);
    return { buffer, url, key, filename };
  }

  private async buildPdf(
    order: InvoiceOrderData,
    company: Record<string, string>,
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]); // A4
    const { height } = page.getSize();

    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const darkBlue = rgb(0.1, 0.2, 0.4);

    const marginLeft = 50;
    const marginRight = 545;
    let y = height - 50;

    // ─── Company Header ────────────────────────────────
    const companyName = company['name'] || 'Mader Packer';
    const companyAddress = company['address'] || '';
    const companyPhone = company['phone'] || '';
    const companyEmail = company['email'] || '';

    page.drawText(companyName, {
      x: marginLeft,
      y,
      size: 20,
      font: fontBold,
      color: darkBlue,
    });
    y -= 20;

    if (companyAddress) {
      page.drawText(companyAddress, {
        x: marginLeft,
        y,
        size: 10,
        font: fontRegular,
        color: gray,
      });
      y -= 14;
    }

    const contactParts: string[] = [];
    if (companyPhone) contactParts.push(companyPhone);
    if (companyEmail) contactParts.push(companyEmail);
    if (contactParts.length > 0) {
      page.drawText(contactParts.join(' | '), {
        x: marginLeft,
        y,
        size: 10,
        font: fontRegular,
        color: gray,
      });
      y -= 14;
    }

    // Divider line
    y -= 6;
    page.drawLine({
      start: { x: marginLeft, y },
      end: { x: marginRight, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 24;

    // ─── Invoice Title ─────────────────────────────────
    page.drawText('INVOICE', {
      x: marginLeft,
      y,
      size: 16,
      font: fontBold,
      color: darkBlue,
    });
    y -= 24;

    // ─── Order Info ────────────────────────────────────
    const infoLines = [
      ['No. Pesanan', order.orderNumber],
      [
        'Tanggal Bayar',
        order.paidAt.toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      ],
      ['Customer', order.customerName],
      ['Telepon', order.customerPhone],
    ];

    // Add recipient/shipping info if available
    if (order.recipientName) {
      infoLines.push(['Penerima', order.recipientName]);
    }
    if (order.recipientPhone) {
      infoLines.push(['HP Penerima', order.recipientPhone]);
    }
    if (order.recipientAddress) {
      infoLines.push(['Alamat Kirim', order.recipientAddress]);
    }

    for (const [label, value] of infoLines) {
      page.drawText(`${label}:`, {
        x: marginLeft,
        y,
        size: 10,
        font: fontBold,
        color: black,
      });
      page.drawText(value, {
        x: marginLeft + 110,
        y,
        size: 10,
        font: fontRegular,
        color: black,
      });
      y -= 16;
    }

    y -= 16;

    // ─── Table Header ──────────────────────────────────
    const colProduct = marginLeft;
    const colQty = 320;
    const colPrice = 390;
    const colTotal = 480;

    page.drawRectangle({
      x: marginLeft - 5,
      y: y - 4,
      width: marginRight - marginLeft + 10,
      height: 20,
      color: rgb(0.93, 0.93, 0.93),
    });

    page.drawText('Produk', {
      x: colProduct,
      y,
      size: 10,
      font: fontBold,
      color: darkBlue,
    });
    page.drawText('Qty', {
      x: colQty,
      y,
      size: 10,
      font: fontBold,
      color: darkBlue,
    });
    page.drawText('Harga', {
      x: colPrice,
      y,
      size: 10,
      font: fontBold,
      color: darkBlue,
    });
    page.drawText('Subtotal', {
      x: colTotal,
      y,
      size: 10,
      font: fontBold,
      color: darkBlue,
    });
    y -= 20;

    // ─── Table Rows ────────────────────────────────────
    for (const item of order.items) {
      // Wrap long product names
      const name = this.truncate(item.productNameSnapshot, 45);
      page.drawText(name, {
        x: colProduct,
        y,
        size: 9,
        font: fontRegular,
        color: black,
      });
      page.drawText(String(item.quantity), {
        x: colQty,
        y,
        size: 9,
        font: fontRegular,
        color: black,
      });
      page.drawText(this.formatRupiah(item.unitPrice), {
        x: colPrice,
        y,
        size: 9,
        font: fontRegular,
        color: black,
      });
      page.drawText(this.formatRupiah(item.lineTotal), {
        x: colTotal,
        y,
        size: 9,
        font: fontRegular,
        color: black,
      });
      y -= 16;
    }

    // Divider
    y -= 4;
    page.drawLine({
      start: { x: marginLeft, y },
      end: { x: marginRight, y },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 16;

    // ─── Totals ────────────────────────────────────────
    const totalsX = colPrice;
    const totalsValueX = colTotal;

    page.drawText('Subtotal', {
      x: totalsX,
      y,
      size: 10,
      font: fontRegular,
      color: black,
    });
    page.drawText(this.formatRupiah(order.subtotal), {
      x: totalsValueX,
      y,
      size: 10,
      font: fontRegular,
      color: black,
    });
    y -= 16;

    if (order.discountAmount > 0) {
      page.drawText('Diskon', {
        x: totalsX,
        y,
        size: 10,
        font: fontRegular,
        color: black,
      });
      page.drawText(`-${this.formatRupiah(order.discountAmount)}`, {
        x: totalsValueX,
        y,
        size: 10,
        font: fontRegular,
        color: black,
      });
      y -= 16;
    }

    if (order.shippingAmount > 0) {
      page.drawText('Ongkir', {
        x: totalsX,
        y,
        size: 10,
        font: fontRegular,
        color: black,
      });
      page.drawText(this.formatRupiah(order.shippingAmount), {
        x: totalsValueX,
        y,
        size: 10,
        font: fontRegular,
        color: black,
      });
      y -= 16;
    }

    if (order.taxAmount > 0) {
      page.drawText('Pajak', {
        x: totalsX,
        y,
        size: 10,
        font: fontRegular,
        color: black,
      });
      page.drawText(this.formatRupiah(order.taxAmount), {
        x: totalsValueX,
        y,
        size: 10,
        font: fontRegular,
        color: black,
      });
      y -= 16;
    }

    // Grand total
    y -= 4;
    page.drawLine({
      start: { x: totalsX, y },
      end: { x: marginRight, y },
      thickness: 1,
      color: darkBlue,
    });
    y -= 16;

    page.drawText('TOTAL', {
      x: totalsX,
      y,
      size: 12,
      font: fontBold,
      color: darkBlue,
    });
    page.drawText(this.formatRupiah(order.totalAmount), {
      x: totalsValueX,
      y,
      size: 12,
      font: fontBold,
      color: darkBlue,
    });
    y -= 40;

    // ─── Footer ────────────────────────────────────────
    page.drawText('Terima kasih atas pesanan Anda!', {
      x: marginLeft,
      y,
      size: 10,
      font: fontRegular,
      color: gray,
    });
    y -= 14;
    page.drawText(
      `Invoice dibuat otomatis pada ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      {
        x: marginLeft,
        y,
        size: 8,
        font: fontRegular,
        color: gray,
      },
    );

    return doc.save();
  }

  private formatRupiah(n: number): string {
    return 'Rp ' + n.toLocaleString('id-ID');
  }

  private truncate(str: string, maxLen: number): string {
    return str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;
  }
}
