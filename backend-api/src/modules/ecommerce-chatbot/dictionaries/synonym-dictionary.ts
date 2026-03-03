/**
 * Vietnamese synonym dictionary for query expansion.
 * ~70 entries covering: product categories, features, actions, brands, price terms.
 * Keys are normalized (lowercase, no diacritics where applicable).
 */
export const SYNONYM_DICTIONARY: Record<string, string[]> = {
  // === Device categories ===
  'điện thoại': ['smartphone', 'di động', 'mobile', 'phone', 'dt', 'dien thoai'],
  'máy tính': ['laptop', 'pc', 'computer', 'notebook', 'may tinh'],
  'laptop': ['máy tính xách tay', 'notebook', 'may tinh xach tay'],
  'tai nghe': ['headphone', 'earphone', 'earbuds', 'airpods', 'headset'],
  'loa': ['speaker', 'loa bluetooth', 'loa di động'],
  'máy tính bảng': ['tablet', 'ipad', 'may tinh bang'],
  'đồng hồ thông minh': ['smartwatch', 'smart watch', 'dong ho thong minh', 'apple watch'],
  'phụ kiện': ['accessory', 'phu kien', 'linh kiện'],
  'sạc': ['charger', 'củ sạc', 'bộ sạc', 'sạc nhanh', 'sac'],
  'ốp lưng': ['case', 'op lung', 'bao da', 'ốp điện thoại'],
  'cường lực': ['tempered glass', 'kính cường lực', 'cuong luc', 'miếng dán'],
  'chuột': ['mouse', 'chuot', 'chuột không dây'],
  'bàn phím': ['keyboard', 'ban phim', 'bàn phím cơ'],

  // === Features & specs ===
  'pin': ['battery', 'dung lượng pin', 'thời lượng pin', 'pin trâu'],
  'màn hình': ['display', 'screen', 'panel', 'man hinh'],
  'camera': ['chụp hình', 'chụp ảnh', 'ống kính', 'cam'],
  'bộ nhớ': ['ram', 'memory', 'dung lượng', 'bo nho'],
  'lưu trữ': ['storage', 'rom', 'bộ nhớ trong', 'luu tru', 'ổ cứng'],
  'chip': ['processor', 'cpu', 'vi xử lý', 'chipset', 'bộ xử lý'],
  'nhanh': ['hiệu năng cao', 'mạnh', 'powerful', 'fast', 'tốc độ'],
  'nhẹ': ['mỏng nhẹ', 'gọn', 'compact', 'lightweight', 'ultrabook'],
  'chống nước': ['waterproof', 'water resistant', 'ip68', 'ip67', 'chong nuoc'],

  // === Price & value ===
  'giá': ['cost', 'chi phí', 'bao nhiêu tiền', 'giá cả', 'giá tiền', 'gia'],
  'rẻ': ['giá rẻ', 'bình dân', 'tiết kiệm', 'economic', 'budget', 'phải chăng'],
  'đắt': ['cao cấp', 'premium', 'luxury', 'hàng sang', 'flagship'],
  'giảm giá': ['khuyến mãi', 'sale', 'promotion', 'ưu đãi', 'discount', 'giam gia'],
  'tầm trung': ['mid-range', 'trung cấp', 'tam trung', 'phân khúc trung'],
  'cao cấp': ['flagship', 'premium', 'high-end', 'hàng đầu'],

  // === Actions ===
  'mua': ['đặt hàng', 'order', 'purchase', 'thêm vào giỏ', 'dat hang'],
  'tìm': ['tìm kiếm', 'search', 'xem', 'cho xem', 'tìm giúp', 'tim'],
  'so sánh': ['compare', 'đối chiếu', 'khác nhau', 'so sanh', 'hơn kém'],
  'thêm': ['add', 'bỏ vào', 'cho vào', 'them'],
  'xóa': ['bỏ', 'remove', 'delete', 'loại bỏ', 'xoa'],
  'đặt đơn': ['đặt hàng', 'order', 'checkout', 'thanh toán', 'dat don'],

  // === Brands (informal Vietnamese) ===
  'iphone': ['ip', 'apple', 'táo', 'iph'],
  'samsung': ['ss', 'sam sung', 'galaxy', 'sam'],
  'xiaomi': ['mi', 'redmi', 'poco'],
  'oppo': ['oppo', 'realme', 'oneplus'],
  'vivo': ['vivo', 'iqoo'],
  'huawei': ['huawei', 'honor'],
  'macbook': ['mac', 'apple laptop', 'mb'],
  'airpods': ['tai nghe apple', 'airpod', 'ap'],
  'sony': ['sony', 'xperia'],

  // === Qualities ===
  'tốt': ['chất lượng', 'ổn', 'ngon', 'đáng mua', 'recommend', 'gợi ý'],
  'đẹp': ['thiết kế đẹp', 'sang trọng', 'bắt mắt', 'thời trang'],
  'bền': ['durable', 'chắc chắn', 'lâu hỏng', 'bền bỉ'],
  'mới': ['mới nhất', 'latest', 'newest', 'vừa ra', '2024', '2025', '2026'],

  // === Common questions ===
  'giao hàng': ['ship', 'shipping', 'vận chuyển', 'giao hang', 'delivery'],
  'bảo hành': ['warranty', 'bao hanh', 'đổi trả', 'chính hãng'],
  'trả góp': ['installment', 'tra gop', 'góp', 'chia nhỏ thanh toán'],

  // === Color ===
  'đen': ['black', 'midnight', 'space gray', 'den'],
  'trắng': ['white', 'silver', 'starlight', 'trang'],
  'xanh': ['blue', 'green', 'teal', 'xanh dương', 'xanh lá'],
  'hồng': ['pink', 'rose', 'rose gold', 'hong'],
  'tím': ['purple', 'violet', 'lavender', 'tim'],
  'vàng': ['gold', 'yellow', 'champagne', 'vang'],

  // === Use cases ===
  'chơi game': ['gaming', 'game', 'choi game', 'game thủ'],
  'học tập': ['sinh viên', 'học sinh', 'study', 'hoc tap', 'văn phòng'],
  'công việc': ['work', 'office', 'doanh nhân', 'business', 'cong viec'],
  'chụp ảnh': ['photography', 'camera tốt', 'chup anh', 'selfie'],
};

/**
 * Expand a query using the synonym dictionary.
 * Returns the original query + expanded variations.
 */
export function expandWithSynonyms(query: string): string[] {
  const queryLower = query.toLowerCase();
  const results = new Set<string>([query]);

  for (const [key, synonyms] of Object.entries(SYNONYM_DICTIONARY)) {
    if (queryLower.includes(key)) {
      for (const syn of synonyms) {
        results.add(queryLower.replace(key, syn));
      }
    }
    for (const syn of synonyms) {
      if (queryLower.includes(syn)) {
        results.add(queryLower.replace(syn, key));
      }
    }
  }

  return Array.from(results);
}
