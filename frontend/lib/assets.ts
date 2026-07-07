// Assets index — dùng require() để Expo bundle tối ưu
export const ASSETS = {
  brand: {
    logoMark: require('../assets/brand/logo_mark.png'),
  },
  images: {
    foodPlaceholder: require('../assets/images/food_placeholder.png'),
    drinkPlaceholder: require('../assets/images/drink_placeholder.png'),
    dessertPlaceholder: require('../assets/images/dessert_placeholder.png'),
    emptyStateMenu: require('../assets/images/empty_state_menu.png'),
    emptyStateOrders: require('../assets/images/empty_state_orders.png'),
    errorState: require('../assets/images/error_state.png'),
    loadingFood: require('../assets/images/loading_food.png'),
    searchEmpty: require('../assets/images/search_empty.png'),
    // Category images
    categorySuaChua: require('../assets/images/category_sua_chua.png'),
    categoryTraChanh: require('../assets/images/category_tra_chanh.png'),
    categoryDoAnVat: require('../assets/images/category_do_an_vat.png'),
    categoryChe: require('../assets/images/category_che.png'),
    categoryTraSua: require('../assets/images/category_tra_sua.png'),
    categorySoda: require('../assets/images/category_soda.png'),
    categoryKem: require('../assets/images/category_kem.png'),
  },
  illustrations: {
    success: require('../assets/images/success_check.png'),
  },
} as const;
