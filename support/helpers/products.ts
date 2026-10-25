import { expect } from '@playwright/test';
import type { ProductsClient } from '../../clients/products.client';
import type { ProductCreateRequest, ProductResponse } from '../../types/products';

export async function createProduct(
  products: ProductsClient, data: ProductCreateRequest, token: string,
): Promise<ProductResponse> {
  const response = await products.createProduct(data, token);
  expect(response.status()).toBe(201);
  return response.json();
}

export async function deleteProductsByName(products: ProductsClient, token: string, names: string[]): Promise<void> {
  const response = await products.getProducts(token);
  expect(response.status()).toBe(200);
  const catalogue = (await response.json()) as ProductResponse[];

  // Names are known before creation, so cleanup also handles a lost creation response.
  for (const product of catalogue.filter(product => names.includes(product.name))) {
    const cleanup = await products.deleteProduct(product.id, token);
    expect([204, 404]).toContain(cleanup.status());
  }
}
