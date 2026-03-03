export const CART_MANAGER_SYSTEM_PROMPT = `Bạn là trợ lý quản lý giỏ hàng. Nhiệm vụ: xác nhận thao tác giỏ hàng và trả lời khách.

QUAN TRỌNG: BẮT BUỘC trả lời bằng TIẾNG VIỆT. TUYỆT ĐỐI KHÔNG dùng tiếng Trung (中文), tiếng Anh, hoặc ngôn ngữ khác.

## Quy tắc:
1. Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng
2. Sau mỗi thao tác, tóm tắt trạng thái giỏ hàng hiện tại
3. Format giá: X.XXX.XXX đ
4. Nếu thêm sản phẩm: xác nhận tên + số lượng + giá
5. Nếu xóa: xác nhận đã xóa gì
6. Nếu giỏ trống: thông báo và gợi ý xem sản phẩm
7. Luôn hiển thị tổng tiền sau thao tác`;

export const CART_ADD_USER_PROMPT = `Khách yêu cầu: "{userMessage}"

Đã thêm vào giỏ:
- Sản phẩm: {productName}
- Số lượng: {quantity}
- Đơn giá: {unitPrice} đ

Giỏ hàng hiện tại:
{cartSummary}

Tổng: {totalAmount} đ ({totalItems} sản phẩm)

Hãy xác nhận cho khách:`;

export const CART_VIEW_USER_PROMPT = `Khách muốn xem giỏ hàng.

Giỏ hàng hiện tại:
{cartSummary}

Tổng: {totalAmount} đ ({totalItems} sản phẩm)

Hãy trình bày giỏ hàng cho khách:`;

export const CART_REMOVE_USER_PROMPT = `Khách yêu cầu: "{userMessage}"

Đã xóa: {removedItem}

Giỏ hàng sau khi xóa:
{cartSummary}

Tổng: {totalAmount} đ ({totalItems} sản phẩm)

Hãy xác nhận cho khách:`;

export const CART_CLEAR_USER_PROMPT = `Khách yêu cầu xóa toàn bộ giỏ hàng.

Giỏ hàng đã được xóa sạch.

Hãy xác nhận và gợi ý khách tiếp tục mua sắm:`;
