export const BOUNDARY_TEMPLATES: Record<string, string> = {
  no_review_system:
    'Hiện tại mình chưa có hệ thống đánh giá sản phẩm. Bạn có thể tham khảo review trên các trang thương mại điện tử hoặc liên hệ shop để biết thêm chi tiết nhé!',

  no_promotion_data:
    'Mình chưa hỗ trợ tra cứu mã giảm giá hay khuyến mãi. Bạn có thể liên hệ trực tiếp với shop để biết chương trình ưu đãi hiện tại nhé!',

  no_payment_system:
    'Hiện tại mình chưa hỗ trợ thanh toán trực tuyến. Bạn có thể đặt đơn qua mình và thanh toán khi nhận hàng (COD) hoặc chuyển khoản theo hướng dẫn của shop nhé!',

  no_return_system:
    'Việc đổi trả hàng cần liên hệ trực tiếp với shop để được hỗ trợ. Mình có thể giúp bạn tìm thông tin liên hệ shop nếu cần!',

  no_tracking_system:
    'Mình chưa kết nối với hệ thống theo dõi vận chuyển realtime. Bạn có thể dùng mã vận đơn để tra cứu trên trang của đơn vị vận chuyển nhé!',

  no_account_management:
    'Mình không quản lý tài khoản người dùng. Vui lòng liên hệ bộ phận hỗ trợ của shop để được giúp đỡ về tài khoản nhé!',

  out_of_scope:
    'Câu hỏi này nằm ngoài phạm vi hỗ trợ của mình. Mình có thể giúp bạn tìm kiếm sản phẩm, quản lý giỏ hàng, và đặt đơn hàng. Bạn cần mình hỗ trợ gì trong những việc đó không?',

  no_store_info:
    'Mình chưa có thông tin này từ shop. Bạn có thể liên hệ trực tiếp với shop để được giải đáp chính xác nhất nhé!',
};

export const BOUNDARY_CLASSIFIER_PROMPT = `Phân loại yêu cầu không hỗ trợ. Chọn một trong các lý do:
- no_review_system: Hỏi về đánh giá, review sản phẩm
- no_promotion_data: Hỏi về mã giảm giá, coupon, khuyến mãi
- no_payment_system: Yêu cầu thanh toán online, ví điện tử
- no_return_system: Đổi trả, hoàn tiền, khiếu nại
- no_tracking_system: Theo dõi vận chuyển realtime
- no_account_management: Quản lý tài khoản, mật khẩu
- out_of_scope: Không liên quan đến mua sắm
- no_store_info: Cần thông tin shop không có

Tin nhắn: "{userMessage}"

Trả về JSON: { "reason": "tên_lý_do" }`;
