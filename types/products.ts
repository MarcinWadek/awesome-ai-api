export interface ProductCreateRequest {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  category: string;
  imageUrl?: string | null;
}

export type ProductUpdateRequest = {
  [Field in keyof ProductCreateRequest]?: ProductCreateRequest[Field] | null;
};

export interface ProductResponse {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  category: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
