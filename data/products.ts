export type Product = {
  id: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  reviewCount: number;
  /** Category slug for the current feed / lane (e.g. electronics, clothes). */
  categoryId: string;
  /** eBay category id hint when the lane maps to a taxonomy id. */
  categoryNumericId?: number;
  /** Primary product image (https). */
  imageUrl?: string;
  imageUrls?: string[];
  description?: string;
  slug?: string;
  tag?: string;
};

export {
  getProductImageCaption,
  getProductImageUrl,
} from './productImages';
