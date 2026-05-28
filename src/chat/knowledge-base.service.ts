import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  // Số ký tự mỗi chunk
  private readonly CHUNK_SIZE = 1000;
  // Số ký tự overlap giữa các chunk
  private readonly CHUNK_OVERLAP = 200;

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  /**
   * Upload tài liệu, trích xuất text, tách chunks, tạo embeddings, lưu vào DB
   */
  async uploadDocument(file: Express.Multer.File): Promise<any> {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName).toLowerCase();

    // Trích xuất text từ file
    let text: string;
    if (ext === '.txt') {
      text = file.buffer.toString('utf-8');
    } else if (ext === '.pdf') {
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: file.buffer });
      const result = await parser.getText();
      await parser.destroy();
      text = result.text;
    } else {
      throw new Error('Chỉ hỗ trợ file .txt và .pdf');
    }

    // Lưu thông tin tài liệu vào KnowledgeBase
    const knowledgeBase = await this.prisma.knowledgeBase.create({
      data: {
        document_name: originalName,
        file_path: `/uploads/knowledge/${originalName}`,
        status: true,
      },
    });

    // Tách text thành chunks
    const chunks = this.splitTextIntoChunks(text);
    this.logger.log(`Document "${originalName}" split into ${chunks.length} chunks`);

    // Tạo embeddings và lưu từng chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];
      try {
        const embedding = await this.geminiService.generateEmbedding(chunkContent);
        const embeddingStr = `[${embedding.join(',')}]`;

        // Dùng raw SQL để insert vector
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO document_chunks (knowledge_base_id, content, embedding, chunk_index, created_at) 
           VALUES ($1, $2, $3::vector, $4, NOW())`,
          knowledgeBase.id,
          chunkContent,
          embeddingStr,
          i,
        );

        this.logger.debug(`Chunk ${i + 1}/${chunks.length} embedded successfully`);
      } catch (error) {
        this.logger.error(`Error embedding chunk ${i}: ${error.message}`);
        // Lưu chunk không có embedding nếu lỗi
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO document_chunks (knowledge_base_id, content, chunk_index, created_at) 
           VALUES ($1, $2, $3, NOW())`,
          knowledgeBase.id,
          chunkContent,
          i,
        );
      }
    }

    return {
      id: knowledgeBase.id.toString(),
      document_name: originalName,
      total_chunks: chunks.length,
      status: true,
    };
  }

  /**
   * Tìm kiếm tài liệu liên quan nhất bằng cosine similarity trên pgvector
   */
  async searchRelevant(query: string, topK: number = 5): Promise<{ content: string; similarity: number }[]> {
    try {
      const queryEmbedding = await this.geminiService.generateEmbedding(query);
      const embeddingStr = `[${queryEmbedding.join(',')}]`;

      // Cosine similarity search với pgvector
      const results: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT dc.content, 
                1 - (dc.embedding <=> $1::vector) as similarity
         FROM document_chunks dc
         JOIN knowledge_base kb ON dc.knowledge_base_id = kb.id
         WHERE dc.embedding IS NOT NULL AND kb.status = true
         ORDER BY dc.embedding <=> $1::vector
         LIMIT $2`,
        embeddingStr,
        topK,
      );

      return results.map((r) => ({
        content: r.content,
        similarity: parseFloat(r.similarity),
      }));
    } catch (error) {
      this.logger.error(`Search error: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Lấy danh sách tài liệu
   */
  async findAll() {
    const docs = await this.prisma.knowledgeBase.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
    });

    return docs.map((doc) => ({
      id: doc.id.toString(),
      document_name: doc.document_name,
      file_path: doc.file_path,
      status: doc.status,
      created_at: doc.created_at,
      total_chunks: doc._count.chunks,
    }));
  }

  /**
   * Xóa tài liệu (cascade sẽ xóa cả chunks)
   */
  async remove(id: bigint) {
    return this.prisma.knowledgeBase.delete({
      where: { id },
    });
  }

  /**
   * Tách text thành các chunks với overlap
   */
  private splitTextIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    // Chuẩn hóa text
    const cleanText = text.replace(/\s+/g, ' ').trim();

    if (cleanText.length <= this.CHUNK_SIZE) {
      return [cleanText];
    }

    let start = 0;
    while (start < cleanText.length) {
      let end = start + this.CHUNK_SIZE;

      // Cố gắng cắt ở cuối câu (dấu chấm, xuống dòng)
      if (end < cleanText.length) {
        const lastPeriod = cleanText.lastIndexOf('.', end);
        const lastNewline = cleanText.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastPeriod, lastNewline);
        if (breakPoint > start + this.CHUNK_SIZE / 2) {
          end = breakPoint + 1;
        }
      }

      chunks.push(cleanText.slice(start, end).trim());
      start = end - this.CHUNK_OVERLAP;
    }

    return chunks.filter((c) => c.length > 0);
  }
}
