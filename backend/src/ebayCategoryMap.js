/**
 * Maps Dealhub category slugs to eBay Browse `item_summary/search` params.
 * At least one of `q` or `category_ids` is required for search.
 * @type {Record<string, { q?: string; category_ids?: string }>}
 */
export const EBAY_SEARCH_BY_SLUG = {
  all: { q: 'home decor' },
  clothes: { category_ids: '11450' },
  electronics: { category_ids: '58058' },
  furniture: { category_ids: '20444' },
  shoes: { category_ids: '93427' },
  miscellaneous: { q: 'collectibles' },
  fashion: { category_ids: '15724' },
};

export const ALLOWED_SLUGS = new Set(Object.keys(EBAY_SEARCH_BY_SLUG));
