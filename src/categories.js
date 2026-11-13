// Each list is its own "Top 50" page at /top/<id>. A list runs several Creators API searches
// and keeps the 50 biggest markdowns. Edit keywords / searchIndex freely;
// minSavingPercent keeps only items that are actually discounted.
// Search index names: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/locale-reference
// Every search costs 2 API calls per refresh (2 pages of 10), so keep the total modest.
const s = (searchIndex, keywords, minSavingPercent = 25, extra = {}) => ({ searchIndex, keywords, minSavingPercent, ...extra });
// Price-cap lists: maxPrice (dollars) keeps only items at or under the cap. They also draw on every other search.
const capped = (keywords, max, pct = 20) => s('All', keywords, pct, { maxPrice: max * 100 });

export const CATEGORIES = [
  {
    id: 'her', label: 'For Her', icon: '💝', title: 'Top 50 Deals for Her',
    intro: 'Gifts and treats for her (wife, mom, sister, best friend), all marked down from their usual price.',
    searches: [s('FashionWomen', 'sweater'), s('Jewelry', 'women'), s('Beauty', 'gift set'), s('HomeAndKitchen', 'cozy blanket'), s('All', 'gifts for women', 30)],
  },
  {
    id: 'him', label: 'For Him', icon: '🧔', title: 'Top 50 Deals for Him',
    intro: 'Gifts for him (husband, dad, brother, boyfriend): tools, gadgets and clothes he will actually use, on sale today.',
    searches: [s('FashionMen', 'jacket'), s('ToolsAndHomeImprovement', 'tool set'), s('Electronics', 'gadgets for men'), s('SportsAndOutdoors', 'men'), s('All', 'gifts for men', 30)],
  },
  // Sub-lists of For Her (parent: 'her'): their own pages (/top/her-selfcare …), a second chip row on the For Her pages.
  {
    id: 'her-selfcare', parent: 'her', label: 'Self-Care', icon: '🛁', title: 'Top 50 Self-Care Deals for Her',
    intro: 'Spa sets, bath bombs, heated eye masks and massagers so she can finally relax, all marked down from their usual price.',
    searches: [s('Beauty', 'spa gift set', 20), s('Beauty', 'bath bombs', 20), s('HealthPersonalCare', 'massager', 20), s('All', 'self care gifts for women', 25)],
  },
  {
    id: 'her-cozy', parent: 'her', label: 'Cozy & Comfy', icon: '🧦', title: 'Top 50 Cozy Deals for Her',
    intro: 'Fuzzy slippers, throw blankets, robes and loungewear for the coziest Christmas morning, on sale today.',
    searches: [s('FashionWomen', 'slippers', 25), s('HomeAndKitchen', 'throw blanket', 25), s('FashionWomen', 'robe', 25), s('FashionWomen', 'lounge set', 25)],
  },
  {
    id: 'her-jewelry', parent: 'her', label: 'Jewelry', icon: '💍', title: 'Top 50 Jewelry Deals for Her',
    intro: 'Necklaces, earrings, bracelets and jewelry boxes she will love, with real discounts.',
    searches: [s('Jewelry', 'necklace for women', 25), s('Jewelry', 'earrings', 25), s('Jewelry', 'bracelet', 25), s('HomeAndKitchen', 'jewelry box', 25)],
  },
  // Sub-lists of For Him (parent: 'him'): each is its own page (/top/him-fishing …), shown as a second chip row on the
  // For Him pages, and their deals also feed the main For Him list.
  {
    id: 'him-sports', parent: 'him', label: 'Sports', icon: '🏈', title: 'Top 50 Sports Deals for Him',
    intro: 'Golf, football, basketball and game-day gear for the sports lover on your list, marked down from their usual price.',
    searches: [s('SportsAndOutdoors', 'golf', 20), s('SportsAndOutdoors', 'football', 20), s('SportsAndOutdoors', 'basketball', 20), s('All', 'sports gifts for men', 25)],
  },
  {
    id: 'him-fishing', parent: 'him', label: 'Fishing', icon: '🎣', title: 'Top 50 Fishing Deals for Him',
    intro: 'Rods, reels, tackle boxes and lures for the fisherman in your life, all on sale today.',
    searches: [s('SportsAndOutdoors', 'fishing rod and reel', 20), s('SportsAndOutdoors', 'fishing tackle box', 20), s('SportsAndOutdoors', 'fishing lures', 20)],
  },
  {
    id: 'him-fr', parent: 'him', label: 'FR Work Clothes', icon: '🔥', title: 'Top 50 FR Work Clothes Deals',
    intro: 'Flame-resistant (FR) shirts, pants, jackets and coveralls for work, marked down. Check the label for the rating your job requires (for example NFPA 2112 or the arc rating) before you buy.',
    searches: [s('FashionMen', 'flame resistant shirt', 15), s('FashionMen', 'flame resistant pants', 15), s('All', 'FR work jacket', 15), s('All', 'flame resistant coveralls', 15)],
  },
  {
    id: 'kids', label: 'For Kids', icon: '🧸', title: 'Top 50 Deals for Kids',
    intro: 'Toys, LEGO, games and gifts kids love, marked down from their usual price.',
    searches: [s('ToysAndGames', 'toys'), s('ToysAndGames', 'lego'), s('VideoGames', 'kids'), s('All', 'gifts for kids', 30)],
  },
  {
    id: 'under-10', label: 'Under $10', icon: '💸', title: 'Top 50 Gifts Under $10', maxPrice: 10,
    intro: 'Stocking stuffers and small gifts, all $10 or less and marked down from their usual price. Set your cap and stick to it.',
    searches: [capped('stocking stuffers', 10), capped('gifts under 10 dollars', 10)],
  },
  {
    id: 'under-25', label: 'Under $25', icon: '🎁', title: 'Top 50 Gifts Under $25', maxPrice: 25,
    intro: 'Gifts that look like more, all $25 or less and marked down. Great for coworkers, teachers and white elephant swaps.',
    searches: [capped('gifts under 25 dollars', 25), capped('white elephant gifts', 25)],
  },
  {
    id: 'under-50', label: 'Under $50', icon: '🛍️', title: 'Top 50 Gifts Under $50', maxPrice: 50,
    intro: 'Bigger gifts for the people at the top of your list, all $50 or less and marked down from their usual price.',
    searches: [capped('gifts under 50 dollars', 50)],
  },
  {
    id: 'tech', label: 'Electronics', icon: '🎧', title: 'Top 50 Electronics Deals',
    intro: 'Headphones, speakers, tablets, smart home and more, with real discounts.',
    searches: [s('Electronics', 'headphones', 20), s('Electronics', 'bluetooth speaker', 20), s('Electronics', 'tablet', 20), s('Electronics', 'smart home', 20), s('Computers', 'laptop', 15)],
  },
  {
    id: 'home', label: 'Home & Kitchen', icon: '🍳', title: 'Top 50 Home & Kitchen Deals',
    intro: 'Kitchen gadgets, cookware, bedding and organizing, all marked down.',
    searches: [s('HomeAndKitchen', 'kitchen'), s('HomeAndKitchen', 'air fryer', 20), s('HomeAndKitchen', 'bedding'), s('HomeAndKitchen', 'storage')],
  },
  {
    id: 'beauty', label: 'Beauty', icon: '💄', title: 'Top 50 Beauty Deals',
    intro: 'Skincare, makeup and hair tools on sale today.',
    searches: [s('Beauty', 'skincare'), s('Beauty', 'makeup'), s('Beauty', 'hair tools')],
  },
  {
    id: 'fashion', label: 'Fashion', icon: '👟', title: 'Top 50 Fashion Deals',
    intro: 'Shoes, bags and jackets marked down from their usual price.',
    searches: [s('Fashion', 'shoes', 30), s('Fashion', 'handbag', 30), s('Fashion', 'jacket', 30)],
  },
  {
    id: 'outdoors', label: 'Sports & Outdoors', icon: '⛺', title: 'Top 50 Sports & Outdoors Deals',
    intro: 'Fitness, camping and cycling gear on sale.',
    searches: [s('SportsAndOutdoors', 'fitness'), s('SportsAndOutdoors', 'camping'), s('SportsAndOutdoors', 'cycling')],
  },
];

// Extra searches that only feed the main Top 50 pool, to widen it beyond the lists above.
export const POOL_SEARCHES = [
  s('All', 'deal', 40),
  s('All', 'clearance', 40),
];

// The front page: the biggest savings across every search above.
export const TOP = { id: 'top', label: 'Top 50 Deals', icon: '🔥', size: 50 };
export const LIST_SIZE = 50;
