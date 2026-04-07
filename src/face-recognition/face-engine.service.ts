import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import 'dotenv/config';

interface DetectFacesResponse {
  success: boolean;
  face_count: number;
  faces: Array<{
    bbox: { x1: number; y1: number; x2: number; y2: number };
    confidence: number;
    age?: number;
    gender?: string;
  }>;
}

interface ExtractEmbeddingResponse {
  success: boolean;
  embedding: number[];
  confidence: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
}

interface ExtractAllEmbeddingsResponse {
  success: boolean;
  face_count: number;
  faces: Array<{
    embedding: number[];
    confidence: number;
    bbox: { x1: number; y1: number; x2: number; y2: number };
  }>;
}

interface CompareResponse {
  success: boolean;
  similarity: number;
  is_same_person: boolean;
}

@Injectable()
export class FaceEngineService {
  private readonly logger = new Logger(FaceEngineService.name);
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.FACE_SERVICE_URL || 'http://localhost:8000';
    this.logger.log(`Face Service URL: ${this.baseUrl}`);
  }

  /**
   * Kiểm tra Python Face Service đang chạy không.
   */
  async healthCheck(): Promise<{ status: string; model: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      this.logger.error(`Face service health check failed: ${error}`);
      throw new HttpException(
        'Face Recognition Service không khả dụng. Vui lòng kiểm tra Python service.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Detect tất cả khuôn mặt trong ảnh.
   */
  async detectFaces(imageBuffer: Buffer): Promise<DetectFacesResponse> {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' });
      formData.append('file', blob, 'image.jpg');

      const response = await fetch(`${this.baseUrl}/detect-faces`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new HttpException(
          error.detail || 'Lỗi detect khuôn mặt',
          response.status,
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Detect faces failed: ${error}`);
      throw new HttpException(
        'Không thể kết nối Face Recognition Service',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Trích xuất embedding 512 chiều từ ảnh có 1 khuôn mặt.
   */
  async extractEmbedding(imageBuffer: Buffer): Promise<ExtractEmbeddingResponse> {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' });
      formData.append('file', blob, 'image.jpg');

      const response = await fetch(`${this.baseUrl}/extract-embedding`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new HttpException(
          error.detail || 'Lỗi trích xuất embedding',
          response.status,
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Extract embedding failed: ${error}`);
      throw new HttpException(
        'Không thể kết nối Face Recognition Service',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Trích xuất embeddings cho tất cả khuôn mặt trong ảnh (ảnh nhóm).
   */
  async extractAllEmbeddings(
    imageBuffer: Buffer,
  ): Promise<ExtractAllEmbeddingsResponse> {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' });
      formData.append('file', blob, 'image.jpg');

      const response = await fetch(`${this.baseUrl}/extract-all-embeddings`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new HttpException(
          error.detail || 'Lỗi trích xuất embeddings',
          response.status,
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Extract all embeddings failed: ${error}`);
      throw new HttpException(
        'Không thể kết nối Face Recognition Service',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * So sánh 2 face embeddings.
   */
  async compareFaces(
    embedding1: number[],
    embedding2: number[],
  ): Promise<CompareResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/compare-faces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embedding1, embedding2 }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new HttpException(
          error.detail || 'Lỗi so sánh khuôn mặt',
          response.status,
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Compare faces failed: ${error}`);
      throw new HttpException(
        'Không thể kết nối Face Recognition Service',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * So sánh embedding ảnh upload với danh sách embeddings đã biết (matching ở NestJS).
   * Dùng cosine similarity.
   */
  cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Tìm sinh viên match nhất từ danh sách embeddings.
   */
  findBestMatch(
    queryEmbedding: number[],
    knownEmbeddings: Array<{ id: bigint; student_id: bigint; embedding: number[] }>,
    threshold: number = 0.6,
  ): { matched: boolean; faceId?: bigint; studentId?: bigint; similarity: number } {
    let bestSimilarity = -1;
    let bestFaceId: bigint | undefined;
    let bestStudentId: bigint | undefined;

    for (const known of knownEmbeddings) {
      const similarity = this.cosineSimilarity(queryEmbedding, known.embedding);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestFaceId = known.id;
        bestStudentId = known.student_id;
      }
    }

    if (bestSimilarity >= threshold) {
      return {
        matched: true,
        faceId: bestFaceId,
        studentId: bestStudentId,
        similarity: bestSimilarity,
      };
    }

    return { matched: false, similarity: bestSimilarity };
  }
}
