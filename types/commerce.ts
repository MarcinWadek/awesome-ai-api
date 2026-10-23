export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Order {
  id: number;
  username: string;
  items: { id: number; productId: number; productName: string; quantity: number; unitPrice: number; totalPrice: number }[];
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: Address;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export interface InventoryItem {
  productId: number;
  name: string;
  category: string;
  availableQuantity: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  lastChangedAt: string;
}

export interface Adjustment {
  delta: number;
  reason: string;
  requestId: string;
}

export interface Movement {
  id: number;
  productId: number;
  orderId: number | null;
  type: 'INITIAL_STOCK' | 'ADMIN_ADJUSTMENT' | 'ORDER_DEDUCTED' | 'ORDER_RESTORED';
  delta: number;
  quantityAfter: number;
  actor: string;
  reason: string;
  requestId: string | null;
  createdAt: string;
}
