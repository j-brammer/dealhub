/**
 * eBay US marketplace default category tree — level-1 (department) nodes.
 * IDs align with the Commerce Taxonomy default tree for EBAY_US (see eBay developer docs).
 */

export type StoreCategory = {
  /** eBay category id, or `all` for marketplace-wide keyword search */
  id: string;
  slug: string;
  label: string;
  emoji: string;
  numericId: number;
  image: string;
};

const EMOJI: Record<string, string> = {
  all: '🛍️',
  '1': '🏺',
  '99': '📦',
  '237': '🧸',
  '260': '✉️',
  '267': '📚',
  '281': '💎',
  '293': '📺',
  '316': '🛠️',
  '550': '🎨',
  '619': '🎸',
  '625': '📷',
  '870': '🏺',
  '888': '⚽',
  '220': '🧩',
  '1249': '🎮',
  '1281': '🐾',
  '1305': '🎫',
  '14339': '✂️',
  '15032': '📱',
  '11116': '🪙',
  '11232': '🎬',
  '11233': '🎵',
  '11450': '👕',
  '11700': '🏡',
  '12576': '🏭',
  '172008': '🎁',
  '20081': '🏛️',
  '26395': '💄',
  '2984': '👶',
  '3252': '✈️',
  '58058': '💻',
  '6000': '🚗',
  '64482': '🏆',
  '10542': '🏠',
  '45100': '🎭',
};

const RAW: Array<{ id: string; label: string }> = [
  { id: '1', label: 'Collectibles' },
  { id: '99', label: 'Everything Else' },
  { id: '20081', label: 'Antiques' },
  { id: '550', label: 'Art' },
  { id: '2984', label: 'Baby' },
  { id: '267', label: 'Books & Magazines' },
  { id: '12576', label: 'Business & Industrial' },
  { id: '625', label: 'Cameras & Photo' },
  { id: '15032', label: 'Cell Phones & Accessories' },
  { id: '11450', label: 'Clothing, Shoes & Accessories' },
  { id: '11116', label: 'Coins & Paper Money' },
  { id: '58058', label: 'Computers/Tablets & Networking' },
  { id: '293', label: 'Consumer Electronics' },
  { id: '14339', label: 'Crafts' },
  { id: '237', label: 'Dolls & Bears' },
  { id: '45100', label: 'Entertainment Memorabilia' },
  { id: '172008', label: 'Gift Cards & Coupons' },
  { id: '26395', label: 'Health & Beauty' },
  { id: '11700', label: 'Home & Garden' },
  { id: '281', label: 'Jewelry & Watches' },
  { id: '11232', label: 'Movies & TV' },
  { id: '11233', label: 'Music' },
  { id: '619', label: 'Musical Instruments & Gear' },
  { id: '1281', label: 'Pet Supplies' },
  { id: '870', label: 'Pottery & Glass' },
  { id: '10542', label: 'Real Estate' },
  { id: '316', label: 'Specialty Services' },
  { id: '888', label: 'Sporting Goods' },
  { id: '64482', label: 'Sports Mem, Cards & Fan Shop' },
  { id: '260', label: 'Stamps' },
  { id: '1305', label: 'Tickets & Experiences' },
  { id: '220', label: 'Toys & Hobbies' },
  { id: '3252', label: 'Travel' },
  { id: '1249', label: 'Video Games & Consoles' },
  { id: '6000', label: 'eBay Motors' },
];

/** Default `q` tokens for Browse when `category_ids` is an L1 department (eBay requires `q` with top-level categories). */
export function defaultKeywordsForCategoryLabel(label: string): string {
  const cleaned = label.replace(/&/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(' ').filter(Boolean);
  return parts.slice(0, 2).join(' ').slice(0, 40);
}

function row(r: { id: string; label: string }): StoreCategory {
  const id = r.id;
  const slug = id;
  const emoji = EMOJI[id] ?? '🏷️';
  const n = Number.parseInt(id, 10);
  return {
    id,
    slug,
    label: r.label,
    emoji,
    numericId: Number.isFinite(n) ? n : 0,
    image: `https://picsum.photos/seed/ebay-cat-${id}/400/300`,
  };
}

const DEPARTMENTS = [...RAW].sort((a, b) => a.label.localeCompare(b.label)).map(row);

export const EBAY_ALL_CATEGORY: StoreCategory = {
  id: 'all',
  slug: 'all',
  label: 'All',
  emoji: EMOJI.all,
  numericId: 0,
  image: 'https://picsum.photos/seed/ebay-all/400/300',
};

/** All US root departments plus an `All` pseudo-lane (keyword search across the marketplace). */
export const EBAY_US_ROOT_CATEGORIES: StoreCategory[] = [EBAY_ALL_CATEGORY, ...DEPARTMENTS];
