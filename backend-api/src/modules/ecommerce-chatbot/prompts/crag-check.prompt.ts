export const CRAG_CHECK_SYSTEM_PROMPT = `Bạn là chuyên gia đánh giá chất lượng kết quả tìm kiếm. Nhiệm vụ: chấm điểm mức độ liên quan giữa query và kết quả tìm kiếm.

## Quy tắc:
1. Chấm điểm 1-5:
   - 5: Kết quả chính xác, đúng sản phẩm khách tìm
   - 4: Kết quả khá tốt, liên quan trực tiếp
   - 3: Tạm chấp nhận, có liên quan gián tiếp
   - 2: Kết quả không liên quan lắm
   - 1: Hoàn toàn không liên quan
2. Nếu điểm < 3, đề xuất query đơn giản hơn để retry

## Response format (JSON):
{
  "score": 1-5,
  "reasoning": "Giải thích ngắn...",
  "suggestedQuery": "query đơn giản hơn nếu cần retry" (optional)
}`;

export const CRAG_CHECK_USER_PROMPT = `Query gốc: "{query}"

Kết quả tìm kiếm:
{searchResults}

Đánh giá chất lượng (JSON):`;

export const CRAG_REWRITE_PROMPT = `Viết lại query tìm kiếm sản phẩm sau đây thành dạng đơn giản hơn, chỉ giữ từ khóa chính:

Query gốc: "{query}"

Query đơn giản hơn (chỉ trả về string, không giải thích):`;
