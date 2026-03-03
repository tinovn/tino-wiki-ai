import { Injectable, Logger } from '@nestjs/common';

/**
 * Bridge to existing wiki RAG search (QueryEngineService).
 * For MVP, provides basic shop info responses.
 * In production, would delegate to the actual query engine.
 */
@Injectable()
export class KnowledgeSearchTool {
  private readonly logger = new Logger(KnowledgeSearchTool.name);

  private readonly shopFAQ: Record<string, string> = {
    'bảo hành':
      'Chính sách bảo hành theo từng thương hiệu. Apple: 12 tháng chính hãng. Samsung: 12 tháng. Phụ kiện: 6 tháng. Vui lòng giữ hóa đơn để được bảo hành.',
    'giao hàng':
      'Giao hàng toàn quốc. Nội thành TP.HCM: 1-2 ngày. Các tỉnh: 2-5 ngày. Miễn phí giao hàng cho đơn trên 500.000đ.',
    'đổi trả':
      'Đổi trả trong 7 ngày nếu lỗi từ nhà sản xuất. Sản phẩm phải còn nguyên seal, hộp, phụ kiện. Liên hệ shop để được hỗ trợ.',
    'thanh toán':
      'Hỗ trợ thanh toán: COD (thanh toán khi nhận hàng), chuyển khoản ngân hàng. Thanh toán online sẽ sớm được hỗ trợ.',
    'liên hệ':
      'Liên hệ shop: Hotline 1900xxxx (8h-22h hàng ngày). Zalo/Facebook: @ShopName. Email: support@shop.com',
    'trả góp':
      'Hỗ trợ trả góp 0% qua thẻ tín dụng cho đơn từ 3.000.000đ. Các ngân hàng: VPBank, TPBank, Home Credit. Thời hạn: 6-12 tháng.',
  };

  search(query: string): { found: boolean; answer: string } {
    const queryLower = query.toLowerCase();

    for (const [keyword, answer] of Object.entries(this.shopFAQ)) {
      if (queryLower.includes(keyword)) {
        return { found: true, answer };
      }
    }

    // Check for greeting
    const greetings = ['xin chào', 'hello', 'hi', 'chào', 'hey'];
    if (greetings.some((g) => queryLower.includes(g))) {
      return {
        found: true,
        answer:
          'Xin chào! Mình là trợ lý bán hàng AI. Mình có thể giúp bạn tìm sản phẩm, quản lý giỏ hàng, và đặt đơn hàng. Bạn cần mình hỗ trợ gì?',
      };
    }

    return {
      found: false,
      answer:
        'Mình không tìm thấy thông tin này. Bạn có thể hỏi về sản phẩm, bảo hành, giao hàng, đổi trả, thanh toán, hoặc trả góp.',
    };
  }
}
