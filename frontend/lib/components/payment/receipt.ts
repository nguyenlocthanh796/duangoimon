const PAY_METHODS = [
  { id: 'tien_mat',    label: 'Tiền mặt',       icon: 'cash-register', },
  { id: 'card',        label: 'Quẹt thẻ',        icon: 'credit-card-outline', },
  { id: 'qr',          label: 'QR Code',          icon: 'qrcode-scan', },
  { id: 'chuyen_khoan',label: 'Chuyển khoản',    icon: 'bank-transfer', },
];

export { PAY_METHODS };

export function generateReceiptHTML(opts: {
  tableName: string; orderId: string; total: number;
  method?: string; cash?: number; change?: number;
  items: Array<{ product_name: string; quantity: number; unit_price: number; note?: string; options?: Record<string, string> }>;
  isTemporary?: boolean;
}): string {
  const itemsHTML = opts.items.map(item => `
    <div class="item" style="align-items: flex-start; margin-bottom: 8px;">
      <div style="flex: 1; padding-right: 10px; text-align: left;">
        <div><strong>${item.product_name || 'Món ăn'}</strong></div>
        ${item.note ? `<div style="font-size: 10px; color: #555;">* Ghi chú: ${item.note}</div>` : ''}
        ${item.options && Object.keys(item.options).length ? `<div style="font-size: 10px; color: #555;">* ${Object.entries(item.options).map(([k, v]) => `${k}: ${v}`).join(', ')}</div>` : ''}
      </div>
      <div style="white-space: nowrap; text-align: right;">
        ${item.quantity} x ${(item.unit_price || 0).toLocaleString('vi-VN')}đ
      </div>
    </div>
  `).join('');

  return `
    <html>
      <head>
        <title>Hóa đơn - Bàn ${opts.tableName}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; width: 300px; margin: 0 auto; text-align: center; }
          .header { text-align: center; margin-bottom: 15px; }
          .header h2 { margin: 0; font-size: 18px; }
          .header p { margin: 4px 0; font-size: 11px; }
          .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; font-size: 11px; margin: 4px 0; }
          .total { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 25px; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>NHÀ HÀNG POS PRO</h2>
          <p>Địa chỉ: 123 Đường Số 1, TP. Hồ Chí Minh</p>
          <p>SĐT: 0123.456.789</p>
          <div class="divider"></div>
          <p><strong>${opts.isTemporary ? 'PHIẾU TẠM TÍNH (IN TẠM)' : 'HÓA ĐƠN THANH TOÁN'}</strong></p>
          <p>Bàn: ${opts.tableName}</p>
          <p>Mã HĐ: #${opts.orderId?.slice(-6).toUpperCase()}</p>
          <p>Thời gian: ${new Date().toLocaleTimeString('vi-VN')} ${new Date().toLocaleDateString('vi-VN')}</p>
        </div>
        <div class="divider"></div>
        <div style="margin-bottom: 10px;">${itemsHTML}</div>
        <div class="divider"></div>
        <div class="total">
          <span>${opts.isTemporary ? 'Tạm tính' : 'Tổng thanh toán'}</span>
          <span>${opts.total.toLocaleString('vi-VN')}đ</span>
        </div>
        ${!opts.isTemporary ? `
        <div class="item" style="margin-top: 8px;">
          <span>Phương thức</span>
          <span>${opts.method ? (PAY_METHODS.find(m => m.id === opts.method)?.label || opts.method) : '—'}</span>
        </div>
        ${opts.method === 'tien_mat' ? `
        <div class="item">
          <span>Khách đưa</span>
          <span>${(opts.cash || 0).toLocaleString('vi-VN')}đ</span>
        </div>
        <div class="item">
          <span>Tiền trả lại</span>
          <span>${Math.max(0, opts.change || 0).toLocaleString('vi-VN')}đ</span>
        </div>
        ` : ''}
        ` : ''}
        <div class="divider"></div>
        <div class="footer">
          <p>Cảm ơn Quý khách. Hẹn gặp lại!</p>
          <p>Powered by POS Pro</p>
        </div>
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body>
    </html>
  `;
}
