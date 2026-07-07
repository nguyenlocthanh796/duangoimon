export interface SizeOption {
  name: string;
  price: number;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  sizes?: SizeOption[];
  toppings?: Topping[];
}

export interface CartItem extends MenuItem {
  cartItemId: string;
  qty: number;
  unitPrice: number;
  note?: string;
  selectedSize?: string;
  selectedToppings?: string[];
  isSent?: boolean;
  serviceType?: 'dine_in' | 'takeaway';
  orderRound?: number;
  status?: string;
  cancelReason?: string;
  selected?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}
