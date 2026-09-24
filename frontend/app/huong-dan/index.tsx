import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  Image,
  BackHandler,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/theme';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { AppText, AppHeader } from '../../lib/components/ui';
import { playTapSound } from '../../lib/utils/sound';

interface VisualStep {
  step: number;
  title: string;
  image: any;
}

interface GuideSection {
  id: string;
  category:
    | 'pos'
    | 'table'
    | 'payment'
    | 'e-invoice'
    | 'kds'
    | 'cash'
    | 'staff'
    | 'customer'
    | 'inventory'
    | 'reports'
    | 'settings'
    | 'hardware'
    | 'troubleshoot';
  title: string;
  icon: keyof typeof Icon.glyphMap;
  badge?: string;
  scenario: string;
  steps: string[];
  tips?: string[];
  warning?: string;
  visualSteps?: VisualStep[];
  actionRoute?: string;
  actionLabel?: string;
}

const GUIDE_CATEGORIES = [
  { id: 'all', label: 'Tất Cả', icon: 'apps' },
  { id: 'pos', label: 'Bán Hàng', icon: 'cart-outline' },
  { id: 'table', label: 'Bàn & Phòng', icon: 'table-furniture' },
  { id: 'payment', label: 'Thanh Toán', icon: 'qrcode-scan' },
  { id: 'e-invoice', label: 'HĐĐT Thuế', icon: 'file-document-outline' },
  { id: 'kds', label: 'Bếp / Bar', icon: 'chef-hat' },
  { id: 'cash', label: 'Sổ Quỹ & Ca', icon: 'cash-register' },
  { id: 'staff', label: 'Nhân Sự & Lương', icon: 'account-group-outline' },
  { id: 'customer', label: 'Khách Hàng & Nợ', icon: 'account-star-outline' },
  { id: 'inventory', label: 'Kho & Giá Vốn', icon: 'warehouse' },
  { id: 'reports', label: 'Báo Cáo', icon: 'chart-box-outline' },
  { id: 'settings', label: 'Cài Đặt Quán', icon: 'cog-outline' },
  { id: 'hardware', label: 'Máy In & Két', icon: 'printer' },
  { id: 'troubleshoot', label: 'Sự Cố', icon: 'alert-circle-outline' },
] as const;

const GUIDE_DATA: GuideSection[] = [
  // 1. BÁN HÀNG (POS)
  {
    id: 'pos_order',
    category: 'pos',
    title: 'Gọi món, chọn Size, Đường Đá & Topping',
    icon: 'coffee-outline',
    badge: 'Thu Ngân',
    scenario: 'Khách đến quầy gọi đồ uống có các yêu cầu tùy biến như ít ngọt, không đá, thêm trân châu.',
    steps: [
      'Chạm vào món ăn trên thực đơn để mở bảng tùy chọn (Modifier Sheet).',
      'Chọn Size (Vừa M, Lớn L), mức đường (30%, 50%, 70%, 100%), mức đá (Không đá, 50%, 100%).',
      'Chọn thêm Topping ăn kèm (Trân châu, Thạch, Pudding...).',
      'Bấm nút "Thêm Vào Đơn" để đưa món vào giỏ hàng với giá tính tự động.',
    ],
    tips: [
      'Bấm trực tiếp nút [+] hoặc [-] trên dòng món ăn trong giỏ hàng để đổi số lượng siêu tốc.',
      'Vuốt sang trái để xóa món hoặc bấm "Hủy Món" để ghi nhận lý do vào nhật ký kiểm toán.',
    ],
    actionRoute: '/',
    actionLabel: 'Mở Màn Hình Bán Hàng',
  },
  {
    id: 'pos_park_order',
    category: 'pos',
    title: 'Lưu hóa đơn chờ (Park Order) giờ cao điểm',
    icon: 'clock-fast',
    badge: '1-Chạm',
    scenario: 'Khách đang chọn món dở thì nghe điện thoại hoặc chờ bạn, phía sau có khách đang đợi thanh toán.',
    steps: [
      'Tại thanh giỏ hàng, bấm nút "Lưu Chờ".',
      'Hệ thống tự động cấp mã tuần tự (CHỜ-01, CHỜ-02) và làm trống giỏ hàng.',
      'Thu ngân ngay lập tức order cho khách tiếp theo mà không mất dữ liệu của khách trước.',
      'Khi khách quay lại: Chạm vào huy hiệu "Chờ (N)" trên header -> bấm "Mở Lại" để nạp lại đơn.',
    ],
    tips: [
      'Hóa đơn chờ có thể mở lại vào bất kỳ bàn trống nào mà khách chọn ngồi.',
    ],
    actionRoute: '/',
    actionLabel: 'Mở Màn Hình Bán Hàng',
  },
  {
    id: 'pos_void_security',
    category: 'pos',
    title: 'Hủy món ăn & Hủy đơn hàng an toàn với mã PIN',
    icon: 'shield-alert-outline',
    badge: 'Chống Thất Thoát',
    scenario: 'Khách đổi ý muốn bỏ bớt món hoặc hủy toàn bộ đơn sau khi đã gửi bếp hoặc in tạm tính.',
    steps: [
      'Tại giỏ hàng hoặc bàn ăn, chạm vào biểu tượng "Hủy Món" hoặc vuốt món sang trái.',
      'Hộp thoại bảo mật yêu cầu nhập Mã PIN Quản Lý hoặc Chủ Quán (Chủ Quán thao tác trực tiếp không cần nhập PIN).',
      'Chọn lý do hủy món từ danh sách: "Khách đổi ý", "Pha chế nhầm", "Món hết nguyên liệu", "Khác".',
      'Bấm "Xác Nhận Hủy": Món ăn được gỡ khỏi đơn và tự động ghi nhật ký kiểm toán (Audit Log).',
    ],
    warning: 'Nhân viên không thể tự ý hủy món nếu không có Quản lý hoặc Chủ quán xác thực bằng mã PIN.',
    tips: [
      'Toàn bộ lịch sử hủy món sau khi in tạm tính đều được Goroutine gửi cảnh báo ngay về Telegram của Chủ Quán.',
    ],
    actionRoute: '/',
    actionLabel: 'Mở Màn Hình Bán Hàng',
  },
  {
    id: 'pos_quick_price',
    category: 'pos',
    title: 'Đổi giá bán nhanh tại quầy thu ngân',
    icon: 'tag-edit-outline',
    badge: 'Chủ Quán',
    scenario: 'Món ăn bán theo giá chợ hoặc áp dụng giá ưu đãi đặc biệt cho sự kiện trong ngày.',
    steps: [
      'Chạm giữ 1.5 giây vào ô món ăn trên màn hình bán hàng POS.',
      'Bảng "Đổi Giá Nhanh" xuất hiện, nhập đơn giá mới mong muốn.',
      'Bấm "Xác Nhận", giá bán cập nhật ngay lập tức cho toàn bộ thiết bị trong quán.',
    ],
    actionRoute: '/',
    actionLabel: 'Mở Màn Hình Bán Hàng',
  },
  {
    id: 'pos_custom_item',
    category: 'pos',
    title: 'Bán món ngoài thực đơn (+ Món Khác)',
    icon: 'plus-circle-outline',
    badge: 'Linh Hoạt',
    scenario: 'Khách yêu cầu món hoặc dịch vụ phát sinh chưa kịp đưa vào menu như nước ngọt ngoài, thuốc lá, phụ thu riêng.',
    steps: [
      'Tại thanh tìm kiếm món ăn hoặc góc dưới thực đơn, bấm nút "+ Món Khác".',
      'Nhập Tên món phát sinh (Ví dụ: "Nước suối lốc", "Thuốc lá 555").',
      'Nhập Đơn giá bán và Số lượng mong muốn.',
      'Bấm "Thêm Vào Giỏ": Món được thêm ngay vào hóa đơn hiện tại và in vé báo bếp bình thường.',
    ],
    actionRoute: '/',
    actionLabel: 'Mở Màn Hình Bán Hàng',
  },
  {
    id: 'pos_discount_flow',
    category: 'pos',
    title: 'Chiết khấu % hoặc giảm tiền & Khóa mã PIN > 20%',
    icon: 'percent-outline',
    badge: 'Chống Thất Thoát',
    scenario: 'Áp dụng giảm giá cho khách VIP, người quen hoặc chương trình khuyến mãi theo ngày.',
    steps: [
      'Tại giỏ hàng, chạm vào dòng "Chiết Khấu / Giảm Giá".',
      'Chọn giảm theo Phần Trăm (%) hoặc theo Số Tiền trực tiếp (VNĐ).',
      'Nếu chiết khấu vượt quá 20%: Thu ngân cần nhập Mã PIN Quản Lý (Chủ Quán thao tác được miễn PIN).',
      'Chọn lý do giảm giá: "Khách VIP", "Khuyến mãi", "Khách phàn nàn", "Khác" để lưu Audit Log.',
    ],
    warning: 'Mọi khoản giảm giá trên 20% đều được hệ thống ghi nhận vào nhật ký kiểm toán và gửi cảnh báo về Telegram Chủ Quán.',
    actionRoute: '/',
    actionLabel: 'Mở Màn Hình Bán Hàng',
  },
  {
    id: 'order_history_reprint',
    category: 'pos',
    title: 'Xem sổ đơn, In lại bill & Hoàn tiền hóa đơn cũ',
    icon: 'history',
    badge: 'Thu Ngân',
    scenario: 'Khách xin in lại hóa đơn tính tiền hoặc yêu cầu hoàn tiền cho đơn hàng đã thanh toán trước đó.',
    steps: [
      'Vào menu "Sổ Đơn" (/hoa-don) trên thanh điều hướng.',
      'Tìm kiếm hóa đơn theo Mã đơn (HD-xxxxx), Tên bàn hoặc Số tiền.',
      'Chạm vào đơn hàng cần xử lý để xem chi tiết từng món và hình thức thanh toán.',
      'Bấm "In Lại Bill": Máy in in ngay bản sao hóa đơn trong 0.5 giây.',
      'Nếu khách yêu cầu hoàn tiền: Bấm "Hủy / Hoàn Tiền" -> Nhập mã PIN Quản Lý -> Nhập lý do hoàn trả -> Két tiền mở để thối lại.',
    ],
    warning: 'Hành động hủy hóa đơn đã thanh toán sẽ tự động gửi thông báo khẩn cấp tới Telegram của Chủ Quán.',
    actionRoute: '/hoa-don',
    actionLabel: 'Mở Sổ Đơn Hàng',
  },
  {
    id: 'topping_management',
    category: 'pos',
    title: 'Tạo nhóm Topping & Định giá ăn kèm',
    icon: 'food-apple-outline',
    badge: 'Thực Đơn',
    scenario: 'Quán bổ sung thêm các loại topping mới như Trân châu hoàng kim, Kem Cheese, Pudding trứng.',
    steps: [
      'Vào menu "Thực Đơn" (/thuc-don) -> Chạm vào Tab "Topping".',
      'Bấm nút "+ Thêm Topping" ở góc trên.',
      'Nhập Tên topping (Ví dụ: "Trân Châu Hoàng Kim") và Đơn giá cộng thêm (Ví dụ: "10.000đ").',
      'Chọn nhóm danh mục áp dụng (Ví dụ: Chỉ áp dụng cho Trà Sữa và Trà Trái Cây).',
      'Bấm "Lưu Topping": Topping mới lập tức xuất hiện trong Modifier Sheet khi nhân viên gọi món.',
    ],
    actionRoute: '/thuc-don',
    actionLabel: 'Mở Quản Lý Thực Đơn',
  },
  {
    id: 'pos_create_category',
    category: 'pos',
    title: 'Tạo danh mục mặt hàng đơn giản, nhanh chóng',
    icon: 'folder-plus-outline',
    badge: 'Thực Đơn',
    scenario: 'Quán ra mắt nhóm sản phẩm mới (Bánh Ngọt, Trà Trái Cây...) cần phân loại để lọc nhanh trên màn hình bán hàng.',
    steps: [
      'Bước 1: Vào Thực Đơn Món Ăn (/thuc-don) -> Chạm vào Tab "Danh Mục" trên đỉnh màn hình.',
      'Bước 2: Bấm nút [+ Thêm Nhóm] ở góc phải thanh tiêu đề phân nhóm.',
      'Bước 3: Nhập Tên danh mục (VD: Bánh Ngọt, Cà Phê, Trà Sữa...).',
      'Bước 4: Chọn biểu tượng Icon đại diện trực quan (ly nước, ly cà phê, bánh ngọt, đồ ăn...).',
      'Bước 5: Bấm [Tạo Nhóm] để hoàn tất tức thì 0ms mà không cần khởi động lại ứng dụng.',
    ],
    tips: [
      'Nên duy trì 5 - 7 danh mục chính để giao diện bán hàng trực quan, không bị rối mắt.',
      'Dùng phím mũi tên [▲] hoặc [▼] để đưa các nhóm bán chạy nhất lên trên cùng.',
    ],
    visualSteps: [
      {
        step: 1,
        title: 'Bước 1: Chạm vào Tab Danh Mục (6)',
        image: require('../../assets/images/guides/guide_step1_select_tab.png'),
      },
      {
        step: 2,
        title: 'Bước 2: Bấm nút [+ Thêm Nhóm]',
        image: require('../../assets/images/guides/guide_step2_click_add_group.png'),
      },
      {
        step: 3,
        title: 'Bước 3: Điền tên, chọn icon Bánh Kem & Bấm Tạo Nhóm',
        image: require('../../assets/images/guides/guide_step3_fill_modal.png'),
      },
      {
        step: 4,
        title: 'Bước 4: Danh mục "Banh Ngot" đã sẵn sàng phục vụ',
        image: require('../../assets/images/guides/guide_step4_category_ready.png'),
      },
    ],
    actionRoute: '/thuc-don',
    actionLabel: 'Mở Màn Hình Thực Đơn Để Thực Hành',
  },

  // 2. SƠ ĐỒ BÀN & PHÒNG (TABLE)
  {
    id: 'table_move_merge',
    category: 'table',
    title: 'Chuyển bàn, Gộp bàn và Tách món',
    icon: 'table-furniture',
    badge: 'Phục Vụ',
    scenario: 'Khách muốn đổi sang bàn có điều hòa hoặc 2 nhóm khách đi chung muốn tính gộp tiền.',
    steps: [
      'Chọn bàn nguồn đang có khách trên sơ đồ bàn.',
      'Bấm nút "Thao Tác Bàn" (biểu tượng 3 chấm hoặc nút Chuyển/Gộp).',
      'Chọn "Chuyển Bàn": Chọn bàn đích trống -> Bấm "Xác Nhận Chuyển". Toàn bộ món và trạng thái bếp di chuyển sang bàn mới.',
      'Chọn "Gộp Bàn": Chọn bàn đích đang có khách -> Bấm "Xác Nhận Gộp". Hai hóa đơn gộp thành 1, bàn nguồn tự động giải phóng.',
      'Chọn "Tách Bàn": Đánh dấu các món cần tách sang bàn mới, hệ thống tự động tách vé KDS tương ứng.',
    ],
    actionRoute: '/quan-ly-ban',
    actionLabel: 'Mở Sơ Đồ Bàn Ăn',
  },
  {
    id: 'pos_pre_print_bill',
    category: 'table',
    title: 'In tạm tính hóa đơn đối soát trước khi thanh toán',
    icon: 'receipt',
    badge: 'Phục Vụ',
    scenario: 'Khách tại bàn yêu cầu xem lại hóa đơn trước khi tính tiền, giúp đối soát chuẩn xác và phòng ngừa gian lận.',
    steps: [
      'Chạm vào bàn khách đang ngồi trên sơ đồ bàn ăn.',
      'Bấm nút "In Tạm Tính" (biểu tượng máy in hóa đơn).',
      'Máy in xuất phiếu tạm tính có ghi rõ "PHIẾU TẠM TÍNH - CHƯA THANH TOÁN" để nhân viên đưa khách kiểm tra.',
      'Bàn trên sơ đồ tự động đổi sang màu vàng cam báo hiệu trạng thái "Đã In Tạm Tính".',
    ],
    warning: 'Mọi thao tác hủy hoặc bớt món sau khi đã in tạm tính sẽ tự động kích hoạt cảnh báo gian lận và gửi tin nhắn đến Telegram của Chủ Quán.',
    tips: [
      'Quy trình in tạm tính giúp phát hiện ngay nếu phục vụ ghi nhầm hoặc thừa món trước khi thu ngân xuất hóa đơn chính thức.',
    ],
    actionRoute: '/quan-ly-ban',
    actionLabel: 'Mở Sơ Đồ Bàn Ăn',
  },

  // 3. THANH TOÁN & VIETQR (PAYMENT)
  {
    id: 'pos_cash_payment',
    category: 'payment',
    title: 'Thanh toán tiền mặt, tiền thối & mở két RJ11',
    icon: 'cash-multiple',
    badge: 'Thu Ngân',
    scenario: 'Khách thanh toán tiền mặt tại quầy, thu ngân tính tiền thối nhanh và két đựng tiền tự động bật mở.',
    steps: [
      'Bấm nút "Tính Tiền" tại giỏ hàng để chuyển sang giao diện thanh toán.',
      'Chạm vào các phím tắt mệnh giá nhanh (50k, 100k, 200k, 500k hoặc "Đưa Đủ").',
      'Hệ thống tự động hiển thị số tiền thối lại cho khách với phông số Tabular thẳng hàng.',
      'Bấm "Xong & In Bill": Két đựng tiền tự động bật mở qua xung 24V RJ11 và máy in xuất hóa đơn trong 0.5 giây.',
    ],
    tips: [
      'Khuyên dùng phím "Đưa Đủ" khi khách đưa vừa khít tiền để rút ngắn thời gian thao tác xuống dưới 2 giây.',
    ],
    actionRoute: '/thanh-toan',
    actionLabel: 'Mở Màn Hình Thanh Toán',
  },
  {
    id: 'pay_vietqr_announcer',
    category: 'payment',
    title: 'Thanh toán VietQR động & Loa báo tiền về 0đ',
    icon: 'qrcode-scan',
    badge: 'Chống Fake Bill',
    scenario: 'Khách thanh toán quét mã QR qua ứng dụng ngân hàng, tránh nguy cơ lừa đảo biên lai giả.',
    steps: [
      'Tại màn hình Thanh Toán, chọn tab "VietQR".',
      'Màn hình hiển thị mã VietQR động đã nhúng sẵn số tiền chính xác và mã hóa đơn.',
      'Khách dùng app ngân hàng quét mã và xác nhận chuyển khoản.',
      'Ngay khi tiền vào tài khoản: Loa điện thoại/máy tính bảng tự động phát giọng đọc: "Đã nhận [số tiền] đồng cho đơn [mã đơn]" và tự động in bill.',
    ],
    tips: [
      'Không cần mua thêm loa ngoài đắt đỏ, tận dụng trực tiếp loa thiết bị POS.',
      'Vào Cài Đặt -> Ngân Hàng & QR -> Bấm "Thử Loa Báo" để kiểm tra âm lượng.',
    ],
    actionRoute: '/thanh-toan',
    actionLabel: 'Mở Màn Hình Thanh Toán',
  },
  {
    id: 'pos_mixed_payment',
    category: 'payment',
    title: 'Thanh toán kết hợp: Tiền mặt + Chuyển khoản VietQR',
    icon: 'cash-multiple',
    badge: 'Linh Hoạt',
    scenario: 'Khách muốn trả 1 phần bằng tiền mặt và phần còn lại bằng chuyển khoản VietQR.',
    steps: [
      'Tại màn hình Thanh Toán, chọn hình thức "Kết Hợp" (Split Payment).',
      'Nhập số tiền mặt khách đưa (Ví dụ: Tổng bill 150.000đ, khách đưa 50.000đ tiền mặt).',
      'Hệ thống tự động tính số tiền còn lại (100.000đ) và sinh mã VietQR động đúng 100.000đ.',
      'Khách quét QR chuyển khoản 100.000đ -> Loa báo ting ting -> Bấm "Xong & In Bill".',
    ],
    tips: [
      'Hóa đơn in ra và sổ quỹ ca tự động bóc tách chuẩn xác: 50.000đ vào két tiền mặt và 100.000đ vào tài khoản ngân hàng.',
    ],
    actionRoute: '/thanh-toan',
    actionLabel: 'Mở Màn Hình Thanh Toán',
  },
  {
    id: 'pay_customer_debt',
    category: 'payment',
    title: 'Ghi nợ khách quen & Gạch nợ tự động',
    icon: 'notebook-outline',
    badge: 'CRM Sổ Nợ',
    scenario: 'Khách quen văn phòng hoặc công ty đối diện ăn uống cả tháng rồi chuyển khoản 1 lần.',
    steps: [
      'Tại màn hình Thanh Toán, chọn hình thức "Ghi Nợ".',
      'Chọn khách hàng từ danh bạ CRM hoặc nhập Số điện thoại của khách.',
      'Bấm "Xong & Ghi Nợ": Đơn hàng hoàn tất và số tiền tự động cộng vào sổ công nợ của khách.',
      'Khi khách chuyển khoản trả nợ: Webhook ngân hàng tự động phát hiện mã hóa đơn hoặc SĐT và gạch nợ tức thời.',
    ],
    actionRoute: '/thanh-toan',
    actionLabel: 'Mở Màn Hình Thanh Toán',
  },

  // 4. HÓA ĐƠN ĐIỆN TỬ (E-INVOICE)
  {
    id: 'e_invoice_mtt',
    category: 'e-invoice',
    title: 'Xuất HĐĐT Khởi Tạo Từ Máy Tính Tiền có mã CQT',
    icon: 'file-document-outline',
    badge: 'Thuế NĐ 123',
    scenario: 'Khách hàng là công ty yêu cầu xuất hóa đơn đỏ VAT để kê khai chi phí doanh nghiệp.',
    steps: [
      'Tại màn hình Thanh Toán, bấm nút "+ Xuất HĐĐT" ở góc dưới bên phải.',
      'Nhập Mã Số Thuế (MST) 10 số doanh nghiệp hoặc 13 số chi nhánh.',
      'Hệ thống tự động kiểm tra cú pháp MST chuẩn xác.',
      'Nhập Tên công ty và Email nhận hóa đơn (tùy chọn) -> Bấm "Áp Dụng".',
      'Bấm "Xong & In Bill": Máy in in ra hóa đơn nhiệt K80 có đầy đủ Ký hiệu mẫu, Số HĐ, Mã CQT và QR tra cứu trên cổng Tổng cục Thuế.',
    ],
    warning: 'Đơn hàng sau khi đã cấp mã CQT sẽ không thể chỉnh sửa hoặc xuất trùng lặp.',
    actionRoute: '/thanh-toan',
    actionLabel: 'Mở Màn Hình Thanh Toán',
  },

  // 5. BẾP & BAR (KDS)
  {
    id: 'kds_kitchen_screen',
    category: 'kds',
    title: 'Màn hình Bếp / Bar KDS điều phối chế biến',
    icon: 'chef-hat',
    badge: 'Bếp / Bar',
    scenario: 'Nhân viên pha chế và đầu bếp theo dõi món cần làm theo thứ tự thời gian gọi.',
    steps: [
      'Mở tab "Bếp / Bar" trên thanh điều hướng.',
      'Các vé gọi món hiển thị trực quan kèm đồng hồ đếm giây.',
      'Chạm vào từng món hoặc bấm nút "Nấu" để chuyển trạng thái sang Đang nấu.',
      'Khi món hoàn tất: Bấm "Xong" để thông báo cho nhân viên phục vụ bưng bàn.',
      'Hệ thống tự động dọn sạch các đơn đã phục vụ và thanh toán sau 30 phút.',
    ],
    actionRoute: '/kds',
    actionLabel: 'Mở Màn Hình Bếp / Bar KDS',
  },
  {
    id: 'kds_86_out_of_stock',
    category: 'kds',
    title: 'Báo hết món nhanh (86 Out of Stock) từ Bếp / Bar',
    icon: 'food-off',
    badge: 'Bếp / Bar',
    scenario: 'Nguyên liệu trong quầy pha chế hoặc bếp đã hết, cần khóa gọi món tức thì để tránh nhận order rồi phải xin lỗi khách.',
    steps: [
      'Trên màn hình Bếp / Bar KDS, chạm vào nút "Báo Hết Món".',
      'Chọn món ăn hoặc topping tạm hết từ danh sách thực đơn.',
      'Bấm "Xác Nhận Hết Hàng".',
      'Ngay lập tức 0ms: Toàn bộ máy POS của thu ngân và nhân viên phục vụ tự động gắn nhãn "Hết Món" và khóa không cho thêm vào giỏ.',
    ],
    tips: [
      'Khi có nguyên liệu mới, vào lại KDS chạm "Mở Bán Lại" để kích hoạt món trên toàn hệ thống.',
    ],
    actionRoute: '/kds',
    actionLabel: 'Mở Màn Hình Bếp / Bar KDS',
  },

  // 6. SỔ QUỸ & GIAO CA (CASH)
  {
    id: 'cash_shift_audit',
    category: 'cash',
    title: 'Sổ quỹ chi chợ 3 giây & Giao ca đếm két 30 giây',
    icon: 'cash-register',
    badge: 'Chống Thất Thoát',
    scenario: 'Chủ quán xuất tiền két mua rau, mua đá; nhân viên đổi ca cần bàn giao tiền mặt chính xác.',
    steps: [
      'Chi chợ 3 giây: Vào tab "Sổ Quỹ" -> Bấm "Chi Tiền" -> Chọn "Mua rau thịt / Mua đá" -> Nhập số tiền -> Bấm "Lưu Phiếu".',
      'Giao ca 30 giây: Vào tab "Giao Ca" -> Bấm "Đóng Ca & Đếm Két".',
      'Nhập số tiền mặt thực tế đang có trong ngăn kéo.',
      'Hệ thống áp dụng công thức: Tiền dự tính = Tiền đầu ca + Doanh thu tiền mặt + Thu nợ - Chi chợ.',
      'Nếu phát hiện lệch két: Hệ thống tự động ghi nhật ký kiểm toán và cảnh báo ngay cho Chủ quán.',
    ],
    actionRoute: '/so-quy',
    actionLabel: 'Mở Sổ Quỹ Chi Chợ',
  },

  // 7. QUẢN LÝ NHÂN SỰ & BẢNG LƯƠNG (STAFF)
  {
    id: 'staff_payroll_mgmt',
    category: 'staff',
    title: 'Quản lý nhân sự, Chấm công & Tính lương tự động',
    icon: 'account-cash-outline',
    badge: 'Chủ Quán',
    scenario: 'Chủ quán quản lý hồ sơ nhân viên, ca làm việc, tạm ứng lương tiền mặt và tự động tính thực lĩnh cuối tháng.',
    steps: [
      'Vào menu "Nhân Sự" (/nhan-su) -> Bấm "+ Thêm Nhân Viên".',
      'Chọn hình thức trả lương: Theo Giờ (hourly), Theo Tháng (monthly) hoặc Theo Ca (per_shift) và nhập mức lương cơ bản.',
      'Chấm công hằng ngày: Nhân viên bấm "Vào Ca" (Clock In) và "Ra Ca" (Clock Out) hoặc Quản lý ghi nhận giờ tăng ca OT.',
      'Tạm ứng lương: Khi nhân viên ứng tiền, bấm "Tạm Ứng" -> Nhập số tiền -> Hệ thống tự động sinh phiếu chi trong Sổ Quỹ tiền mặt.',
      'Cuối tháng: Bấm "Tính Lương" -> Hệ thống tự tính: Thực Lĩnh = Lương Công + Thưởng - Phạt - Tạm Ứng -> Bấm "Chi Lương" để chốt sổ.',
    ],
    tips: [
      'Mỗi nhân viên được cấp 1 mã PIN 4 số riêng biệt để chấm công và đăng nhập bán hàng mà không thấy doanh thu của quán.',
    ],
    actionRoute: '/nhan-su',
    actionLabel: 'Mở Quản Lý Nhân Sự & Bảng Lương',
  },

  // 8. KHÁCH HÀNG & CRM SỔ NỢ (CUSTOMER)
  {
    id: 'crm_customer_debt_mgmt',
    category: 'customer',
    title: 'Danh bạ khách hàng CRM & Thu nợ khách quen',
    icon: 'notebook-check-outline',
    badge: 'Chủ Quán',
    scenario: 'Theo dõi thông tin khách quen, hạn mức công nợ ăn uống hàng tháng và gạch nợ tự động.',
    steps: [
      'Vào menu "Khách Hàng" (/khach-hang) để xem toàn bộ danh bạ và tổng công nợ hiện tại.',
      'Thêm khách hàng mới với Tên, Số điện thoại, Hạng thành viên và Hạn mức nợ tối đa cho phép.',
      'Khi khách đến thanh toán nợ: Chạm vào tên khách -> Bấm "Thu Nợ".',
      'Chọn hình thức thu: "Tiền Mặt" (tự động cộng vào Sổ Quỹ ca hiện tại) hoặc "Mã VietQR" (khách quét chuyển khoản).',
      'Nhập số tiền khách trả (trả hết hoặc trả một phần) -> Bấm "Xác Nhận": Công nợ tự động khấu trừ tức thì.',
    ],
    actionRoute: '/khach-hang',
    actionLabel: 'Mở Sổ Nợ Khách Hàng CRM',
  },

  // 9. KHO HÀNG & GIÁ VỐN COGS (INVENTORY)
  {
    id: 'inventory_yield_cogs',
    category: 'inventory',
    title: 'Quản lý kho hàng, Tỷ lệ hao hụt & Cảnh báo giá vọt',
    icon: 'scale-balance',
    badge: 'Chủ Quán',
    scenario: 'Kiểm soát số lượng tồn kho nguyên vật liệu, tính tỷ lệ hao hụt chế biến và phát hiện sớm giá nhà cung cấp tăng.',
    steps: [
      'Vào menu "Kho Hàng" (/kho-hang) để theo dõi danh mục nguyên liệu (Hạt cà phê, Sữa đặc, Trà, Siro...).',
      'Nhập kho nguyên liệu mới: Chọn mặt hàng, nhập số lượng và đơn giá nhập thực tế từ hóa đơn nhà cung cấp.',
      'Thiết lập tỷ lệ hao hụt (Yield Rate): Ví dụ hạt cà phê hao hụt 10% khi xay -> Hệ thống tự động tính Giá vốn thực tế (Effective COGS).',
      'Hệ thống tự động phát hiện và cảnh báo màu đỏ khi giá nhập tăng vọt >15% so với lần nhập trước.',
    ],
    tips: [
      'Kiểm soát chặt chẽ giá vốn COGS giúp chủ quán kịp thời điều chỉnh giá bán hoặc tìm nhà cung cấp thay thế trước khi bị thâm hụt lợi nhuận.',
    ],
    actionRoute: '/kho-hang',
    actionLabel: 'Mở Màn Hình Kho Hàng',
  },

  // 10. BÁO CÁO DOANH THU & LỢI NHUẬN (REPORTS)
  {
    id: 'reports_golden_numbers',
    category: 'reports',
    title: 'Báo cáo 3 con số vàng lợi nhuận thực tế',
    icon: 'chart-box-outline',
    badge: 'Vị Chủ Quán',
    scenario: 'Cuối ngày chủ tiệm muốn biết chính xác mình bỏ túi bao nhiêu tiền lãi, không cần báo cáo kế toán phức tạp.',
    steps: [
      'Mở tab "Báo Cáo" trên menu chính.',
      'Xem 3 Con Số Vàng tức thời:',
      '1. Tiền mặt trong két thực tế = Tiền bán hàng - Các khoản chi chợ trong ngày.',
      '2. Tiền trong tài khoản VietQR = Toàn bộ tiền khách đã quét mã chuyển khoản.',
      '3. Lợi nhuận ròng bỏ túi = Doanh thu thuần - Giá vốn nguyên liệu (COGS) - Chi phí vận hành.',
    ],
    actionRoute: '/bao-cao-loi-nhuan',
    actionLabel: 'Mở Báo Cáo Lợi Nhuận',
  },
  {
    id: 'reports_filtering_analytics',
    category: 'reports',
    title: 'Bóc tách báo cáo tài chính & Top 5 món bán chạy',
    icon: 'chart-timeline-variant',
    badge: 'Chủ Quán',
    scenario: 'Xem phân tích doanh thu theo các mốc thời gian linh hoạt để ra quyết định kinh doanh.',
    steps: [
      'Vào menu "Báo Cáo" (/bao-cao-loi-nhuan).',
      'Chọn mốc thời gian phân tích: "Hôm Nay", "7 Ngày Qua", "Tháng Này" hoặc chọn khoảng ngày tùy chỉnh.',
      'Xem biểu đồ doanh thu theo giờ để nắm bắt khung giờ cao điểm trong ngày.',
      'Kiểm tra danh sách "Top 5 Sản Phẩm Bán Chạy Nhất" về cả số lượng bán ra và tổng doanh thu đóng góp.',
    ],
    tips: [
      'Chủ quán nên đối chiếu tỷ lệ chi phí nguyên liệu / tổng doanh thu. Tỷ lệ vàng trong ngành F&B là 28% - 35%.',
    ],
    actionRoute: '/bao-cao-loi-nhuan',
    actionLabel: 'Mở Báo Cáo Lợi Nhuận',
  },

  // 11. CÀI ĐẶT QUÁN & BẢO MẬT (SETTINGS)
  {
    id: 'store_bill_branding',
    category: 'settings',
    title: 'Tùy biến thương hiệu & Hóa đơn in nhiệt K80 / K58',
    icon: 'store-cog-outline',
    badge: 'Chủ Quán',
    scenario: 'Cài đặt tên quán, slogan, địa chỉ, mật khẩu WiFi và định dạng hóa đơn in nhiệt chuyên nghiệp.',
    steps: [
      'Vào menu "Cài Đặt" (/cai-dat) -> Tab "Thông Tin Quán".',
      'Cập nhật: Tên cửa hàng, Slogan, Địa chỉ, Hotline, Tên mạng WiFi và Mật khẩu WiFi (sẽ in trực tiếp lên bill cho khách xem).',
      'Chuyển sang Tab "Mẫu In Bill": Chọn khổ giấy K80 (80mm) hoặc K58 (58mm).',
      'Bật/tắt các trường tùy chọn: In tên thu ngân, In giờ vào/giờ ra, In mật khẩu WiFi, In lời cảm ơn ở chân bill.',
      'Xem trước mẫu hóa đơn trực tiếp (Live Bill Preview) ngay trên màn hình trước khi lưu.',
    ],
    actionRoute: '/cai-dat',
    actionLabel: 'Mở Cài Đặt Mẫu In Bill',
  },
  {
    id: 'security_pin_telegram',
    category: 'settings',
    title: 'Khóa bảo mật, Đổi mã PIN & Bot Telegram chống gian lận',
    icon: 'shield-lock-outline',
    badge: 'Chủ Quán',
    scenario: 'Bảo vệ doanh thu quán khỏi thất thoát, ngăn nhân viên gian lận và nhận thông báo khẩn cấp về điện thoại.',
    steps: [
      'Vào menu "Cài Đặt" (/cai-dat) -> Tab "Vận Hành & Bảo Mật".',
      'Đổi Mã PIN Quản Trị Chủ Quán (mặc định: 9999) thành mã 4 số bí mật của riêng bạn.',
      'Kích hoạt công tắc "Khóa Hủy Món Sau Khi Gửi Bếp": Nhân viên bắt buộc phải có PIN quản lý mới hủy được món.',
      'Cài đặt ngưỡng cảnh báo chiết khấu cao: Nhập % chiết khấu tối đa nhân viên được phép áp dụng (khuyên dùng: 10% - 20%).',
      'Cấu hình Telegram Bot: Nhập Token Bot và Chat ID cá nhân -> Bấm "Gửi Tin Nhắn Thử Nghiệm".',
    ],
    warning: 'Tuyệt đối không chia sẻ mã PIN Chủ Quán cho nhân viên ca. Hãy cấp mã PIN riêng cho từng nhân sự tại màn hình Quản Lý Nhân Sự.',
    actionRoute: '/cai-dat',
    actionLabel: 'Mở Cài Đặt Bảo Mật',
  },
  {
    id: 'kiosk_pin_login',
    category: 'settings',
    title: 'Đăng nhập Kiosk PIN Pad 4 số & Chuyển ca nhân viên',
    icon: 'dialpad',
    badge: 'Bảo Mật',
    scenario: 'Nhân viên đổi ca làm việc hoặc rời quầy thu ngân cần khóa màn hình nhanh chóng.',
    steps: [
      'Tại màn hình khóa PIN Pad Kiosk, nhân viên nhập mã PIN 4 số cá nhân được cấp.',
      'Hệ thống tự động nhận diện tên nhân viên, phân quyền hạn và ghi nhận thời điểm bắt đầu ca.',
      'Khi rời quầy hoặc đổi ca: Chạm vào biểu tượng ổ khóa hoặc Tên nhân viên trên thanh Header để khóa màn hình trong 0.1s.',
      'Nhân viên ca sau nhập mã PIN của mình để tiếp tục bán hàng mà không cần đăng nhập lại từ đầu.',
    ],
    tips: [
      'Chủ quán có thể kiểm tra lịch sử thao tác của từng nhân viên qua Nhật ký kiểm toán (Audit Logs).',
    ],
    actionRoute: '/cai-dat',
    actionLabel: 'Mở Cài Đặt Nhân Sự',
  },
  {
    id: 'branch_multi_store',
    category: 'settings',
    title: 'Quản lý chuỗi đa chi nhánh cho chủ quán',
    icon: 'storefront-outline',
    badge: 'Chủ Chuỗi',
    scenario: 'Chủ quán sở hữu từ 2 cơ sở trở lên cần theo dõi doanh thu tổng và chuyển đổi quản lý nhanh.',
    steps: [
      'Vào menu "Cài Đặt" (/cai-dat) -> Chọn mục "Quản Lý Chi Nhánh".',
      'Xem danh sách toàn bộ các chi nhánh cùng trạng thái hoạt động và doanh số trong ngày.',
      'Chạm 1-chạm vào chi nhánh mong muốn để chuyển đổi góc nhìn báo cáo tức thời mà không cần đăng xuất.',
      'Đồng bộ thực đơn chuỗi: Chọn "Áp dụng thực đơn chung" để cập nhật món và giá cho tất cả chi nhánh cùng lúc.',
    ],
    tips: [
      'Báo cáo tổng hợp chuỗi tự động cộng dồn doanh thu, tiền mặt két và ngân hàng của tất cả chi nhánh.',
    ],
    actionRoute: '/cai-dat',
    actionLabel: 'Mở Cài Đặt Chi Nhánh',
  },

  // 12. PHẦN CỨNG & MÁY IN (HARDWARE)
  {
    id: 'hardware_printer_setup',
    category: 'hardware',
    title: 'Cài đặt máy in hóa đơn K80 & máy in tem dán ly',
    icon: 'printer',
    badge: 'TCP 9100',
    scenario: 'Kết nối máy in nhiệt qua mạng WiFi/LAN không cần cài đặt driver Windows rườm rà.',
    steps: [
      'Cắm dây mạng LAN từ máy in vào modem WiFi quán.',
      'Tắt máy in, giữ nút FEED và bật nguồn để in giấy kiểm tra (Self-test) lấy địa chỉ IP (VD: 192.168.1.200).',
      'Vào Cài Đặt trên POS -> Mẫu In Bill -> Nhập IP máy in và cổng 9100.',
      'Bấm "In Thử Bill": Máy in lập tức in hóa đơn thử nghiệm và kích mở két tiền.',
      'Cài máy in tem ly: Nhập IP máy in tem, chọn khổ 50x30mm, bấm "In Thử Tem".',
    ],
    actionRoute: '/cai-dat',
    actionLabel: 'Cấu Hình Máy In',
  },
  {
    id: 'cup_sticker_printer',
    category: 'hardware',
    title: 'Cài đặt máy in tem dán ly 50x30mm trà sữa / cà phê',
    icon: 'label-outline',
    badge: 'Phần Cứng',
    scenario: 'In nhãn decal tự dính dán lên ly đồ uống hiển thị tên món, size, đường, đá, topping cho quầy pha chế.',
    steps: [
      'Kết nối máy in nhãn mã vạch (TSPL barcode/label printer) qua mạng LAN hoặc WiFi.',
      'Vào menu "Cài Đặt" (/cai-dat) -> Tab "Mẫu In Bill".',
      'Nhập Địa chỉ IP máy in tem ly (Ví dụ: 192.168.1.201) và cổng TCP 9100.',
      'Khổ tem dán ly chuẩn: Chọn kích thước 50mm x 30mm.',
      'Bấm "In Thử Tem Ly": Máy in nhãn in ra tem mẫu có đầy đủ Tên món, Size, % Đường, % Đá, Topping và Số thứ tự ly.',
    ],
    tips: [
      'Khi khách order nhiều ly cùng 1 món (ví dụ 3 Trà sữa), hệ thống tự động tách thành 3 tem riêng biệt (Ly 1/3, Ly 2/3, Ly 3/3).',
    ],
    actionRoute: '/cai-dat',
    actionLabel: 'Cấu Hình Máy In Tem Ly',
  },
  {
    id: 'cfd_setup_operation',
    category: 'hardware',
    title: 'Màn hình phụ đối diện khách hàng (CFD)',
    icon: 'monitor-dashboard',
    badge: 'Chống Gian Lận',
    scenario: 'Kết nối máy tính bảng hoặc màn hình thứ 2 quay ra ngoài cho khách xem đơn và quét VietQR.',
    steps: [
      'Cài đặt ứng dụng OngChu POS trên máy tính bảng thứ 2 đặt tại quầy đối diện khách hàng.',
      'Truy cập đường dẫn "/cfd" trên thiết bị phụ này.',
      'Nhập mã kết nối hoặc quét QR để ghép đôi thiết bị phụ với máy POS chính của thu ngân qua mạng nội bộ quán.',
      'Khi thu ngân chọn món: Màn hình CFD tức thời hiển thị từng món, topping, giá tiền cho khách kiểm tra.',
      'Khi bấm Thanh Toán: CFD tự động hiển thị mã VietQR động kèm số tiền cần quét.',
    ],
    tips: [
      'Màn hình CFD giúp tăng độ minh bạch, khách kiểm tra món trực tiếp giảm tối đa khiếu nại sai món.',
    ],
    actionRoute: '/cfd',
    actionLabel: 'Mở Màn Hình CFD',
  },

  // 13. XỬ LÝ SỰ CỐ KHẨN CẤP (TROUBLESHOOT)
  {
    id: 'troubleshoot_lost_internet',
    category: 'troubleshoot',
    title: 'Mất mạng Internet - Bán hàng Ngoại tuyến 100%',
    icon: 'wifi-off',
    badge: 'Cực Kỳ Quan Trọng',
    scenario: 'Đường truyền cáp quang của quán bị đứt hoặc mất kết nối Internet giờ cao điểm.',
    steps: [
      'Hệ thống tự động chuyển sang chế độ Ngoại tuyến mà không làm gián đoạn bán hàng.',
      'Nhân viên vẫn chọn món, in hóa đơn nhiệt qua mạng nội bộ LAN, kích mở két tiền bình thường.',
      'Khách vẫn có thể quét mã VietQR tĩnh của quán.',
      'Toàn bộ hóa đơn được lưu an toàn trong bộ nhớ máy; khi có mạng trở lại hệ thống tự động đồng bộ lên máy chủ.',
    ],
  },
  {
    id: 'troubleshoot_printer_jam',
    category: 'troubleshoot',
    title: 'Máy in kẹt giấy hoặc không in ra chữ',
    icon: 'printer-alert',
    badge: 'Xử Lý Nhanh',
    scenario: 'Đang in bill thì máy kêu tít tít hoặc giấy in ra bị trắng tinh không có chữ.',
    steps: [
      'Giấy in ra trắng tinh: Cuộn giấy bị đặt ngược mặt nhiệt. Mở nắp máy in, lật ngược cuộn giấy lại.',
      'Máy in kêu tít tít liên tục: Máy đang hết giấy hoặc nắp máy in chưa đóng chặt. Thay cuộn giấy mới K80/K58 và ấn chặt nắp.',
      'Kẹt giấy dao cắt: Tắt công tắc nguồn máy in, mở nắp gạt bánh răng dao cắt để dao thu về, lấy giấy kẹt ra rồi bật lại nguồn.',
    ],
  },
  {
    id: 'offline_sync_engine',
    category: 'troubleshoot',
    title: 'Tự động đồng bộ khi có mạng trở lại',
    icon: 'cloud-sync',
    badge: 'An Toàn Dữ Liệu',
    scenario: 'Sau thời gian mất mạng hoặc máy tính sập nguồn đột ngột, đảm bảo dữ liệu không bị thất thoát.',
    steps: [
      'Mọi đơn hàng, hóa đơn và dòng tiền chi chợ khi mất mạng đều được lưu an toàn vào bộ nhớ an toàn của máy.',
      'Biểu tượng đám mây trên thanh tiêu đề sẽ hiển thị trạng thái màu cam: "Đang lưu chờ mạng (N đơn)".',
      'Ngay khi phát hiện có kết nối mạng Internet trở lại, hệ thống chạy tiến trình ngầm tự động đẩy toàn bộ đơn lên máy chủ.',
      'Biểu tượng đám mây chuyển sang màu xanh: "Đã đồng bộ 100%".',
    ],
    tips: [
      'Chủ quán có thể bấm nút "Đồng Bộ Ngay" trong Cài Đặt để chủ động nạp dữ liệu mới nhất.',
    ],
    actionRoute: '/cai-dat',
    actionLabel: 'Kiểm Tra Trạng Thái Đồng Bộ',
  },
  {
    id: 'pay_transfer_dispute',
    category: 'troubleshoot',
    title: 'Khách quét QR báo thành công nhưng quán chưa nhận được tiền',
    icon: 'bank-transfer',
    badge: 'Chống Gian Lận',
    scenario: 'Khách giơ màn hình điện thoại đã chuyển khoản thành công nhưng điện thoại chủ quán chưa báo tiền vào.',
    steps: [
      'Kiểm tra Mã Tham Chiếu / Mã Giao Dịch trên màn hình của khách: Đúng Tên chủ quán, Số tài khoản và Số tiền.',
      'Đặc biệt cảnh giác với chiêu trò "ảnh chụp màn hình chuyển khoản giả mạo" hoặc app tạo bill chuyển tiền giả.',
      'Nhân viên kiểm tra trực tiếp trên màn hình POS: Nếu hệ thống đã tích hợp Webhook ngân hàng tự động, chỉ tin tưởng khi màn hình POS tự động báo xanh "Đã Nhận Tiền" và tự in bill.',
      'Nếu do nghẽn mạng ngân hàng: Lịch sự xin lại Số điện thoại của khách, chụp lại mã giao dịch ngân hàng của khách và lưu hóa đơn ở trạng thái "Chờ nổ tiền".',
    ],
    warning: 'Tuyệt đối không để khách rời đi chỉ dựa vào hình ảnh chuyển khoản trên điện thoại khách nếu không có thông báo ngân hàng xác nhận hoặc số điện thoại liên hệ.',
  },
];

function GuideDetailContent({
  guide,
  theme,
  insets,
  activeVisualStepIdx,
  onSelectVisualStep,
  onActionPress,
  isWide,
}: {
  guide: GuideSection;
  theme: any;
  insets: any;
  activeVisualStepIdx: number;
  onSelectVisualStep: (idx: number) => void;
  onActionPress?: () => void;
  isWide?: boolean;
}) {
  const catLabel = GUIDE_CATEGORIES.find((c) => c.id === guide.category)?.label || 'Hướng Dẫn';
  const activeVisual = guide.visualSteps
    ? guide.visualSteps[activeVisualStepIdx] || guide.visualSteps[0]
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface.app }}>
      <ScrollView
        style={s.listContainer}
        contentContainerStyle={[
          s.detailContent,
          { paddingBottom: Math.max(insets.bottom, 24) + (guide.actionRoute ? 80 : 32) },
          isWide && s.wideDetailInner,
        ]}
      >
        {/* Tiêu đề & chuyên mục trên Desktop */}
        {isWide && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {guide.badge && (
                <View style={[s.badgePill, { backgroundColor: theme.status.warningBg }]}>
                  <AppText variant="xxs" weight="bold" color={theme.brand.accent}>
                    {guide.badge}
                  </AppText>
                </View>
              )}
              <AppText variant="xs" color={theme.text.muted}>
                Chuyên mục: {catLabel}
              </AppText>
            </View>
            <AppText variant="lg" weight="bold" color={theme.text.primary}>
              {guide.title}
            </AppText>
          </View>
        )}

        {/* Ngữ cảnh áp dụng */}
        <View style={[s.scenarioBox, { borderBottomColor: theme.border.subtle }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {!isWide && guide.badge && (
              <View style={[s.badgePill, { backgroundColor: theme.status.warningBg }]}>
                <AppText variant="xxs" weight="bold" color={theme.brand.accent}>
                  {guide.badge}
                </AppText>
              </View>
            )}
            <AppText variant="xs" color={theme.text.muted}>
              Ngữ cảnh vận hành
            </AppText>
          </View>
          <AppText variant="md" color={theme.text.primary}>
            {guide.scenario}
          </AppText>
        </View>

        {/* Minh họa trực quan nếu có */}
        {guide.visualSteps && guide.visualSteps.length > 0 && activeVisual && (
          <View style={s.visualContainer}>
            <View style={[s.stepSelectorRow, { borderBottomColor: theme.border.subtle }]}>
              {guide.visualSteps.map((vStep, vIdx) => {
                const isStepActive = vIdx === activeVisualStepIdx;
                return (
                  <TouchableOpacity
                    key={vStep.step}
                    activeOpacity={0.7}
                    onPress={() => onSelectVisualStep(vIdx)}
                    style={[
                      s.visualStepTab,
                      isStepActive && { borderBottomColor: theme.brand.accent, borderBottomWidth: 2 },
                    ]}
                  >
                    <AppText
                      variant="sm"
                      weight={isStepActive ? 'bold' : 'normal'}
                      color={isStepActive ? theme.brand.accent : theme.text.muted}
                      tabularNums
                    >
                      {`Bước ${vStep.step}`}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[s.visualCard, { borderColor: theme.border.subtle }]}>
              <View style={[s.visualImageWrap, { backgroundColor: theme.surface.app }]}>
                <Image
                  source={activeVisual.image}
                  style={s.visualImage}
                  resizeMode="contain"
                />
              </View>
              <View style={[s.visualCaption, { backgroundColor: theme.surface.header, borderTopColor: theme.border.subtle }]}>
                <AppText variant="sm" weight="bold" color={theme.brand.accent}>
                  {activeVisual.title}
                </AppText>
              </View>
            </View>
          </View>
        )}

        {/* Các bước thực hiện */}
        <AppText
          variant="xs"
          weight="bold"
          color={theme.text.muted}
          style={{ marginBottom: 12, marginTop: guide.visualSteps ? 16 : 8, textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          Các bước thực hiện
        </AppText>
        {guide.steps.map((step, idx) => (
          <View key={idx} style={s.stepRow}>
            <View style={[s.stepNumberBadge, { backgroundColor: theme.brand.accent }]}>
              <AppText variant="xxs" weight="bold" color={theme.text.onBrand} tabularNums>
                {idx + 1}
              </AppText>
            </View>
            <AppText variant="md" color={theme.text.primary} style={{ flex: 1 }}>
              {step}
            </AppText>
          </View>
        ))}

        {/* Mẹo thực chiến */}
        {guide.tips && guide.tips.length > 0 && (
          <View style={[s.tipsBox, { borderLeftColor: theme.brand.accent, backgroundColor: theme.status.warningBg, padding: 12, borderRadius: 6 }]}>
            <AppText variant="xs" weight="bold" color={theme.brand.accent} style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Mẹo Vị Chủ Quán
            </AppText>
            {guide.tips.map((tip, idx) => (
              <AppText key={idx} variant="sm" color={theme.text.primary} style={{ marginTop: 4 }}>
                • {tip}
              </AppText>
            ))}
          </View>
        )}

        {/* Cảnh báo an ninh */}
        {guide.warning && (
          <View style={[s.warningBox, { borderLeftColor: theme.brand.danger, backgroundColor: theme.status.dangerBg, padding: 12, borderRadius: 6 }]}>
            <AppText variant="xs" weight="bold" color={theme.brand.danger} style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Lưu Ý An Ninh
            </AppText>
            <AppText variant="sm" color={theme.brand.danger}>
              {guide.warning}
            </AppText>
          </View>
        )}
      </ScrollView>

      {/* Thanh tác vụ cố định đáy (Docked Bottom Action Bar) */}
      {guide.actionRoute && (
        <View
          style={[
            s.bottomDockBar,
            {
              backgroundColor: theme.surface.card,
              borderTopColor: theme.border.subtle,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={[s.bottomDockContent, isWide && s.wideDetailInner]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onActionPress}
              style={[
                s.actionBtn,
                { backgroundColor: theme.brand.accent, borderColor: theme.brand.accent },
              ]}
            >
              <AppText variant="md" weight="bold" color={theme.text.onBrand}>
                {guide.actionLabel || 'Thực Hành Ngay'}
              </AppText>
              <Icon name="arrow-right" size={18} color={theme.text.onBrand} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function UserGuideScreen() {
  const { theme } = useTheme();
  const { isWide } = useResponsive();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [activeVisualSteps, setActiveVisualSteps] = useState<Record<string, number>>({});

  // BackHandler for Android physical back button
  useEffect(() => {
    if (!selectedGuideId) return;
    const onBackPress = () => {
      setSelectedGuideId(null);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [selectedGuideId]);

  const filteredGuides = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return GUIDE_DATA.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCat) return false;
      if (!q) return true;

      return (
        item.title.toLowerCase().includes(q) ||
        item.scenario.toLowerCase().includes(q) ||
        item.steps.some((step) => step.toLowerCase().includes(q)) ||
        (item.tips && item.tips.some((tip) => tip.toLowerCase().includes(q)))
      );
    });
  }, [searchQuery, selectedCategory]);

  const selectedGuide = useMemo(() => {
    if (!selectedGuideId) return null;
    return GUIDE_DATA.find((g) => g.id === selectedGuideId) || null;
  }, [selectedGuideId]);

  // Active guide trên màn Desktop (mặc định lấy món đầu nếu chưa chọn)
  const activeDesktopGuide = useMemo(() => {
    if (selectedGuide) return selectedGuide;
    if (filteredGuides.length > 0) return filteredGuides[0];
    return null;
  }, [selectedGuide, filteredGuides]);

  // 1. Phân nhánh Mobile: Inline Sub-Screen khi chạm vào 1 bài hướng dẫn (Zero-Modal Invariant)
  if (!isWide && selectedGuide) {
    const catLabel = GUIDE_CATEGORIES.find((c) => c.id === selectedGuide.category)?.label || 'Hướng Dẫn';
    const curStepIdx = activeVisualSteps[selectedGuide.id] ?? 0;

    return (
      <View style={[s.container, { backgroundColor: theme.surface.app }]}>
        <AppHeader
          showBack
          onBack={() => {
            playTapSound();
            setSelectedGuideId(null);
          }}
          title={selectedGuide.title}
          subtitle={`Chuyên mục: ${catLabel}`}
        />
        <GuideDetailContent
          guide={selectedGuide}
          theme={theme}
          insets={insets}
          activeVisualStepIdx={curStepIdx}
          onSelectVisualStep={(idx) => {
            playTapSound();
            setActiveVisualSteps((prev) => ({ ...prev, [selectedGuide.id]: idx }));
          }}
          onActionPress={() => {
            playTapSound();
            if (selectedGuide.actionRoute) {
              router.push(selectedGuide.actionRoute as any);
            }
          }}
          isWide={false}
        />
      </View>
    );
  }

  // 2. Màn hình chính: Master-Detail trên Desktop / Danh sách trên Mobile
  const currentDetailGuide = isWide ? activeDesktopGuide : null;
  const desktopCurStepIdx = currentDetailGuide ? (activeVisualSteps[currentDetailGuide.id] ?? 0) : 0;

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* 1. Header chuẩn toàn hệ thống */}
      <AppHeader
        showBack
        title="Hướng Dẫn Sử Dụng"
        subtitle="Cẩm Nang Vận Hành POS Thực Chiến Vị Chủ Quán"
      />

      {/* 2. Thân nội dung: Master-Detail trên Desktop (isWide), 1 cột trên Mobile */}
      <View style={{ flex: 1, flexDirection: isWide ? 'row' : 'column' }}>
        {/* Cột Danh Sách (Master) */}
        <View
          style={[
            isWide
              ? {
                  width: 440,
                  borderRightWidth: StyleSheet.hairlineWidth,
                  borderRightColor: theme.border.subtle,
                  backgroundColor: theme.surface.card,
                }
              : { flex: 1 },
          ]}
        >
          {/* Thanh tìm kiếm & Tabs chuyên mục */}
          <View style={[s.searchWrap, { backgroundColor: theme.surface.card, borderBottomColor: theme.border.subtle }]}>
            <View style={[s.searchBar, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
              <Icon name="magnify" size={18} color={theme.text.muted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Tìm kiếm hướng dẫn vận hành..."
                placeholderTextColor={theme.text.muted}
                style={[s.searchInput, { color: theme.text.primary }]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="close-circle" size={16} color={theme.text.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Dải Tabs phân loại nghiệp vụ phẳng, chuẩn Tier 1 */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.categoryScroll}
            >
              {GUIDE_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      playTapSound();
                      setSelectedCategory(cat.id);
                    }}
                    style={[
                      s.categoryTab,
                      isActive && { borderBottomColor: theme.brand.accent, borderBottomWidth: 3 },
                    ]}
                  >
                    <AppText
                      variant="md"
                      weight={isActive ? 'bold' : 'normal'}
                      color={isActive ? theme.brand.accent : theme.text.muted}
                    >
                      {cat.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Danh sách hướng dẫn */}
          <ScrollView
            style={s.listContainer}
            contentContainerStyle={[
              s.listContent,
              { paddingBottom: Math.max(insets.bottom, 24) + 40 },
            ]}
          >
            {filteredGuides.length === 0 ? (
              <View style={s.emptyWrap}>
                <AppText variant="md" weight="bold" color={theme.text.primary}>
                  Không tìm thấy hướng dẫn phù hợp
                </AppText>
                <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 4 }}>
                  Thử tìm kiếm với từ khóa khác như "in bill", "chuyển bàn", "giao ca"
                </AppText>
              </View>
            ) : (
              filteredGuides.map((guide) => {
                const isSelectedOnWide = isWide && activeDesktopGuide?.id === guide.id;
                return (
                  <TouchableOpacity
                    key={guide.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      if (Platform.OS !== 'web') {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch {}
                      }
                      setSelectedGuideId(guide.id);
                    }}
                    style={[
                      s.guideRow,
                      {
                        borderBottomColor: theme.border.subtle,
                        backgroundColor: isSelectedOnWide ? theme.status.warningBg : theme.surface.card,
                        borderLeftWidth: isSelectedOnWide ? 4 : 0,
                        borderLeftColor: theme.brand.accent,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <AppText
                          variant="md"
                          weight={isSelectedOnWide ? 'bold' : 'medium'}
                          color={isSelectedOnWide ? theme.brand.accent : theme.text.primary}
                          style={{ flex: 1 }}
                        >
                          {guide.title}
                        </AppText>
                        {guide.badge && (
                          <View style={[s.badgePill, { backgroundColor: isSelectedOnWide ? theme.brand.accent : theme.status.warningBg }]}>
                            <AppText
                              variant="xxs"
                              weight="bold"
                              color={isSelectedOnWide ? theme.text.onBrand : theme.brand.accent}
                            >
                              {guide.badge}
                            </AppText>
                          </View>
                        )}
                      </View>
                      <AppText variant="xs" color={theme.text.muted} numberOfLines={2} style={{ marginTop: 4 }}>
                        {guide.scenario}
                      </AppText>
                    </View>

                    <Icon
                      name="chevron-right"
                      size={20}
                      color={isSelectedOnWide ? theme.brand.accent : theme.text.muted}
                      style={{ marginLeft: 8 }}
                    />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Cột Chi Tiết (Detail) trên Desktop */}
        {isWide && (
          <View style={{ flex: 1, backgroundColor: theme.surface.app }}>
            {currentDetailGuide ? (
              <GuideDetailContent
                guide={currentDetailGuide}
                theme={theme}
                insets={insets}
                activeVisualStepIdx={desktopCurStepIdx}
                onSelectVisualStep={(idx) => {
                  playTapSound();
                  setActiveVisualSteps((prev) => ({ ...prev, [currentDetailGuide.id]: idx }));
                }}
                onActionPress={() => {
                  playTapSound();
                  if (currentDetailGuide.actionRoute) {
                    router.push(currentDetailGuide.actionRoute as any);
                  }
                }}
                isWide={true}
              />
            ) : (
              <View style={[s.emptyWrap, { flex: 1, justifyContent: 'center' }]}>
                <Icon name="book-open-outline" size={48} color={theme.text.muted} style={{ marginBottom: 12 }} />
                <AppText variant="md" weight="bold" color={theme.text.primary}>
                  Chọn bài hướng dẫn để xem chi tiết
                </AppText>
                <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 4 }}>
                  Cẩm nang hướng dẫn vận hành chi tiết các nghiệp vụ POS thực chiến
                </AppText>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    height: 42,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    includeFontPadding: false,
  },
  categoryScroll: {
    gap: 20,
    paddingRight: 16,
    marginTop: 8,
  },
  categoryTab: {
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  detailContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  wideDetailInner: {
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scenarioBox: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  visualContainer: {
    marginBottom: 16,
  },
  stepSelectorRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  visualStepTab: {
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  visualCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    overflow: 'hidden',
  },
  visualImageWrap: {
    width: '100%',
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualImage: {
    width: '100%',
    height: '100%',
  },
  visualCaption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  stepNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  tipsBox: {
    marginTop: 14,
    borderLeftWidth: 3,
  },
  warningBox: {
    marginTop: 14,
    borderLeftWidth: 3,
  },
  bottomDockBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  bottomDockContent: {
    width: '100%',
  },
  actionBtn: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
  },
});
