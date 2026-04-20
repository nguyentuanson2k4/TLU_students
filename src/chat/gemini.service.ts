import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenAI;
  private readonly chatModel: string;
  private readonly embeddingModel: string;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not configured in environment variables');
    }
    this.genAI = new GoogleGenAI({ apiKey });
    this.chatModel = process.env.GOOGLE_CHAT_MODEL || 'gemini-2.5-flash';
    this.embeddingModel = process.env.GOOGLE_EMBEDDING_MODEL || 'gemini-embedding-001';
  }

  /**
   * Generate câu trả lời dựa trên câu hỏi + context tài liệu
   */
  async generateAnswer(question: string, context: string, chatHistory?: { role: string; content: string }[]): Promise<string> {
    try {
      const systemPrompt = `Bạn là trợ lý ảo của Trường Đại học Thăng Long, hỗ trợ sinh viên giải đáp thắc mắc.
Hãy trả lời câu hỏi dựa trên thông tin được cung cấp bên dưới. 
Nếu thông tin không đủ để trả lời, hãy nói rõ rằng bạn không có đủ thông tin và gợi ý sinh viên liên hệ phòng ban phù hợp.
Trả lời bằng tiếng Việt, ngắn gọn, chính xác và thân thiện.

--- THÔNG TIN THAM KHẢO ---
${context || 'Không có tài liệu tham khảo.'}
--- HẾT THÔNG TIN ---`;

      // Build contents array with history
      const contents: { role: string; parts: { text: string }[] }[] = [];

      // Add chat history if available
      if (chatHistory && chatHistory.length > 0) {
        for (const msg of chatHistory) {
          contents.push({
            role: msg.role === 'USER' ? 'user' : 'model',
            parts: [{ text: msg.content }],
          });
        }
      }

      // Add current question
      contents.push({
        role: 'user',
        parts: [{ text: question }],
      });

      const response = await this.genAI.models.generateContent({
        model: this.chatModel,
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });

      return response.text || 'Xin lỗi, tôi không thể trả lời câu hỏi này.';
    } catch (error) {
      this.logger.error(`Gemini generate error: ${error.message}`, error.stack);
      throw new Error('Không thể kết nối với AI. Vui lòng thử lại sau.');
    }
  }

  /**
   * Tạo embedding vector cho text (dùng cho RAG search)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.genAI.models.embedContent({
        model: this.embeddingModel,
        contents: text,
      });

      return response.embeddings?.[0]?.values || [];
    } catch (error) {
      this.logger.error(`Embedding error: ${error.message}`, error.stack);
      throw new Error('Không thể tạo embedding. Vui lòng thử lại sau.');
    }
  }
}
