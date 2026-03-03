import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderFactory } from '../../llm/llm-provider.factory';
import { EcommerceIntent, IntentResult } from '../interfaces/graph-state.interface';
import {
  BOUNDARY_TEMPLATES,
  BOUNDARY_CLASSIFIER_PROMPT,
} from '../prompts/boundary.prompt';

@Injectable()
export class BoundaryCheckerNode {
  private readonly logger = new Logger(BoundaryCheckerNode.name);

  constructor(private readonly llmFactory: LlmProviderFactory) {}

  async execute(
    intent: EcommerceIntent,
    userMessage: string,
  ): Promise<IntentResult> {
    const reason = await this.classifyReason(userMessage);

    const template =
      BOUNDARY_TEMPLATES[reason] ?? BOUNDARY_TEMPLATES.out_of_scope;

    this.logger.debug(
      `Boundary: unsupported request, reason="${reason}"`,
    );

    return {
      intentName: 'unsupported',
      response: template,
      toolResults: [],
      confidence: 0.9,
      unsupportedReason: reason,
    };
  }

  private async classifyReason(userMessage: string): Promise<string> {
    // Quick keyword-based classification first
    const quickClassify = this.quickClassify(userMessage);
    if (quickClassify) return quickClassify;

    // Fall back to LLM classification
    try {
      const chatAdapter = this.llmFactory.getChatAdapter();
      const response = await chatAdapter.chat(
        [
          {
            role: 'user',
            content: BOUNDARY_CLASSIFIER_PROMPT.replace(
              '{userMessage}',
              userMessage,
            ),
          },
        ],
        { responseFormat: 'json', temperature: 0.1 },
      );

      const parsed = JSON.parse(response.content);
      return parsed.reason ?? 'out_of_scope';
    } catch {
      return 'out_of_scope';
    }
  }

  private quickClassify(message: string): string | null {
    const msg = message.toLowerCase();

    if (['review', 'đánh giá', 'nhận xét', 'feedback'].some((k) => msg.includes(k))) {
      return 'no_review_system';
    }
    if (['mã giảm giá', 'coupon', 'voucher', 'khuyến mãi', 'ma giam gia'].some((k) => msg.includes(k))) {
      return 'no_promotion_data';
    }
    if (['thanh toán online', 'ví điện tử', 'momo', 'zalopay', 'vnpay'].some((k) => msg.includes(k))) {
      return 'no_payment_system';
    }
    if (['đổi trả', 'hoàn tiền', 'trả hàng', 'khiếu nại'].some((k) => msg.includes(k))) {
      return 'no_return_system';
    }
    if (['theo dõi', 'tracking', 'đang ở đâu', 'vận chuyển'].some((k) => msg.includes(k))) {
      return 'no_tracking_system';
    }
    if (['tài khoản', 'mật khẩu', 'đăng ký', 'đăng nhập'].some((k) => msg.includes(k))) {
      return 'no_account_management';
    }

    return null;
  }
}
