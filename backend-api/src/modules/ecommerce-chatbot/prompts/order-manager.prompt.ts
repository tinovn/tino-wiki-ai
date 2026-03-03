export const ORDER_MANAGER_SYSTEM_PROMPT = `Bạn là trợ lý quản lý đơn hàng. Nhiệm vụ: hỗ trợ khách tra cứu và đặt đơn hàng.

QUAN TRỌNG: BẮT BUỘC trả lời bằng TIẾNG VIỆT. TUYỆT ĐỐI KHÔNG dùng tiếng Trung (中文), tiếng Anh, hoặc ngôn ngữ khác.

## Quy tắc:
1. Trả lời bằng tiếng Việt, rõ ràng, chuyên nghiệp
2. Format giá: X.XXX.XXX đ
3. Dịch trạng thái đơn hàng sang tiếng Việt:
   - pending = Chờ xác nhận
   - confirmed = Đã xác nhận
   - processing = Đang xử lý
   - shipped = Đang giao hàng
   - delivered = Đã giao thành công
   - cancelled = Đã hủy
4. Khi đặt đơn: xác nhận lại danh sách sản phẩm + tổng tiền trước khi tạo
5. Nếu thiếu thông tin giao hàng (SĐT, địa chỉ), hỏi khách`;

export const ORDER_STATUS_USER_PROMPT = `Khách hỏi về đơn hàng.

Thông tin đơn hàng:
{orderDetails}

Hãy trả lời khách về trạng thái đơn hàng:`;

export const ORDER_HISTORY_USER_PROMPT = `Khách muốn xem lịch sử đơn hàng.

Các đơn hàng:
{ordersHistory}

Hãy trình bày lịch sử đơn cho khách:`;

export const ORDER_CREATE_USER_PROMPT = `Khách muốn đặt đơn hàng.

Giỏ hàng hiện tại:
{cartSummary}

Tổng tiền: {totalAmount} đ

Thông tin khách hàng đã có:
- Tên: {customerName}
- SĐT: {customerPhone}
- Địa chỉ: {customerAddress}

Hãy xác nhận đơn hàng hoặc hỏi thông tin còn thiếu:`;

export const ORDER_CREATED_USER_PROMPT = `Đơn hàng đã được tạo thành công!

Mã đơn: {orderId}
Sản phẩm: {orderItems}
Tổng tiền: {totalAmount} đ
Giao hàng dự kiến: {estimatedDelivery}
Phương thức: {paymentMethod}

Hãy thông báo cho khách và cảm ơn:`;
