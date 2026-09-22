export const RECIPE_TEMPLATES = [
  {
    templateName: 'Trà Chanh / Trà Tắc Chuẩn Vị',
    category: 'Trà Trái Cây',
    sellingPrice: 25000,
    prepTimeMinutes: 2,
    difficulty: 'easy' as const,
    description: 'Cốt trà lài thơm thanh mát, chua ngọt dịu từ chanh tươi và nước đường vàng.',
    tags: ['Trà Chanh', 'Giải Nhiệt', 'Bán Chạy'],
    variants: [
      {
        sizeName: 'Size Vừa (M)',
        ingredients: [
          { ingredientId: 'ing_tra_lai', ingredientName: 'Cốt Trà Xanh Hoa Lài', quantity: 150, unit: 'ml', costPrice: 12 },
          { ingredientId: 'ing_nuoc_duong', ingredientName: 'Nước Đường Vàng', quantity: 25, unit: 'ml', costPrice: 20 },
          { ingredientId: 'ing_chanh_tuoi', ingredientName: 'Nước Cốt Chanh Tươi', quantity: 15, unit: 'ml', costPrice: 60 },
          { ingredientId: 'ing_lat_chanh', ingredientName: 'Chanh Lát Decor', quantity: 2, unit: 'lát', costPrice: 300 },
        ],
      },
      {
        sizeName: 'Size Lớn (L)',
        ingredients: [
          { ingredientId: 'ing_tra_lai', ingredientName: 'Cốt Trà Xanh Hoa Lài', quantity: 200, unit: 'ml', costPrice: 12 },
          { ingredientId: 'ing_nuoc_duong', ingredientName: 'Nước Đường Vàng', quantity: 35, unit: 'ml', costPrice: 20 },
          { ingredientId: 'ing_chanh_tuoi', ingredientName: 'Nước Cốt Chanh Tươi', quantity: 22, unit: 'ml', costPrice: 60 },
          { ingredientId: 'ing_lat_chanh', ingredientName: 'Chanh Lát Decor', quantity: 3, unit: 'lát', costPrice: 300 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Đong cốt trà & chanh đường',
        description: 'Cho 150ml cốt trà lài, 25ml nước đường và 15ml nước cốt chanh vào bình shaker.',
        durationSeconds: 15,
        tip: 'Vắt chanh nhẹ tay không vắt sát vỏ để tránh tiết tinh dầu đắng.',
      },
      {
        stepNumber: 2,
        title: 'Thêm đá & Lắc đều (Shake)',
        description: 'Đổ đá bi 2/3 shaker, lắc đều tay 10-12 lần tạo bọt mịn.',
        durationSeconds: 15,
      },
      {
        stepNumber: 3,
        title: 'Rót ra ly & Thả lát chanh',
        description: 'Rót ra ly, thả 2 lát chanh tươi mỏng lên trên mặt đá.',
        durationSeconds: 10,
      },
    ],
    batchFormulas: [
      {
        id: 'bf_tra_lai_5l',
        batchName: 'Ủ bình Cốt Trà Xanh Hoa Lài 5 Lít',
        yieldServings: 35,
        teaType: 'Trà Xanh Hoa Lài Lộc Phát',
        teaQuantityGrams: 120,
        waterVolumeMl: 5000,
        waterTempCelsius: 85,
        brewTimeSeconds: 600,
        iceShockGrams: 800,
        shelfLifeHours: 4,
        ingredients: [
          { ingredientName: 'Trà Xanh Hoa Lài Khô', quantity: 120, unit: 'g' },
          { ingredientName: 'Nước Sôi 85°C', quantity: 5000, unit: 'ml' },
          { ingredientName: 'Đá Bi Sốc Nhiệt', quantity: 800, unit: 'g' },
        ],
        instructions: [
          'Đun sôi 5L nước, để nguội về 85°C.',
          'Đổ 120g trà lài vào túi lọc hoặc bình ủ, đậy kín nắp ủ đúng 10 phút.',
          'Hết giờ lấy túi trà ra, thêm 800g đá bi làm lạnh sốc (Shocking cold) ngay lập tức.',
          'Bảo quản trong bình giữ nhiệt, dùng ngon nhất trong 4 tiếng đầu ca.',
        ],
      },
    ],
  },
  {
    templateName: 'Trà Sữa Truyền Thống Đài Loan',
    category: 'Trà Sữa',
    sellingPrice: 35000,
    prepTimeMinutes: 2,
    difficulty: 'easy' as const,
    description: 'Cốt hồng trà nướng đậm đà hòa quyện bột sữa béo ngậy.',
    tags: ['Trà Sữa', 'Truyền Thống'],
    variants: [
      {
        sizeName: 'Size Vừa (M)',
        ingredients: [
          { ingredientId: 'ing_cot_tra_sua', ingredientName: 'Cốt Trà Sữa Pha Sẵn', quantity: 160, unit: 'ml', costPrice: 35 },
          { ingredientId: 'ing_nuoc_duong', ingredientName: 'Nước Đường Nâu', quantity: 15, unit: 'ml', costPrice: 20 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Đong trà sữa & đường',
        description: 'Đong 160ml cốt trà sữa và 15ml nước đường vào shaker.',
        durationSeconds: 10,
      },
      {
        stepNumber: 2,
        title: 'Lắc đá lạnh buốt',
        description: 'Thêm đá bi đầy 2/3 bình shaker và lắc đều 12 lần.',
        durationSeconds: 15,
      },
    ],
    batchFormulas: [
      {
        id: 'bf_tra_sua_5l',
        batchName: 'Nấu mẻ Cốt Trà Sữa Béo Ngậy 5 Lít',
        yieldServings: 30,
        teaType: 'Hồng Trà Đặc Biệt / Trà Đen Số 9',
        teaQuantityGrams: 150,
        waterVolumeMl: 4000,
        waterTempCelsius: 95,
        brewTimeSeconds: 900,
        shelfLifeHours: 8,
        ingredients: [
          { ingredientName: 'Hồng Trà Đặc Biệt', quantity: 150, unit: 'g' },
          { ingredientName: 'Nước Sôi 95°C', quantity: 4000, unit: 'ml' },
          { ingredientName: 'Bột Béo Cao Cấp B-One', quantity: 450, unit: 'g' },
          { ingredientName: 'Sữa Đặc Ngôi Sao Phương Nam', quantity: 200, unit: 'g' },
        ],
        instructions: [
          'Ủ 150g hồng trà với 4L nước sôi 95°C trong 15 phút đậy kín nắp.',
          'Vớt bỏ bã trà, cho 450g bột béo và 200g sữa đặc vào khuấy tan 1 chiều.',
          'Để nguội tự nhiên và cho vào tủ mát bảo quản 8 - 24 tiếng.',
        ],
      },
    ],
  },
  {
    templateName: 'Cà Phê Phin / Espresso Đậm Đà',
    category: 'Cà Phê',
    sellingPrice: 22000,
    prepTimeMinutes: 2,
    difficulty: 'easy' as const,
    description: 'Cốt cà phê Robusta rang mộc thơm nồng, sánh đậm.',
    tags: ['Cà Phê', 'Buổi Sáng'],
    variants: [
      {
        sizeName: 'Size Chuẩn',
        ingredients: [
          { ingredientId: 'ing_cot_cf', ingredientName: 'Cốt Cà Phê Phin Đậm', quantity: 45, unit: 'ml', costPrice: 45 },
          { ingredientId: 'ing_sua_dac', ingredientName: 'Sữa Đặc Có Đường', quantity: 25, unit: 'ml', costPrice: 30 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Rót sữa đặc & Cốt cà phê',
        description: 'Cho 25ml sữa đặc vào đáy ly, rót 45ml cốt cà phê phin lên trên.',
        durationSeconds: 15,
      },
      {
        stepNumber: 2,
        title: 'Đánh bọt & Thêm đá',
        description: 'Dùng cây đánh bọt tạo lớp foam mịn phía trên, xúc đầy đá bi.',
        durationSeconds: 20,
      },
    ],
    batchFormulas: [
      {
        id: 'bf_cf_phin_lon',
        batchName: 'Ủ Phin Lớn 500g Cà Phê Mộc (Đầu Ca Sáng)',
        yieldServings: 25,
        teaType: 'Cà Phê Robusta Buôn Ma Thuột Rang Vừa',
        teaQuantityGrams: 500,
        waterVolumeMl: 1200,
        waterTempCelsius: 95,
        brewTimeSeconds: 1200,
        shelfLifeHours: 8,
        ingredients: [
          { ingredientName: 'Bột Cà Phê Robusta Xay Vừa', quantity: 500, unit: 'g' },
          { ingredientName: 'Nước Sôi 95°C (Ủ nở)', quantity: 300, unit: 'ml' },
          { ingredientName: 'Nước Sôi 95°C (Chiết xuất)', quantity: 900, unit: 'ml' },
        ],
        instructions: [
          'Cho 500g bột cà phê vào phin lớn, nén nhẹ tấm gài.',
          'Rót 300ml nước sôi ủ nở trong 5 phút.',
          'Rót tiếp 900ml nước sôi, đậy nắp để cà phê nhỏ giọt chậm trong 15-20 phút.',
          'Thu được ~900ml cốt cà phê đậm đặc bảo quản ngăn mát tủ lạnh.',
        ],
      },
    ],
  },
  {
    templateName: 'Nấu Trân Châu Đen Hoàng Gia',
    category: 'Topping',
    sellingPrice: 10000,
    prepTimeMinutes: 40,
    difficulty: 'medium' as const,
    description: 'Trân châu dẻo dai từ bột sắn, ngào đường đen thơm ngậy.',
    tags: ['Topping', 'Bán Kèm'],
    variants: [
      {
        sizeName: '1 Phần Topping (40g)',
        ingredients: [
          { ingredientId: 'ing_tc_den', ingredientName: 'Trân Châu Đen Nấu Chín', quantity: 40, unit: 'g', costPrice: 40 },
          { ingredientId: 'ing_duong_den', ingredientName: 'Sốt Đường Đen', quantity: 10, unit: 'ml', costPrice: 50 },
        ],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Múc trân châu vào đáy ly',
        description: 'Dùng vá lỗ múc 1 vá 40g trân châu đường đen vào ly trước khi rót trà.',
        durationSeconds: 10,
      },
    ],
    batchFormulas: [
      {
        id: 'bf_tran_chau_1kg',
        batchName: 'Nấu 1 mẻ Trân Châu Đen 1kg (Ủ dẻo 4 tiếng)',
        yieldServings: 25,
        teaType: 'Hạt Trân Châu Đen Gia Uy / Xuân Thịnh',
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
          'Hạ lửa vừa, luộc sôi trong 30 phút (khuấy mỗi 5 phút chống dính đáy).',
          'Tắt bếp, đậy nắp ủ thêm 20 phút cho trân châu dẻo thấu.',
          'Rửa sạch nhớt bằng nước ấm, trộn 200g đường đen và bảo quản ở nhiệt độ phòng trong 4-6 tiếng.',
        ],
      },
    ],
  },
];
