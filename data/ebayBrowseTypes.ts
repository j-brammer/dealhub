/**
 * Subset of eBay Browse `item_summary/search` refinement response used in the app.
 * @see https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
 */

export type EbayCategoryDistribution = {
  categoryName?: string;
  categoryId?: string;
  refinementHref?: string;
  matchCount?: number;
};

export type EbayConditionDistribution = {
  condition?: string;
  conditionId?: string;
  refinementHref?: string;
  matchCount?: number;
};

export type EbayBuyingOptionDistribution = {
  buyingOption?: string;
  matchCount?: number;
  refinementHref?: string;
};

export type EbayAspectValueDistribution = {
  localizedAspectValue?: string;
  refinementHref?: string;
  matchCount?: number;
};

export type EbayAspectDistribution = {
  localizedAspectName?: string;
  aspectValueDistributions?: EbayAspectValueDistribution[];
};

export type EbaySearchRefinement = {
  dominantCategoryId?: string;
  categoryDistributions?: EbayCategoryDistribution[];
  conditionDistributions?: EbayConditionDistribution[];
  buyingOptionDistributions?: EbayBuyingOptionDistribution[];
  aspectDistributions?: EbayAspectDistribution[];
};

export type ParsedRefinementHref = {
  q?: string;
  category_ids?: string;
  filter?: string;
  aspect_filter?: string;
};

/** Parse refinement URLs returned by eBay (absolute) into query fields we can reuse. */
export function parseRefinementHref(href: string): ParsedRefinementHref {
  try {
    const u = new URL(href);
    return {
      q: u.searchParams.get('q') ?? undefined,
      category_ids: u.searchParams.get('category_ids') ?? undefined,
      filter: u.searchParams.get('filter') ?? undefined,
      aspect_filter: u.searchParams.get('aspect_filter') ?? undefined,
    };
  } catch {
    return {};
  }
}
