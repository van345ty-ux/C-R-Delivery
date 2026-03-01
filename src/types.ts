export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  purchaseCount: number;
  role: 'customer' | 'admin';
}

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  type: 'birthday' | 'loyalty' | 'promotion';
  valid_from: string;
  valid_to: string;
  active: boolean;
  usage_limit?: number;
  usage_count: number;
  user_id?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number | null;
  promotional_price_single?: number | null; // Novo campo para "Por apenas"
  badge_text?: string | null;
  image: string;
  description: string;
  category: string;
  available: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  observations?: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  items: CartItem[];
  total: number;
  deliveryFee: number;
  deliveryType: 'delivery' | 'pickup';
  paymentMethod: 'pix' | 'card' | 'cash';
  address?: string;
  status: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  couponUsed?: string;
  changeFor?: number | null; // Adicionado campo para o troco
}

export interface City {
  id: string;
  name: string;
  active: boolean;
}

export interface OperatingHour {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

export interface Highlight {
  id: string;
  name: string;
  price: number;
  image_url: string;
  border_color: string;
  order_index: number;
  shadow_size: number;
}