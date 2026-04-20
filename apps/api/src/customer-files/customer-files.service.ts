import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { S3Service } from '../s3/s3.service';
import { GowaService } from '../gowa/gowa.service';

@Injectable()
export class CustomerFilesService {
  private readonly logger = new Logger(CustomerFilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly gowa: GowaService,
  ) {}

  /**
   * Download media from WhatsApp, upload to S3, save record in DB.
   */
  async saveFromWhatsApp(params: {
    customerId: string;
    conversationId: string;
    mediaUrl: string;
    mimeType: string;
    originalName: string;
  }) {
    const { customerId, conversationId, mediaUrl, mimeType, originalName } =
      params;

    // Download from WhatsApp via Gowa
    const buffer = await this.gowa.downloadMedia(mediaUrl);

    // Upload to S3
    const { key, url } = await this.s3.upload(buffer, originalName, mimeType);

    // Save record
    const file = await this.prisma.client.customerFile.create({
      data: {
        customerId,
        conversationId,
        fileType: 'design',
        originalName,
        mimeType,
        s3Key: key,
        s3Url: url,
        fileSize: buffer.length,
      },
    });

    this.logger.log(
      `Saved file ${file.id} (${originalName}) for customer ${customerId}`,
    );
    return file;
  }

  async findByConversation(conversationId: string) {
    return this.prisma.client.customerFile.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Link all unlinked conversation files to an order.
   */
  async linkToOrder(conversationId: string, orderId: string) {
    const result = await this.prisma.client.customerFile.updateMany({
      where: { conversationId, orderId: null },
      data: { orderId },
    });
    this.logger.log(
      `Linked ${result.count} files from conversation ${conversationId} to order ${orderId}`,
    );
    return result.count;
  }
}
