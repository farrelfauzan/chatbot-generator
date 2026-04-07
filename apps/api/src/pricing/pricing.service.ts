import { Injectable } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import type {
  PricingRequest,
  PricingResponse,
  PricingLineItem,
} from '@chatbot-generator/shared-types';

@Injectable()
export class PricingService {
  constructor(private readonly catalog: CatalogService) {}

  async calculate(request: PricingRequest): Promise<PricingResponse> {
    const items: PricingLineItem[] = [];

    for (const item of request.items) {
      const product = await this.catalog.findById(item.productId);
      const lineTotal = product.price * item.quantity;

      items.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        lineTotal,
      });
    }

    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    const discountAmount = request.discountAmount ?? 0;
    const shippingAmount = request.shippingAmount ?? 0;
    const taxAmount = Math.round(
      (subtotal - discountAmount) * (request.taxRate ?? 0),
    );
    const totalAmount = subtotal - discountAmount + shippingAmount + taxAmount;

    return {
      items,
      subtotal,
      discountAmount,
      shippingAmount,
      taxAmount,
      totalAmount,
    };
  }
}
