import { randomUUID } from 'node:crypto';
import type { ProductCreateRequest } from '../types/products';

export function productData(overrides: Partial<ProductCreateRequest> = {}): ProductCreateRequest {
  return {
    name: `api-test-${randomUUID()}`,
    description: 'Disposable API test product',
    price: 12.34,
    stockQuantity: 7,
    category: 'API tests',
    imageUrl: null,
    ...overrides,
  };
}
