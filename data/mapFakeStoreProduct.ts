import type { FakeStoreProductDto } from '@/lib/fakeStoreApi';

import type { Product } from './products';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isHttpUrl(s: string): boolean {
  return /^https:\/\//i.test(s.trim());
}

function pickImageUrl(dto: FakeStoreProductDto): string | undefined {
  const fromProduct = (dto.images ?? []).find((u) => typeof u === 'string' && isHttpUrl(u));
  if (fromProduct) return fromProduct;
  const cat = dto.category?.image;
  if (typeof cat === 'string' && isHttpUrl(cat)) return cat;
  return undefined;
}

/** Curated slugs from the stable Platzi dataset; skips noisy user-created categories. */
export const ALLOWED_CATEGORY_SLUGS = new Set([
  'clothes',
  'electronics',
  'furniture',
  'shoes',
  'miscellaneous',
  'fashion',
]);

export function mapFakeStoreProduct(dto: FakeStoreProductDto): Product {
  const slug = dto.category?.slug ?? 'miscellaneous';
  const idNum = dto.id;
  const compareAt = round2(dto.price * (1.12 + (idNum % 7) * 0.03));
  const rating = round2(3.7 + (idNum % 12) / 10);
  const reviewCount = 500 + (idNum * 7919) % 89000;
  const tag =
    idNum % 11 === 0
      ? 'Lightning deal'
      : idNum % 9 === 0
        ? 'Best seller'
        : idNum % 13 === 0
          ? 'New'
          : undefined;

  return {
    id: String(dto.id),
    title: dto.title.trim() || 'Product',
    price: round2(Number(dto.price) || 0),
    compareAtPrice: compareAt > dto.price ? compareAt : undefined,
    rating,
    reviewCount,
    categoryId: slug,
    categoryNumericId: dto.category?.id,
    imageUrl: pickImageUrl(dto),
    imageUrls: (dto.images ?? []).filter((u) => typeof u === 'string' && isHttpUrl(u)),
    description: dto.description,
    slug: dto.slug,
    tag,
  };
}
