export const AVAILABLE_LABELS = [
  'Hỗ trợ kỹ thuật',
  'Tên miền',
  'Bộ phận kế toán',
  'VIP',
  'Khiếu nại',
  'Báo giá',
  'Demo',
];

const LABEL_COLORS = ['#ff4d4f', '#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2'];

export function getLabelColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}
