// Each category is a Creators API search. Edit keywords / searchIndex freely;
// minSavingPercent keeps only items that are actually discounted.
// Search index names: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/locale-reference
export const CATEGORIES = [
  { id: 'top',      label: 'Top Deals',      icon: '🔥', searchIndex: 'All',              keywords: 'deal',                minSavingPercent: 30 },
  { id: 'tech',     label: 'Electronics',    icon: '🎧', searchIndex: 'Electronics',      keywords: 'headphones speaker tablet', minSavingPercent: 20 },
  { id: 'home',     label: 'Home & Kitchen', icon: '🍳', searchIndex: 'HomeAndKitchen',   keywords: 'kitchen',             minSavingPercent: 25 },
  { id: 'fashion',  label: 'Fashion',        icon: '👟', searchIndex: 'Fashion',          keywords: 'shoes',               minSavingPercent: 30 },
  { id: 'beauty',   label: 'Beauty',         icon: '💄', searchIndex: 'Beauty',           keywords: 'skincare',            minSavingPercent: 25 },
  { id: 'toys',     label: 'Toys & Games',   icon: '🧸', searchIndex: 'ToysAndGames',     keywords: 'toys',                minSavingPercent: 25 },
  { id: 'outdoors', label: 'Sports & Outdoors', icon: '⛺', searchIndex: 'SportsAndOutdoors', keywords: 'fitness camping',  minSavingPercent: 25 },
];
