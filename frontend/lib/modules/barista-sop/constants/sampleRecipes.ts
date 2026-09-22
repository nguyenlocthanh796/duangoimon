import { RecipeBookItem } from '../types';

export const SAMPLE_RECIPES: RecipeBookItem[] = [
  // ==========================================
  // 1. NHÓM TRÀ TRÁI CÂY (FRUIT TEAS)
  // ==========================================
  {
    id: 'rec_tra_chanh_hoa_nhai',
    productId: 'p_tc_nhai',
    productName: 'Trà Chanh Hoa Nhài Truyền Thống',
    category: 'Trà Trái Cây',
    sellingPrice: 22000,
    prepTimeMinutes: 2,
    difficulty: 'easy',
    description: 'Hương thơm thanh tao từ cốt trà xanh hoa lài ủ lạnh, kết hợp vị chua thanh tươi mát của chanh tươi và ngọt dịu của đường vàng.',
    tags: ['Best Seller', 'Giải Nhiệt', 'Truyền Thống'],
    variants: [
      {
        sizeName: 'Size Vừa (M)',
        ingredients: [
          { ingredientId: 'ing_tra_lai', ingredientName: 'Cốt Trà Xanh Hoa Lài', quantity: 150, unit: 'ml', costPrice: 12 },
          { ingredientId: 'ing_nuoc_duong', ingredientName: 'Nước Đường Vàng', quantity: 25, unit: 'ml', costPrice: 20 },
          { ingredientId: 'ing_chanh_tuoi', ingredientName: 'Nước Cốt Chanh Tươi', quantity: 15, unit: 'ml', costPrice: 60 },
          { ingredientId: 'ing_lat_chanh', ingredientName: 'Chanh Lát Tươi Decor', quantity: 2, unit: 'lát', costPrice: 300 },
        ],
      },
      {
        sizeName: 'Size Lớn (L)',
        ingredients: [
          { ingredientId: 'ing_tra_lai', ingredientName: 'Cốt Trà Xanh Hoa Lài', quantity: 200, unit: 'ml', costPrice: 12 },
          { ingredientId: 'ing_nuoc_duong', ingredientName: 'Nước Đường Vàng', quantity: 35, unit: 'ml', costPrice: 20 },
          { ingredientId: 'ing_chanh_tuoi', ingredientName: 'Nước Cốt Chanh Tươi', quantity: 22, unit: 'ml', costPrice: 60 },
          { ingredientId: 'ing_lat_chanh', ingredientName: 'Chanh Lát Tươi Decor', quantity: 3, unit: 'lát', costPrice: 300 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Đong cốt trà & vắt chanh',
        description: 'Đong 150ml cốt trà lài, 25ml nước đường và 15ml nước cốt chanh vào bình shaker.',
        durationSeconds: 15,
        temperature: 'Mát 15°C',
        tip: 'Lọc bỏ hạt chanh tuyệt đối để nước trà không bị đắng chát sau 15 phút.',
      },
      {
        stepNumber: 2,
        title: 'Thêm đá & Lắc đều (Shake)',
        description: 'Xúc đá bi đầy 2/3 bình shaker, lắc nhanh 10-12 lần tạo bọt mỏng.',
        durationSeconds: 15,
      },
      {
        stepNumber: 3,
        title: 'Rót ra ly & Trang trí',
        description: 'Rót hỗn hợp ra ly, gắp 2 lát chanh tươi thả trên mặt đá và cắm ống hút.',
        durationSeconds: 10,
        tip: 'Dùng kẹp gắp decor chanh chuyên dụng giữ vệ sinh chuẩn 5 sao.',
      },
    ],
    batchFormulas: [
      {
        id: 'bf_tra_lai_5l',
        batchName: 'Ủ bình Cốt Trà Xanh Lài 5 Lít (Ủ Sẵn Đầu Ca)',
        yieldServings: 35,
        teaType: 'Trà Xanh Hoa Lài Lộc Phát (Loại 1)',
        teaQuantityGrams: 120,
        waterVolumeMl: 5000,
        waterTempCelsius: 85,
        brewTimeSeconds: 600,
        iceShockGrams: 800,
        shelfLifeHours: 4,
        ingredients: [
          { ingredientName: 'Trà Xanh Lài Thượng Hạng', quantity: 120, unit: 'g' },
          { ingredientName: 'Nước Sôi 85°C', quantity: 5000, unit: 'ml' },
          { ingredientName: 'Đá Bi Sốc Nhiệt', quantity: 800, unit: 'g' },
        ],
        instructions: [
          'Đun sôi 5L nước, để hạ nhiệt độ còn 85°C.',
          'Đổ 120g trà lài vào túi ủ, đậy kín nắp ủ đúng 10 phút.',
          'Hết giờ lấy túi trà ra, thả ngay 800g đá bi làm lạnh sốc (Shocking cold) để khóa trọn hương hoa nhài.',
          'Rót vào bình giữ nhiệt, in tem dán thời hạn dùng trong 4 tiếng.',
        ],
      },
    ],
  },
  {
    id: 'rec_tra_chanh_gia_tay',
    productId: 'p_tc_giatay',
    productName: 'Trà Chanh Giã Tay Quảng Đông',
    category: 'Trà Trái Cây',
    sellingPrice: 32000,
    prepTimeMinutes: 3,
    difficulty: 'medium',
    description: 'Chanh nước hoa Quảng Đông cùi dày thơm nức được giã tay cùng đá viên chiết xuất tinh dầu, hòa cùng cốt trà Oolong nướng đậm đà.',
    tags: ['Hot Trend', 'Chanh Quảng Đông', 'Signature'],
    variants: [
      {
        sizeName: 'Size Lớn (L)',
        ingredients: [
          { ingredientId: 'ing_tra_oolong', ingredientName: 'Cốt Trà Oolong Nướng', quantity: 180, unit: 'ml', costPrice: 18 },
          { ingredientId: 'ing_chanh_nuoc_hoa', ingredientName: 'Chanh Nước Hoa Thái Lát', quantity: 4, unit: 'lát', costPrice: 1500 },
          { ingredientId: 'ing_nuoc_duong', ingredientName: 'Nước Đường Vàng', quantity: 35, unit: 'ml', costPrice: 20 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Giã tay chanh nước hoa với đá',
        description: 'Cho 4 lát chanh nước hoa dày 4mm và 3-4 viên đá vào cối giã. Dùng chày giã mạnh 15-20 lần đến khi bật dậy hương tinh dầu thơm ngát.',
        durationSeconds: 25,
        tip: 'Phải giã chung với đá viên để tinh dầu hòa tan vào nước mà không bị đắng vỏ.',
      },
      {
        stepNumber: 2,
        title: 'Thêm cốt trà Oolong & Nước đường',
        description: 'Đổ 180ml cốt trà Oolong nướng và 35ml nước đường vào cối giã.',
        durationSeconds: 15,
      },
      {
        stepNumber: 3,
        title: 'Lắc đều & Rót ra ly',
        description: 'Đổ toàn bộ hỗn hợp vào bình shaker cùng đá bi, lắc mạnh 10 lần rồi rót ra ly kèm các lát chanh.',
        durationSeconds: 15,
      },
    ],
    batchFormulas: [
      {
        id: 'bf_oolong_nuong_5l',
        batchName: 'Ủ bình Cốt Trà Oolong Nướng 5 Lít',
        yieldServings: 30,
        teaType: 'Trà Oolong Nướng Đài Loan',
        teaQuantityGrams: 150,
        waterVolumeMl: 5000,
        waterTempCelsius: 95,
        brewTimeSeconds: 720,
        iceShockGrams: 700,
        shelfLifeHours: 6,
        ingredients: [
          { ingredientName: 'Trà Oolong Nướng', quantity: 150, unit: 'g' },
          { ingredientName: 'Nước Sôi 95°C', quantity: 5000, unit: 'ml' },
          { ingredientName: 'Đá Bi Sốc Nhiệt', quantity: 700, unit: 'g' },
        ],
        instructions: [
          'Ủ 150g trà Oolong với 5L nước sôi 95°C trong 12 phút kín nắp.',
          'Lọc bỏ bã, sốc nhiệt với 700g đá bi hãm vị chát.',
          'Bảo quản bình giữ nhiệt, dùng trong 6 tiếng.',
        ],
      },
    ],
  },
  {
    id: 'rec_tra_dao_cam_sa',
    productId: 'p1',
    productName: 'Trà Đào Cam Sả',
    category: 'Trà Trái Cây',
    sellingPrice: 42000,
    prepTimeMinutes: 3,
    difficulty: 'easy',
    description: 'Hương vị trà đen đậm đà kết hợp nước cam tươi mọng nước, sả tươi đập dập thơm lừng và đào ngâm giòn ngọt.',
    tags: ['Best Seller', 'Trà Trái Cây', 'Giải Nhiệt'],
    variants: [
      {
        sizeName: 'Size Vừa (M)',
        ingredients: [
          { ingredientId: 'ing_tra_den', ingredientName: 'Cốt Trà Đen Ủ Lạnh', quantity: 120, unit: 'ml', costPrice: 15 },
          { ingredientId: 'ing_syrup_dao', ingredientName: 'Syrup Đào Pháp', quantity: 25, unit: 'ml', costPrice: 220 },
          { ingredientId: 'ing_nuoc_duong', ingredientName: 'Nước Đường Bắp', quantity: 15, unit: 'ml', costPrice: 20 },
          { ingredientId: 'ing_cam_tuoi', ingredientName: 'Cam Tươi Vắt Nước', quantity: 30, unit: 'ml', costPrice: 50 },
          { ingredientId: 'ing_sa_tuoi', ingredientName: 'Sả Tươi Đập Dập', quantity: 1, unit: 'nhánh', costPrice: 500 },
          { ingredientId: 'ing_mieng_dao', ingredientName: 'Đào Ngâm Giòn', quantity: 2, unit: 'lát', costPrice: 1200 },
        ],
      },
      {
        sizeName: 'Size Lớn (L)',
        ingredients: [
          { ingredientId: 'ing_tra_den', ingredientName: 'Cốt Trà Đen Ủ Lạnh', quantity: 160, unit: 'ml', costPrice: 15 },
          { ingredientId: 'ing_syrup_dao', ingredientName: 'Syrup Đào Pháp', quantity: 35, unit: 'ml', costPrice: 220 },
          { ingredientId: 'ing_nuoc_duong', ingredientName: 'Nước Đường Bắp', quantity: 20, unit: 'ml', costPrice: 20 },
          { ingredientId: 'ing_cam_tuoi', ingredientName: 'Cam Tươi Vắt Nước', quantity: 45, unit: 'ml', costPrice: 50 },
          { ingredientId: 'ing_sa_tuoi', ingredientName: 'Sả Tươi Đập Dập', quantity: 1.5, unit: 'nhánh', costPrice: 500 },
          { ingredientId: 'ing_mieng_dao', ingredientName: 'Đào Ngâm Giòn', quantity: 3, unit: 'lát', costPrice: 1200 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Đập dập sả & Chiết xuất tinh dầu',
        description: 'Lấy 1 nhánh sả tươi đập dập nhẹ phần gốc, cắt khúc 4cm cho vào bình shaker.',
        durationSeconds: 15,
        tip: 'Đập dập vừa phải, không băm nát để tránh vụn sả rơi vào ly.',
      },
      {
        stepNumber: 2,
        title: 'Đong định lượng trà & nguyên liệu',
        description: 'Đong 120ml cốt trà đen, 25ml syrup đào, 15ml nước đường và 30ml nước cam tươi vào shaker.',
        durationSeconds: 20,
        temperature: 'Lạnh 10°C',
        tip: 'Dùng jigger chuẩn để kiểm soát cost nguyên liệu chính xác 100%.',
      },
      {
        stepNumber: 3,
        title: 'Thêm đá & Lắc đều (Shake)',
        description: 'Cho đá bi đầy 2/3 bình shaker. Lắc đều tay từ 12-15 lần đến khi cảm nhận bình lạnh buốt.',
        durationSeconds: 15,
      },
      {
        stepNumber: 4,
        title: 'Rót ra ly & Decor hoàn thiện',
        description: 'Rót toàn bộ hỗn hợp ra ly. Gắp 2 lát đào ngâm đặt trên mặt đá, cắm 1 nhánh sả trang trí và đậy nắp.',
        durationSeconds: 20,
        tip: 'Đặt lát đào nghiêng trên mặt đá để tạo thẩm mỹ bắt mắt cho khách check-in.',
      },
    ],
    batchFormulas: [
      {
        id: 'bf_tra_dao_5l',
        batchName: 'Nấu bình cốt trà sả 5 Lít (Ủ sẵn đầu ca)',
        yieldServings: 35,
        teaType: 'Trà Đen Số 9 Hoa Trân',
        teaQuantityGrams: 150,
        waterVolumeMl: 5000,
        waterTempCelsius: 95,
        brewTimeSeconds: 900,
        iceShockGrams: 600,
        shelfLifeHours: 6,
        ingredients: [
          { ingredientName: 'Trà Đen Cốt Đậm', quantity: 150, unit: 'g' },
          { ingredientName: 'Nước Sôi 95°C', quantity: 5000, unit: 'ml' },
          { ingredientName: 'Sả Cây Đập Dập', quantity: 10, unit: 'nhánh' },
        ],
        instructions: [
          'Đun sôi 5L nước đạt 95°C.',
          'Thả 150g trà đen và 10 nhánh sả vào ủ kín nắp trong 15 phút.',
          'Lọc bỏ bã trà, thêm 600g đá bi làm lạnh sốc (Shocking cold) để giữ hương thơm tươi mới.',
          'Bảo quản trong bình giữ nhiệt hoặc tủ mát dùng trong ngày.',
        ],
      },
    ],
  },
  {
    id: 'rec_tra_dau_tam_pha_le',
    productId: 'p_td_dautam',
    productName: 'Trà Dâu Tằm Pha Lê Tuyết',
    category: 'Trà Trái Cây',
    sellingPrice: 38000,
    prepTimeMinutes: 2,
    difficulty: 'easy',
    description: 'Vị chua ngọt dịu từ mứt dâu tằm Đà Lạt tươi nấu thủ công, hòa cùng cốt trà lài thanh thoát và thạch pha lê giòn dai.',
    tags: ['Best Seller', 'Đà Lạt', 'Signature'],
    variants: [
      {
        sizeName: 'Size Lớn (L)',
        ingredients: [
          { ingredientId: 'ing_tra_lai', ingredientName: 'Cốt Trà Xanh Hoa Lài', quantity: 150, unit: 'ml', costPrice: 12 },
          { ingredientId: 'ing_sot_dau_tam', ingredientName: 'Sốt Dâu Tằm Nguyên Trái', quantity: 45, unit: 'g', costPrice: 120 },
          { ingredientId: 'ing_chanh_tuoi', ingredientName: 'Nước Cốt Chanh Tươi', quantity: 10, unit: 'ml', costPrice: 60 },
          { ingredientId: 'ing_nuoc_duong', ingredientName: 'Nước Đường Vàng', quantity: 20, unit: 'ml', costPrice: 20 },
          { ingredientId: 'ing_thach_pha_le', ingredientName: 'Thạch Pha Lê Giòn 3Q', quantity: 35, unit: 'g', costPrice: 60 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Đong cốt trà & Sốt dâu tằm',
        description: 'Đong 150ml cốt trà lài, 45g sốt dâu tằm nguyên quả, 10ml nước cốt chanh và 20ml nước đường vào shaker.',
        durationSeconds: 15,
      },
      {
        stepNumber: 2,
        title: 'Lắc đá lạnh buốt',
        description: 'Thêm đá bi 2/3 shaker, lắc mạnh 12 lần hòa quyện màu tím ruby quyến rũ.',
        durationSeconds: 15,
      },
      {
        stepNumber: 3,
        title: 'Múc thạch pha lê & Hoàn tất',
        description: 'Múc 35g thạch pha lê vào đáy ly, rót trà dâu tằm lên trên, múc 2 quả dâu tằm trang trí trên mặt.',
        durationSeconds: 15,
      },
    ],
    batchFormulas: [
      {
        id: 'bf_sot_dau_tam_2kg',
        batchName: 'Nấu mẻ Sốt Dâu Tằm Tươi 2kg (Dùng trong 7 ngày)',
        yieldServings: 45,
        teaType: 'Dâu Tằm Tươi Đà Lạt',
        brewTimeSeconds: 1200,
        shelfLifeHours: 168,
        ingredients: [
          { ingredientName: 'Dâu Tằm Tươi Rửa Sạch', quantity: 1500, unit: 'g' },
          { ingredientName: 'Đường Cát Trắng', quantity: 600, unit: 'g' },
          { ingredientName: 'Nước Cốt Chanh', quantity: 30, unit: 'ml' },
        ],
        instructions: [
          'Ướp dâu tằm với đường trong 2 tiếng cho tan hết đường.',
          'Đun lửa nhỏ liu riu trong 20 phút, đảo nhẹ tay giữ nguyên trái dâu.',
          'Tắt bếp, cho 30ml nước cốt chanh vào bảo quản tự nhiên.',
          'Để nguội và trữ hộp kín trong ngăn mát tủ lạnh.',
        ],
      },
    ],
  },
  {
    id: 'rec_tra_oi_hong_hat_luu',
    productId: 'p_oi_hong',
    productName: 'Trà Ổi Hồng Hạt Lựu Ruby',
    category: 'Trà Trái Cây',
    sellingPrice: 39000,
    prepTimeMinutes: 2,
    difficulty: 'easy',
    description: 'Sắc hồng san hô bắt mắt, vị thơm nồng nàn của ổi hồng nhiệt đới kết hợp thạch củ năng hạt lựu giòn sần sật.',
    tags: ['Check-in', 'Màu Đẹp', 'Giải Nhiệt'],
    variants: [
      {
        sizeName: 'Size Lớn (L)',
        ingredients: [
          { ingredientId: 'ing_tra_lai', ingredientName: 'Cốt Trà Xanh Hoa Lài', quantity: 140, unit: 'ml', costPrice: 12 },
          { ingredientId: 'ing_syrup_oi', ingredientName: 'Syrup Ổi Hồng Cao Cấp', quantity: 30, unit: 'ml', costPrice: 240 },
          { ingredientId: 'ing_tac_tuoi', ingredientName: 'Nước Cốt Tắc', quantity: 15, unit: 'ml', costPrice: 50 },
          { ingredientId: 'ing_nuoc_duong', ingredientName: 'Nước Đường Bắp', quantity: 15, unit: 'ml', costPrice: 20 },
          { ingredientId: 'ing_hat_luu', ingredientName: 'Thạch Hạt Lựu Ruby', quantity: 40, unit: 'g', costPrice: 70 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Pha cốt ổi hồng',
        description: 'Cho 140ml cốt trà lài, 30ml syrup ổi hồng, 15ml nước cốt tắc và 15ml nước đường vào shaker.',
        durationSeconds: 15,
      },
      {
        stepNumber: 2,
        title: 'Lắc đều với đá bi',
        description: 'Cho đầy đá bi vào shaker, lắc mạnh 12 lần tạo bọt hồng mịn.',
        durationSeconds: 15,
      },
      {
        stepNumber: 3,
        title: 'Thêm thạch & Rót ra ly',
        description: 'Múc 40g thạch hạt lựu ruby vào ly, rót hỗn hợp trà ổi hồng lên trên.',
        durationSeconds: 10,
      },
    ],
  },
  {
    id: 'rec_tra_mang_cau_xiem',
    productId: 'p_mang_cau',
    productName: 'Trà Mãng Cầu Xiêm Tươi',
    category: 'Trà Trái Cây',
    sellingPrice: 39000,
    prepTimeMinutes: 2,
    difficulty: 'easy',
    description: 'Thịt mãng cầu xiêm tươi xé sợi chua ngọt đậm đà, kết hợp cốt trà lài thanh mát và tắc thơm lừng.',
    tags: ['Hot Trend', 'Trái Cây Tươi'],
    variants: [
      {
        sizeName: 'Size Lớn (L)',
        ingredients: [
          { ingredientId: 'ing_tra_lai', ingredientName: 'Cốt Trà Xanh Hoa Lài', quantity: 140, unit: 'ml', costPrice: 12 },
          { ingredientId: 'ing_mang_cau', ingredientName: 'Thịt Mãng Cầu Ngâm Đường', quantity: 70, unit: 'g', costPrice: 90 },
          { ingredientId: 'ing_tac_tuoi', ingredientName: 'Nước Cốt Tắc', quantity: 15, unit: 'ml', costPrice: 50 },
          { ingredientId: 'ing_nuoc_duong', ingredientName: 'Nước Đường Vàng', quantity: 20, unit: 'ml', costPrice: 20 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Dằm nhẹ mãng cầu',
        description: 'Múc 70g mãng cầu xiêm ngâm đường vào shaker, dùng chày dằm nhẹ 3-4 cái bung tép thịt.',
        durationSeconds: 10,
      },
      {
        stepNumber: 2,
        title: 'Thêm cốt trà & Lắc đều',
        description: 'Rót 140ml cốt trà lài, 15ml nước cốt tắc, 20ml nước đường và xúc đá đầy 2/3 bình lắc.',
        durationSeconds: 15,
      },
      {
        stepNumber: 3,
        title: 'Rót ra ly',
        description: 'Rót toàn bộ trà và thịt mãng cầu ra ly, cắm ống hút to (phi 12).',
        durationSeconds: 10,
      },
    ],
  },

  // ==========================================
  // 2. NHÓM TRÀ SỮA & MACCHIATO (MILK TEAS)
  // ==========================================
  {
    id: 'rec_tra_sua_tran_chau',
    productId: 'p2',
    productName: 'Trà Sữa Trân Châu Hoàng Gia',
    category: 'Trà Sữa',
    sellingPrice: 45000,
    prepTimeMinutes: 2,
    difficulty: 'easy',
    description: 'Trà sữa nấu thủ công đậm vị trà Oolong/Trà đen, hòa quyện bột sữa cao cấp béo ngậy và trân châu hoàng gia dẻo dai.',
    tags: ['Signature', 'Bán Chạy Nhất', 'Truyền Thống'],
    variants: [
      {
        sizeName: 'Size Vừa (M)',
        ingredients: [
          { ingredientId: 'ing_cot_tra_sua', ingredientName: 'Cốt Trà Sữa Nấu Sẵn', quantity: 150, unit: 'ml', costPrice: 40 },
          { ingredientId: 'ing_nuoc_duong', ingredientName: 'Nước Đường Đen', quantity: 15, unit: 'ml', costPrice: 20 },
          { ingredientId: 'ing_tran_chau', ingredientName: 'Trân Châu Hoàng Gia', quantity: 40, unit: 'g', costPrice: 40 },
        ],
      },
      {
        sizeName: 'Size Lớn (L)',
        ingredients: [
          { ingredientId: 'ing_cot_tra_sua', ingredientName: 'Cốt Trà Sữa Nấu Sẵn', quantity: 200, unit: 'ml', costPrice: 40 },
          { ingredientId: 'ing_nuoc_duong', ingredientName: 'Nước Đường Đen', quantity: 20, unit: 'ml', costPrice: 20 },
          { ingredientId: 'ing_tran_chau', ingredientName: 'Trân Châu Hoàng Gia', quantity: 55, unit: 'g', costPrice: 40 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Múc trân châu vào ly',
        description: 'Dùng vá lỗ múc 1 phần trân châu dẻo vào đáy ly thủy tinh hoặc ly takeaway.',
        durationSeconds: 10,
        tip: 'Kéo nhẹ muỗng trân châu quanh thành ly tạo vệt đường đen hấp dẫn thị giác.',
      },
      {
        stepNumber: 2,
        title: 'Đong cốt trà sữa & đường',
        description: 'Cho 150ml cốt trà sữa và 15ml nước đường đen vào bình shaker.',
        durationSeconds: 15,
      },
      {
        stepNumber: 3,
        title: 'Lắc đều với đá bi & Rót vào ly',
        description: 'Cho đá bi vào shaker, lắc đều tay 12 lần rồi rót vào ly đã có sẵn trân châu.',
        durationSeconds: 20,
      },
    ],
    batchFormulas: [
      {
        id: 'bf_cot_tra_sua_5l',
        batchName: 'Nấu mẻ cốt trà sữa 5 Lít (Bảo quản 24h)',
        yieldServings: 32,
        teaType: 'Trà Đen Số 9 kết hợp Oolong Nướng',
        teaQuantityGrams: 160,
        waterVolumeMl: 4000,
        waterTempCelsius: 95,
        brewTimeSeconds: 900,
        shelfLifeHours: 24,
        ingredients: [
          { ingredientName: 'Trà Đen Cốt Đậm', quantity: 160, unit: 'g' },
          { ingredientName: 'Nước Sôi 95°C', quantity: 4000, unit: 'ml' },
          { ingredientName: 'Bột Sữa Béo Non-Dairy', quantity: 450, unit: 'g' },
          { ingredientName: 'Sữa Đặc Có Đường', quantity: 250, unit: 'g' },
        ],
        instructions: [
          'Ủ 160g trà đen trong 4L nước sôi 95°C trong 15 phút.',
          'Vớt bỏ xác trà, cho bột sữa béo và sữa đặc vào khi cốt trà còn nóng.',
          'Khuấy tan hoàn toàn theo 1 chiều.',
          'Làm nguội nhanh và bảo quản ngăn mát tủ lạnh từ 4°C - 8°C.',
        ],
      },
    ],
  },
  {
    id: 'rec_tra_sua_kem_trung_chay',
    productId: 'p_ts_kemtrung',
    productName: 'Trà Sữa Oolong Kem Trứng Cháy',
    category: 'Trà Sữa',
    sellingPrice: 48000,
    prepTimeMinutes: 3,
    difficulty: 'medium',
    description: 'Trà sữa Oolong nướng thơm lừng phủ lớp kem trứng béo ngậy, rắc đường nâu khò lửa caramel giòn tan.',
    tags: ['Best Seller', 'Khò Lửa', 'Đậm Vị'],
    variants: [
      {
        sizeName: 'Size Lớn (L)',
        ingredients: [
          { ingredientId: 'ing_cot_tra_sua', ingredientName: 'Cốt Trà Sữa Oolong Nướng', quantity: 180, unit: 'ml', costPrice: 45 },
          { ingredientId: 'ing_kem_trung', ingredientName: 'Sốt Kem Trứng Custard', quantity: 50, unit: 'ml', costPrice: 90 },
          { ingredientId: 'ing_duong_nau', ingredientName: 'Đường Nâu Khò Lửa', quantity: 5, unit: 'g', costPrice: 20 },
          { ingredientId: 'ing_tran_chau', ingredientName: 'Trân Châu Đen', quantity: 40, unit: 'g', costPrice: 40 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Múc trân châu & rót trà sữa',
        description: 'Múc 40g trân châu vào đáy ly. Lắc 180ml cốt trà sữa Oolong với đá rồi rót vào ly chừa 3cm miệng.',
        durationSeconds: 20,
      },
      {
        stepNumber: 2,
        title: 'Phủ kem trứng',
        description: 'Múc 50ml sốt kem trứng custard phủ đầy mặt ly.',
        durationSeconds: 15,
      },
      {
        stepNumber: 3,
        title: 'Rắc đường nâu & Khò lửa',
        description: 'Rắc 1 muỗng đường nâu lên mặt kem trứng. Dùng đèn khò gas khò lửa nhẹ 5-8 giây tạo lớp caramel giòn vàng óng.',
        durationSeconds: 15,
        tip: 'Khò vòng tròn cách mặt ly 8cm tránh làm cháy viền miệng ly nhựa.',
      },
    ],
  },
  {
    id: 'rec_tra_sua_matcha_dau_do',
    productId: 'p_ts_matcha',
    productName: 'Trà Sữa Matcha Đậu Đỏ Nhật Bản',
    category: 'Trà Sữa',
    sellingPrice: 49000,
    prepTimeMinutes: 3,
    difficulty: 'medium',
    description: 'Bột Matcha Uji chuẩn Nhật xanh mướt thơm ngát, sữa tươi Dalatmilk thanh béo kết hợp đậu đỏ bùi dẻo.',
    tags: ['Matcha Nhật', 'Đậu Đỏ', 'Cao Cấp'],
    variants: [
      {
        sizeName: 'Size Vừa (M)',
        ingredients: [
          { ingredientId: 'ing_matcha', ingredientName: 'Bột Matcha Uji Shizuoka', quantity: 8, unit: 'g', costPrice: 800 },
          { ingredientId: 'ing_sua_tuoi', ingredientName: 'Sữa Tươi Thanh Trùng', quantity: 120, unit: 'ml', costPrice: 35 },
          { ingredientId: 'ing_sua_dac', ingredientName: 'Sữa Đặc Có Đường', quantity: 20, unit: 'ml', costPrice: 30 },
          { ingredientId: 'ing_dau_do', ingredientName: 'Đậu Đỏ Azuki Rim Ngọt', quantity: 40, unit: 'g', costPrice: 90 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Đánh tan bột matcha bằng chổi Chasen',
        description: 'Cho 8g bột matcha và 40ml nước ấm 80°C vào bát. Dùng chổi Chasen đánh ziczac tạo bọt mịn.',
        durationSeconds: 30,
        tip: 'Nước 80°C giữ màu xanh ngọc bích tươi và không bị đắng chát.',
      },
      {
        stepNumber: 2,
        title: 'Tạo tầng sữa tươi & đậu đỏ',
        description: 'Múc 40g đậu đỏ vào đáy ly, khuấy 20ml sữa đặc với 120ml sữa tươi rồi rót cùng đá bi vào ly.',
        durationSeconds: 20,
      },
      {
        stepNumber: 3,
        title: 'Rót tầng matcha lên trên',
        description: 'Rót từ từ phần cốt matcha lên trên mặt đá tạo 2 tầng xanh trắng tuyệt đẹp.',
        durationSeconds: 15,
      },
    ],
  },
  {
    id: 'rec_hong_tra_kem_cheese',
    productId: 'p_hongtra_cheese',
    productName: 'Hồng Trà Kem Cheese Macchiato',
    category: 'Trà Sữa',
    sellingPrice: 42000,
    prepTimeMinutes: 2,
    difficulty: 'easy',
    description: 'Hồng trà Ceylon thơm nồng đậm vị, phủ lớp váng sữa phô mai Anchor mặn mặn béo ngậy.',
    tags: ['Macchiato', 'Kem Phô Mai', 'Best Seller'],
    variants: [
      {
        sizeName: 'Size Lớn (L)',
        ingredients: [
          { ingredientId: 'ing_tra_den', ingredientName: 'Cốt Hồng Trà Ceylon', quantity: 180, unit: 'ml', costPrice: 15 },
          { ingredientId: 'ing_nuoc_duong', ingredientName: 'Nước Đường Mía', quantity: 25, unit: 'ml', costPrice: 20 },
          { ingredientId: 'ing_kem_cheese', ingredientName: 'Kem Cheese Váng Sữa', quantity: 50, unit: 'ml', costPrice: 110 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Lắc hồng trà đá lạnh',
        description: 'Lắc 180ml cốt hồng trà với 25ml nước đường và đá bi, rót ra ly chừa 3cm.',
        durationSeconds: 15,
      },
      {
        stepNumber: 2,
        title: 'Rót kem cheese',
        description: 'Rót nhẹ nhàng 50ml kem cheese lên trên mặt đá tạo tầng váng sữa dày mịn.',
        durationSeconds: 15,
      },
    ],
  },

  // ==========================================
  // 3. NHÓM CÀ PHÊ VIỆT NAM & PHIN (COFFEE)
  // ==========================================
  {
    id: 'rec_ca_phe_muoi',
    productId: 'p3',
    productName: 'Cà Phê Muối Cố Đô',
    category: 'Cà Phê',
    sellingPrice: 32000,
    prepTimeMinutes: 2,
    difficulty: 'medium',
    description: 'Cà phê phin truyền thống đậm đà, phủ lớp kem muối béo ngậy mằn mặn độc đáo theo chuẩn vị Huế.',
    tags: ['Signature', 'Đậm Đà', 'Hot'],
    variants: [
      {
        sizeName: 'Size Chuẩn (1 Size)',
        ingredients: [
          { ingredientId: 'ing_cot_cf', ingredientName: 'Cốt Cà Phê Phin Mộc', quantity: 50, unit: 'ml', costPrice: 45 },
          { ingredientId: 'ing_sua_dac', ingredientName: 'Sữa Đặc', quantity: 20, unit: 'ml', costPrice: 30 },
          { ingredientId: 'ing_kem_muoi', ingredientName: 'Kem Muối Béo Mặn', quantity: 40, unit: 'ml', costPrice: 85 },
          { ingredientId: 'ing_bot_cacao', ingredientName: 'Bột Ca Cao Rắc Mặt', quantity: 1, unit: 'g', costPrice: 150 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Tạo tầng sữa đặc & đá',
        description: 'Cho 20ml sữa đặc vào đáy ly, xúc đá bi đầy 2/3 ly.',
        durationSeconds: 15,
      },
      {
        stepNumber: 2,
        title: 'Rót cốt cà phê phin',
        description: 'Rót từ từ 50ml cốt cà phê phin nguyên chất vào ly để tạo sự phân tầng đẹp mắt.',
        durationSeconds: 15,
      },
      {
        stepNumber: 3,
        title: 'Phủ kem muối & Rắc cacao',
        description: 'Múc 40ml kem muối phủ đều lên mặt ly. Rắc một chút bột cacao trang trí.',
        durationSeconds: 20,
        tip: 'Lớp kem muối nên có độ sánh mịn như sữa chua uống, không đánh quá bông cứng.',
      },
    ],
    batchFormulas: [
      {
        id: 'bf_kem_muoi_500ml',
        batchName: 'Đánh 1 mẻ Kem Muối 500ml (Dùng cho 15 ly)',
        yieldServings: 15,
        teaType: 'Kem Béo Thực Vật Rich & Muối Hồng',
        brewTimeSeconds: 180,
        shelfLifeHours: 12,
        ingredients: [
          { ingredientName: 'Kem Béo Thực Vật Rich', quantity: 250, unit: 'ml' },
          { ingredientName: 'Whipping Cream Anchor', quantity: 150, unit: 'ml' },
          { ingredientName: 'Sữa Đặc', quantity: 50, unit: 'ml' },
          { ingredientName: 'Muối Tinh Sạch / Muối Hồng', quantity: 3, unit: 'g' },
        ],
        instructions: [
          'Cho tất cả nguyên liệu vào ca đong inox đã làm lạnh.',
          'Dùng máy đánh trứng đánh ở tốc độ trung bình trong khoảng 2-3 phút.',
          'Dừng lại khi kem đạt độ sánh vừa phải (chảy nhẹ tạo vân).',
          'Đậy kín bảo quản ngăn mát tủ lạnh, dùng trong ngày.',
        ],
      },
    ],
  },
  {
    id: 'rec_ca_phe_sua_da',
    productId: 'p_cf_suada',
    productName: 'Cà Phê Sữa Đá Sài Gòn',
    category: 'Cà Phê',
    sellingPrice: 25000,
    prepTimeMinutes: 2,
    difficulty: 'easy',
    description: 'Robusta Buôn Ma Thuột rang mộc phin truyền thống, sữa đặc thơm ngọt ngào và đá bi mát lạnh.',
    tags: ['Truyền Thống', 'Buổi Sáng', 'Best Seller'],
    variants: [
      {
        sizeName: 'Size Chuẩn',
        ingredients: [
          { ingredientId: 'ing_cot_cf', ingredientName: 'Cốt Cà Phê Phin Robusta', quantity: 45, unit: 'ml', costPrice: 45 },
          { ingredientId: 'ing_sua_dac', ingredientName: 'Sữa Đặc Ngôi Sao', quantity: 25, unit: 'ml', costPrice: 30 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Khuấy sữa đặc & cà phê',
        description: 'Cho 25ml sữa đặc và 45ml cốt cà phê nóng vào ly, dùng muỗng khuấy đều tay đến khi sữa tan hoàn toàn.',
        durationSeconds: 15,
      },
      {
        stepNumber: 2,
        title: 'Đánh bọt nhẹ & Đổ đá',
        description: 'Dùng cây đánh bọt lò xo đánh 5 giây tạo lớp bọt nâu cánh gián, xúc đá bi đầy miệng ly.',
        durationSeconds: 15,
      },
    ],
  },
  {
    id: 'rec_bac_xiu_3_tang',
    productId: 'p_bac_xiu',
    productName: 'Bạc Xỉu 3 Tầng Khói',
    category: 'Cà Phê',
    sellingPrice: 29000,
    prepTimeMinutes: 2,
    difficulty: 'easy',
    description: 'Tầng sữa đặc ngọt dịu, tầng sữa tươi thanh béo và tầng cà phê thơm nức bồng bềnh phía trên.',
    tags: ['Bạc Xỉu', 'Phân Tầng', 'Bán Chạy'],
    variants: [
      {
        sizeName: 'Size Chuẩn',
        ingredients: [
          { ingredientId: 'ing_sua_dac', ingredientName: 'Sữa Đặc', quantity: 25, unit: 'ml', costPrice: 30 },
          { ingredientId: 'ing_sua_tuoi', ingredientName: 'Sữa Tươi Không Đường', quantity: 60, unit: 'ml', costPrice: 35 },
          { ingredientId: 'ing_cot_cf', ingredientName: 'Cốt Cà Phê Đánh Bọt', quantity: 20, unit: 'ml', costPrice: 45 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Tạo tầng sữa đặc',
        description: 'Cho 25ml sữa đặc vào đáy ly thủy tinh.',
        durationSeconds: 10,
      },
      {
        stepNumber: 2,
        title: 'Tạo tầng sữa tươi & đá',
        description: 'Xúc đá bi đầy 2/3 ly. Rót nhẹ nhàng 60ml sữa tươi không đường tạo tầng 2 trắng mịn.',
        durationSeconds: 15,
      },
      {
        stepNumber: 3,
        title: 'Đánh bọt cà phê & Rót mặt',
        description: 'Dùng cây đánh bọt đánh bông 20ml cà phê trong ca riêng, rót bọt cà phê lên trên cùng.',
        durationSeconds: 20,
      },
    ],
  },
  {
    id: 'rec_cold_brew_cam_sa',
    productId: 'p_cold_brew',
    productName: 'Cold Brew Cam Vàng Sả Tươi',
    category: 'Cà Phê',
    sellingPrice: 45000,
    prepTimeMinutes: 2,
    difficulty: 'medium',
    description: 'Arabica Cầu Đất ủ lạnh 18 tiếng êm dịu, không chua gắt, hòa cùng cam vàng mọng nước và hương sả thoang thoảng.',
    tags: ['Cold Brew', 'Healthy', 'Cao Cấp'],
    variants: [
      {
        sizeName: 'Size Lớn (L)',
        ingredients: [
          { ingredientId: 'ing_cold_brew', ingredientName: 'Cốt Cà Phê Cold Brew 18h', quantity: 120, unit: 'ml', costPrice: 90 },
          { ingredientId: 'ing_cam_vang', ingredientName: 'Nước Cam Vàng Tươi', quantity: 40, unit: 'ml', costPrice: 80 },
          { ingredientId: 'ing_nuoc_duong', ingredientName: 'Nước Đường Mía', quantity: 15, unit: 'ml', costPrice: 20 },
          { ingredientId: 'ing_sa_tuoi', ingredientName: 'Sả Tươi Đập Dập', quantity: 1, unit: 'nhánh', costPrice: 500 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Đong nguyên liệu vào shaker',
        description: 'Đập dập 1 nhánh sả, cho 120ml Cold Brew, 40ml nước cam tươi và 15ml nước đường vào shaker.',
        durationSeconds: 15,
      },
      {
        stepNumber: 2,
        title: 'Lắc nhẹ & Rót ra ly',
        description: 'Thêm đá viên to, lắc nhẹ 8 lần rồi rót ra ly kèm 1 lát cam vàng sấy decor.',
        durationSeconds: 15,
      },
    ],
  },

  // ==========================================
  // 4. NHÓM ĐÁ XAY & FREEZE (ICE BLENDED)
  // ==========================================
  {
    id: 'rec_matcha_freeze',
    productId: 'p_matcha_freeze',
    productName: 'Matcha Freeze Băng Tuyết',
    category: 'Đá Xay',
    sellingPrice: 49000,
    prepTimeMinutes: 3,
    difficulty: 'medium',
    description: 'Matcha Nhật xay tuyết béo mịn với bột Frappe chống phân tầng, xịt kem bông tuyết whipping ngậy béo.',
    tags: ['Matcha', 'Đá Xay', 'Kem Whipping'],
    variants: [
      {
        sizeName: 'Size Lớn (L)',
        ingredients: [
          { ingredientId: 'ing_matcha', ingredientName: 'Bột Matcha Uji', quantity: 10, unit: 'g', costPrice: 800 },
          { ingredientId: 'ing_sua_tuoi', ingredientName: 'Sữa Tươi', quantity: 80, unit: 'ml', costPrice: 35 },
          { ingredientId: 'ing_sua_dac', ingredientName: 'Sữa Đặc', quantity: 30, unit: 'ml', costPrice: 30 },
          { ingredientId: 'ing_bot_frappe', ingredientName: 'Bột Frappe Chống Tách Nước', quantity: 15, unit: 'g', costPrice: 150 },
          { ingredientId: 'ing_kem_whip', ingredientName: 'Bông Kem Whipping', quantity: 30, unit: 'g', costPrice: 160 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Cho nguyên liệu vào cối xay sinh tố',
        description: 'Đổ 80ml sữa tươi, 30ml sữa đặc, 10g matcha, 15g bột frappe và 1 xúc đá bi vào cối.',
        durationSeconds: 20,
      },
      {
        stepNumber: 2,
        title: 'Xay nhuyễn mịn 30 giây',
        description: 'Bật máy xay ở tốc độ cao trong 30 giây đến khi hỗn hợp nhuyễn mịn như kem tuyết.',
        durationSeconds: 30,
      },
      {
        stepNumber: 3,
        title: 'Rót ra ly & Xịt kem whipping',
        description: 'Đổ ra ly, dùng bình xịt kem tươi xịt 2 vòng hoa kem whipping bông tuyết lên trên.',
        durationSeconds: 15,
      },
    ],
  },
  {
    id: 'rec_cookie_da_xay',
    productId: 'p_cookie_oreo',
    productName: 'Cookie OREO Đá Xay Socola',
    category: 'Đá Xay',
    sellingPrice: 48000,
    prepTimeMinutes: 3,
    difficulty: 'easy',
    description: 'Bánh Oreo socola xay giòn rụm cùng sữa tươi béo ngậy, rưới sốt socola Hershey đậm đặc quanh thành ly.',
    tags: ['Oreo', 'Đá Xay', 'Trẻ Em Yêu Thích'],
    variants: [
      {
        sizeName: 'Size Lớn (L)',
        ingredients: [
          { ingredientId: 'ing_banh_oreo', ingredientName: 'Bánh Oreo Socola', quantity: 3, unit: 'cái', costPrice: 1500 },
          { ingredientId: 'ing_sua_tuoi', ingredientName: 'Sữa Tươi', quantity: 80, unit: 'ml', costPrice: 35 },
          { ingredientId: 'ing_sua_dac', ingredientName: 'Sữa Đặc', quantity: 25, unit: 'ml', costPrice: 30 },
          { ingredientId: 'ing_sot_socola', ingredientName: 'Sốt Socola Hershey', quantity: 20, unit: 'ml', costPrice: 180 },
          { ingredientId: 'ing_kem_whip', ingredientName: 'Kem Whipping Xịt Mặt', quantity: 30, unit: 'g', costPrice: 160 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Vẽ sốt socola thành ly',
        description: 'Rưới 10ml sốt socola quanh thành ly tạo hoa văn xoắn ốc bắt mắt.',
        durationSeconds: 10,
      },
      {
        stepNumber: 2,
        title: 'Xay bánh Oreo với sữa',
        description: 'Bẻ 2 cái bánh Oreo vào cối xay cùng 80ml sữa tươi, 25ml sữa đặc, đá bi và xay nhuyễn.',
        durationSeconds: 25,
      },
      {
        stepNumber: 3,
        title: 'Rót ra ly & Decor bánh Oreo',
        description: 'Rót ra ly, xịt kem whipping và cắm 1 cái bánh Oreo nguyên vẹn lên chóp kem.',
        durationSeconds: 15,
      },
    ],
  },

  // ==========================================
  // 5. NHÓM SINH TỐ & SỮA CHUA (SMOOTHIE & YOGURT)
  // ==========================================
  {
    id: 'rec_sinh_to_bo_sap',
    productId: 'p_bo_sap',
    productName: 'Sinh Tố Bơ Sáp Dừa Béo Ngậy',
    category: 'Sinh Tố',
    sellingPrice: 45000,
    prepTimeMinutes: 3,
    difficulty: 'easy',
    description: 'Bơ sáp Đắk Lắk dẻo vàng tự nhiên, hòa cùng sữa đặc và nước cốt dừa béo thơm ngất ngây.',
    tags: ['Bơ Sáp', 'Sinh Tố', 'Dinh Dưỡng'],
    variants: [
      {
        sizeName: 'Size Chuẩn',
        ingredients: [
          { ingredientId: 'ing_thit_bo', ingredientName: 'Thịt Bơ Sáp Tươi', quantity: 120, unit: 'g', costPrice: 90 },
          { ingredientId: 'ing_sua_dac', ingredientName: 'Sữa Đặc', quantity: 35, unit: 'ml', costPrice: 30 },
          { ingredientId: 'ing_sua_tuoi', ingredientName: 'Sữa Tươi Không Đường', quantity: 50, unit: 'ml', costPrice: 35 },
          { ingredientId: 'ing_nuoc_cot_dua', ingredientName: 'Nước Cốt Dừa', quantity: 15, unit: 'ml', costPrice: 60 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Cho nguyên liệu vào cối xay',
        description: 'Cho 120g bơ sáp, 35ml sữa đặc, 50ml sữa tươi, 15ml nước cốt dừa và đá bi vào cối.',
        durationSeconds: 20,
      },
      {
        stepNumber: 2,
        title: 'Xay nhuyễn sánh dẻo',
        description: 'Xay trong 25 giây đến khi sinh tố đạt độ sánh dẻo mịn.',
        durationSeconds: 25,
      },
    ],
  },
  {
    id: 'rec_sua_chua_danh_da_cf',
    productId: 'p_sc_danhda',
    productName: 'Sữa Chua Đánh Đá Cà Phê',
    category: 'Sinh Tố',
    sellingPrice: 30000,
    prepTimeMinutes: 2,
    difficulty: 'easy',
    description: 'Sữa chua dẻo chua dịu lên men tự nhiên, đánh đá mát lạnh và rưới sốt cốt cà phê phin đậm đà thơm ngậy.',
    tags: ['Sữa Chua', 'Cà Phê', 'Hà Nội'],
    variants: [
      {
        sizeName: 'Size Chuẩn',
        ingredients: [
          { ingredientId: 'ing_sua_chua', ingredientName: 'Sữa Chua Lên Men Vinamilk', quantity: 1, unit: 'hộp', costPrice: 7000 },
          { ingredientId: 'ing_sua_dac', ingredientName: 'Sữa Đặc', quantity: 15, unit: 'ml', costPrice: 30 },
          { ingredientId: 'ing_cot_cf', ingredientName: 'Cốt Cà Phê Phin', quantity: 20, unit: 'ml', costPrice: 45 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Đánh sữa chua với đá bi',
        description: 'Cho 1 hộp sữa chua, 15ml sữa đặc và đá bi vào ly hoặc shaker, đánh đều tay nhuyễn đá.',
        durationSeconds: 15,
      },
      {
        stepNumber: 2,
        title: 'Rưới cốt cà phê lên mặt',
        description: 'Rót 20ml cốt cà phê phin nguyên chất lên trên mặt đá tạo vệt màu nâu hấp dẫn.',
        durationSeconds: 10,
      },
    ],
  },

  // ==========================================
  // 6. NHÓM TOPPING & MẺ NẤU SẴN (TOPPING)
  // ==========================================
  {
    id: 'rec_tran_chau_den_hoang_gia',
    productId: 'top_tc_den',
    productName: 'Nấu Trân Châu Đen Hoàng Gia',
    category: 'Topping',
    sellingPrice: 10000,
    prepTimeMinutes: 45,
    difficulty: 'medium',
    description: 'Trân châu đen luộc chín dẻo dai từ bột sắn cao cấp, ủ sốt đường đen đậm vị giữ mềm 6 tiếng.',
    tags: ['Topping', 'Trân Châu', 'Nấu Mẻ'],
    variants: [
      {
        sizeName: '1 Phần Topping (40g)',
        ingredients: [
          { ingredientId: 'ing_tc_den', ingredientName: 'Trân Châu Đen Nấu Chín', quantity: 40, unit: 'g', costPrice: 40 },
          { ingredientId: 'ing_duong_den', ingredientName: 'Sốt Đường Đen Hàn Quốc', quantity: 10, unit: 'ml', costPrice: 50 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Múc trân châu vào ly',
        description: 'Dùng vá lỗ múc 1 vá 40g trân châu đường đen vào ly trước khi rót trà sữa.',
        durationSeconds: 10,
      },
    ],
    batchFormulas: [
      {
        id: 'bf_tran_chau_1kg',
        batchName: 'Nấu 1 mẻ Trân Châu Đen 1kg (Ủ dẻo 4-6 tiếng)',
        yieldServings: 25,
        teaType: 'Hạt Trân Châu Đen Cao Cấp Gia Uy',
        waterVolumeMl: 4000,
        waterTempCelsius: 100,
        brewTimeSeconds: 1800,
        shelfLifeHours: 4,
        ingredients: [
          { ingredientName: 'Hạt Trân Châu Đen Khô', quantity: 1000, unit: 'g' },
          { ingredientName: 'Nước Sôi Bùng 100°C', quantity: 4000, unit: 'ml' },
          { ingredientName: 'Đường Đen Hàn Quốc', quantity: 200, unit: 'g' },
        ],
        instructions: [
          'Đun sôi bùng 4L nước, thả 1kg trân châu vào khuấy đều đến khi hạt nổi lên.',
          'Hạ lửa vừa, luộc sôi trong 30 phút (khuấy mỗi 5 phút chống dính đáy nồi).',
          'Tắt bếp, đậy nắp ủ thêm 20 phút cho trân châu dẻo thấu tận tâm hạt.',
          'Rửa sạch nhớt bằng nước ấm, trộn 200g đường đen và ủ ở nhiệt độ phòng 4-6 tiếng.',
        ],
      },
    ],
  },
  {
    id: 'rec_thach_cu_nang_la_dua',
    productId: 'top_cu_nang',
    productName: 'Thạch Củ Năng Lá Dứa Giòn Rụm',
    category: 'Topping',
    sellingPrice: 12000,
    prepTimeMinutes: 30,
    difficulty: 'medium',
    description: 'Củ năng tươi cắt hạt lựu ngâm nước cốt lá dứa thơm nức, áo lớp bột năng mỏng luộc giòn sần sật.',
    tags: ['Thạch Tươi', 'Lá Dứa', 'Giòn Tan'],
    variants: [
      {
        sizeName: '1 Phần Topping (45g)',
        ingredients: [
          { ingredientId: 'ing_cu_nang', ingredientName: 'Thạch Củ Năng Lá Dứa Luộc Chín', quantity: 45, unit: 'g', costPrice: 50 },
          { ingredientId: 'ing_nuoc_duong', ingredientName: 'Nước Đường Ngâm', quantity: 10, unit: 'ml', costPrice: 20 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Múc thạch củ năng vào ly',
        description: 'Dùng vá lỗ múc 1 vá 45g thạch củ năng vào ly trước khi rót trà trái cây.',
        durationSeconds: 10,
      },
    ],
  },
];
