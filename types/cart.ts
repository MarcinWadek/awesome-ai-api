export interface CartItem {
  productId: number;
  quantity: number;
}

export interface CartResponse {
  username: string;
  items: CartItem[];
  totalPrice: number;
  totalItems: number;
}
