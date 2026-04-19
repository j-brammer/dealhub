export type StoreCategory = {
  id: string;
  slug: string;
  label: string;
  emoji: string;
  /** eBay category id hint for display; `0` when lane is keyword-only (`all` / `miscellaneous`). */
  numericId: number;
  image: string;
};

/** Curated browse lanes — maps to `backend/src/ebayCategoryMap.js` (keep in sync). */
export const EBAY_STORE_CATEGORIES: StoreCategory[] = [
  {
    id: 'all',
    slug: 'all',
    label: 'All',
    emoji: '🛍️',
    numericId: 0,
    image: 'https://picsum.photos/seed/dealhub-all/400/300',
  },
  {
    id: 'clothes',
    slug: 'clothes',
    label: 'Clothes',
    emoji: '👕',
    numericId: 11450,
    image: 'https://picsum.photos/seed/dealhub-clothes/400/300',
  },
  {
    id: 'electronics',
    slug: 'electronics',
    label: 'Electronics',
    emoji: '⚡',
    numericId: 58058,
    image: 'https://picsum.photos/seed/dealhub-electronics/400/300',
  },
  {
    id: 'furniture',
    slug: 'furniture',
    label: 'Furniture',
    emoji: '🛋️',
    numericId: 20444,
    image: 'https://picsum.photos/seed/dealhub-furniture/400/300',
  },
  {
    id: 'shoes',
    slug: 'shoes',
    label: 'Shoes',
    emoji: '👟',
    numericId: 93427,
    image: 'https://picsum.photos/seed/dealhub-shoes/400/300',
  },
  {
    id: 'miscellaneous',
    slug: 'miscellaneous',
    label: 'Miscellaneous',
    emoji: '📦',
    numericId: 0,
    image: 'https://picsum.photos/seed/dealhub-misc/400/300',
  },
  {
    id: 'fashion',
    slug: 'fashion',
    label: 'Fashion',
    emoji: '✨',
    numericId: 15724,
    image: 'https://picsum.photos/seed/dealhub-fashion/400/300',
  },
].sort((a, b) => {
  if (a.slug === 'all') return -1;
  if (b.slug === 'all') return 1;
  return a.label.localeCompare(b.label);
});

