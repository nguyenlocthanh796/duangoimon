// Assets index — dùng require() để Expo bundle tối ưu
// Lưu ý: Đã chuyển sang WebP để giảm tải (giảm 92% dung lượng)
export const ASSETS = {
  brand: {
    logoMark: require('../assets/brand/webp/logo_mark.webp'),
  },
  images: {
    foodPlaceholder: require('../assets/images/webp/food_placeholder.webp'),
    drinkPlaceholder: require('../assets/images/webp/drink_placeholder.webp'),
    dessertPlaceholder: require('../assets/images/webp/dessert_placeholder.webp'),
    emptyStateMenu: require('../assets/images/webp/empty_state_menu.webp'),
    emptyStateOrders: require('../assets/images/webp/empty_state_orders.webp'),
    errorState: require('../assets/images/webp/error_state.webp'),
    loadingFood: require('../assets/images/webp/loading_food.webp'),
    searchEmpty: require('../assets/images/webp/search_empty.webp'),
    // Category images
    categorySuaChua: require('../assets/images/webp/category_sua_chua.webp'),
    categoryTraChanh: require('../assets/images/webp/category_tra_chanh.webp'),
    categoryDoAnVat: require('../assets/images/webp/category_do_an_vat.webp'),
    categoryChe: require('../assets/images/webp/category_che.webp'),
    categoryTraSua: require('../assets/images/webp/category_tra_sua.webp'),
    categorySoda: require('../assets/images/webp/category_soda.webp'),
    categoryKem: require('../assets/images/webp/category_kem.webp'),
  },
  illustrations: {
    success: require('../assets/images/webp/success_check.webp'),
  },
} as const;
