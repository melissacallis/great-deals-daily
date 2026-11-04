// Each list is its own "Top 50" page at /top/<id>. A list runs several Creators API searches
// and keeps the 50 biggest markdowns. Edit keywords / searchIndex freely;
// minSavingPercent keeps only items that are actually discounted.
// Search index names: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/locale-reference
// Every search costs 2 API calls per refresh (2 pages of 10), so keep the total modest.
const s = (searchIndex, keywords, minSavingPercent = 25) => ({ searchIndex, keywords, minSavingPercent });

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
  {
    id: 'kids', label: 'For Kids', icon: '🧸', title: 'Top 50 Deals for Kids',
    intro: 'Toys, LEGO, games and gifts kids love, marked down from their usual price.',
    searches: [s('ToysAndGames', 'toys'), s('ToysAndGames', 'lego'), s('VideoGames', 'kids'), s('All', 'gifts for kids', 30)],
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
