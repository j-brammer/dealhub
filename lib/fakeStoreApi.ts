/**
 * Platzi Fake Store API (documented at https://fakeapi.platzi.com/).
 * Live base URL from their REST docs.
 */
const BASE = 'https://api.escuelajs.co/api/v1';

export type FakeStoreCategoryDto = {
  id: number;
  name: string;
  slug: string;
  image: string;
  creationAt?: string;
  updatedAt?: string;
};

export type FakeStoreProductDto = {
  id: number;
  title: string;
  slug: string;
  price: number;
  description: string;
  category: FakeStoreCategoryDto;
  images: string[];
  creationAt?: string;
  updatedAt?: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchCategories(): Promise<FakeStoreCategoryDto[]> {
  const res = await fetch(`${BASE}/categories`);
  return parseJson<FakeStoreCategoryDto[]>(res);
}

export async function fetchProducts(params: {
  offset: number;
  limit: number;
  categoryId?: number;
}): Promise<FakeStoreProductDto[]> {
  const q = new URLSearchParams({
    offset: String(params.offset),
    limit: String(params.limit),
  });
  if (params.categoryId != null) {
    q.set('categoryId', String(params.categoryId));
  }
  const res = await fetch(`${BASE}/products?${q}`);
  return parseJson<FakeStoreProductDto[]>(res);
}

export async function fetchProductById(id: number): Promise<FakeStoreProductDto> {
  const res = await fetch(`${BASE}/products/${id}`);
  return parseJson<FakeStoreProductDto>(res);
}
