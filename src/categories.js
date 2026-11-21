// Each list is its own "Top 100" page at /top/<id>. A list runs several Creators API searches
// and keeps the 50 biggest markdowns. Edit keywords / searchIndex freely;
// minSavingPercent keeps only items that are actually discounted.
// Search index names: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/locale-reference
// Every search costs 2 API calls per refresh (2 pages of 10), so keep the total modest.
const s = (searchIndex, keywords, minSavingPercent = 25, extra = {}) => ({ searchIndex, keywords, minSavingPercent, ...extra });
// explore: extra searches taken in turns, a few per refresh, so the lists keep finding products they haven't shown yet.
// Price-cap lists: maxPrice (dollars) keeps only items at or under the cap. They also draw on every other search.
const capped = (keywords, max, pct = 20) => s('All', keywords, pct, { maxPrice: max * 100 });

export const CATEGORIES = [
  {
    id: 'her', label: 'For Her', icon: '💝', title: 'Top 100 Deals for Her',
    intro: 'Gifts and treats for her (wife, mom, sister, best friend), all marked down from their usual price.',
    searches: [s('FashionWomen', 'sweater'), s('Jewelry', 'women'), s('Beauty', 'gift set'), s('HomeAndKitchen', 'cozy blanket'), s('All', 'gifts for women', 30), s('FashionWomen', 'boots'), s('Beauty', 'perfume', 20)],
    explore: [s('FashionWomen', 'cardigan'), s('Beauty', 'makeup brush set'), s('HomeAndKitchen', 'mug'), s('FashionWomen', 'leggings'), s('Jewelry', 'watch for women'), s('Beauty', 'hair dryer brush', 20), s('FashionWomen', 'handbag'), s('All', 'christmas gifts for mom', 30)],
  },
  {
    id: 'him', label: 'For Him', icon: '🧔', title: 'Top 100 Deals for Him',
    intro: 'Gifts for him (husband, dad, brother, boyfriend): tools, gadgets and clothes he will actually use, on sale today.',
    searches: [s('FashionMen', 'jacket'), s('ToolsAndHomeImprovement', 'tool set'), s('Electronics', 'gadgets for men'), s('SportsAndOutdoors', 'men'), s('All', 'gifts for men', 30), s('FashionMen', 'hoodie'), s('Electronics', 'wireless earbuds', 20)],
    explore: [s('FashionMen', 'flannel shirt'), s('ToolsAndHomeImprovement', 'drill', 20), s('Electronics', 'smart watch for men', 20), s('FashionMen', 'boots'), s('SportsAndOutdoors', 'knife', 20), s('All', 'christmas gifts for dad', 30), s('FashionMen', 'wallet'), s('Electronics', 'power bank', 20)],
  },
  // Sub-lists of For Her (parent: 'her'): their own pages (/top/her-selfcare …), a second chip row on the For Her pages.
  {
    id: 'her-selfcare', parent: 'her', label: 'Self-Care', icon: '🛁', title: 'Top 100 Self-Care Deals for Her',
    intro: 'Spa sets, bath bombs, heated eye masks and massagers so she can finally relax, all marked down from their usual price.',
    searches: [s('Beauty', 'spa gift set', 20), s('Beauty', 'bath bombs', 20), s('HealthPersonalCare', 'massager', 20), s('All', 'self care gifts for women', 25), s('Beauty', 'candle gift set', 20), s('HealthPersonalCare', 'heated eye mask', 20)],
    explore: [s('Beauty', 'face mask', 20), s('HealthPersonalCare', 'foot spa', 20), s('Beauty', 'lip care', 20), s('HomeAndKitchen', 'essential oil diffuser', 20), s('Beauty', 'body lotion gift', 20), s('HealthPersonalCare', 'neck massager', 20)],
  },
  {
    id: 'her-cozy', parent: 'her', label: 'Cozy & Comfy', icon: '🧦', title: 'Top 100 Cozy Deals for Her',
    intro: 'Fuzzy slippers, throw blankets, robes and loungewear for the coziest Christmas morning, on sale today.',
    searches: [s('FashionWomen', 'slippers', 25), s('HomeAndKitchen', 'throw blanket', 25), s('FashionWomen', 'robe', 25), s('FashionWomen', 'lounge set', 25), s('FashionWomen', 'pajama set', 25), s('HomeAndKitchen', 'electric blanket', 20)],
    explore: [s('FashionWomen', 'fuzzy socks', 25), s('HomeAndKitchen', 'sherpa blanket', 25), s('FashionWomen', 'oversized sweatshirt', 25), s('FashionWomen', 'house slippers', 25), s('HomeAndKitchen', 'heated blanket', 20), s('FashionWomen', 'fleece pajamas', 25)],
  },
  {
    id: 'her-jewelry', parent: 'her', label: 'Jewelry', icon: '💍', title: 'Top 100 Jewelry Deals for Her',
    intro: 'Necklaces, earrings, bracelets and jewelry boxes she will love, with real discounts.',
    searches: [s('Jewelry', 'necklace for women', 25), s('Jewelry', 'earrings', 25), s('Jewelry', 'bracelet', 25), s('HomeAndKitchen', 'jewelry box', 25), s('Jewelry', 'ring', 25), s('Jewelry', 'jewelry set', 25)],
    explore: [s('Jewelry', 'anklet', 25), s('Jewelry', 'charm bracelet', 25), s('Jewelry', 'pearl earrings', 25), s('Jewelry', 'birthstone necklace', 25), s('Jewelry', 'hoop earrings', 25), s('Jewelry', 'name necklace', 25)],
  },
  // Sub-lists of For Him (parent: 'him'): each is its own page (/top/him-fishing …), shown as a second chip row on the
  // For Him pages, and their deals also feed the main For Him list.
  {
    id: 'him-sports', parent: 'him', label: 'Sports', icon: '🏈', title: 'Top 100 Sports Deals for Him',
    intro: 'Golf, football, basketball and game-day gear for the sports lover on your list, marked down from their usual price.',
    searches: [s('SportsAndOutdoors', 'golf', 20), s('SportsAndOutdoors', 'football', 20), s('SportsAndOutdoors', 'basketball', 20), s('All', 'sports gifts for men', 25), s('SportsAndOutdoors', 'baseball', 20), s('SportsAndOutdoors', 'pickleball', 20)],
    explore: [s('SportsAndOutdoors', 'golf balls', 20), s('SportsAndOutdoors', 'tennis', 20), s('SportsAndOutdoors', 'soccer', 20), s('SportsAndOutdoors', 'gym bag', 20), s('SportsAndOutdoors', 'sports fan gear', 20), s('SportsAndOutdoors', 'disc golf', 20)],
  },
  {
    id: 'him-fishing', parent: 'him', label: 'Fishing', icon: '🎣', title: 'Top 100 Fishing Deals for Him',
    intro: 'Rods, reels, tackle boxes and lures for the fisherman in your life, all on sale today.',
    searches: [s('SportsAndOutdoors', 'fishing rod and reel', 20), s('SportsAndOutdoors', 'fishing tackle box', 20), s('SportsAndOutdoors', 'fishing lures', 20), s('SportsAndOutdoors', 'fishing line', 20), s('SportsAndOutdoors', 'fishing gear', 20), s('SportsAndOutdoors', 'fishing waders', 15)],
    explore: [s('SportsAndOutdoors', 'fishing hooks', 20), s('SportsAndOutdoors', 'fish finder', 15), s('SportsAndOutdoors', 'fishing pliers', 20), s('SportsAndOutdoors', 'fishing net', 20), s('SportsAndOutdoors', 'fly fishing', 15), s('SportsAndOutdoors', 'ice fishing', 15)],
  },
  {
    id: 'him-hunting', parent: 'him', label: 'Hunting', icon: '🦌', title: 'Top 100 Hunting Deals for Him',
    intro: 'Trail cameras, camo, hunting boots, blinds, game calls and gear for the hunter in your life, all marked down today.',
    searches: [s('SportsAndOutdoors', 'hunting gear', 20), s('SportsAndOutdoors', 'trail camera', 20), s('SportsAndOutdoors', 'camo hunting clothes', 20), s('SportsAndOutdoors', 'hunting blind', 20), s('SportsAndOutdoors', 'game call', 20), s('SportsAndOutdoors', 'hunting boots', 20), s('SportsAndOutdoors', 'binoculars', 20)],
    explore: [s('SportsAndOutdoors', 'hunting knife', 20), s('SportsAndOutdoors', 'scent eliminator', 20), s('SportsAndOutdoors', 'tree stand', 15), s('SportsAndOutdoors', 'hand warmers', 20), s('SportsAndOutdoors', 'rangefinder', 15), s('SportsAndOutdoors', 'hunting backpack', 20)],
  },
  {
    id: 'him-fr', parent: 'him', label: 'FR Work Clothes', icon: '🔥', title: 'Top 100 FR Work Clothes Deals',
    intro: 'Flame-resistant (FR) shirts, pants, jackets and coveralls for work, marked down. Check the label for the rating your job requires (for example NFPA 2112 or the arc rating) before you buy.',
    searches: [s('FashionMen', 'flame resistant shirt', 15), s('FashionMen', 'flame resistant pants', 15), s('All', 'FR work jacket', 15), s('All', 'flame resistant coveralls', 15), s('FashionMen', 'FR hoodie', 15), s('All', 'flame resistant jeans', 15), s('All', 'FR vest', 15)],
    explore: [s('All', 'FR coveralls', 15), s('All', 'FR beanie', 15), s('All', 'arc rated jacket', 15), s('All', 'FR henley', 15), s('All', 'FR gloves', 15), s('All', 'FR bib overalls', 15)],
  },
  {
    id: 'kids', label: 'For Kids', icon: '🧸', title: 'Top 100 Deals for Kids',
    intro: 'Toys, LEGO, games and gifts kids love, marked down from their usual price.',
    searches: [s('ToysAndGames', 'toys'), s('ToysAndGames', 'lego'), s('VideoGames', 'kids'), s('All', 'gifts for kids', 30), s('ToysAndGames', 'board games'), s('ToysAndGames', 'stuffed animals')],
    explore: [s('ToysAndGames', 'art set'), s('ToysAndGames', 'science kit'), s('ToysAndGames', 'dolls'), s('ToysAndGames', 'remote control car'), s('ToysAndGames', 'puzzles'), s('ToysAndGames', 'building blocks'), s('ToysAndGames', 'baby toys'), s('All', 'stocking stuffers for kids', 30)],
  },
  {
    id: 'under-10', label: 'Under $10', icon: '💸', title: 'Top 100 Gifts Under $10', maxPrice: 10,
    intro: 'Stocking stuffers and small gifts, all $10 or less and marked down from their usual price. Set your cap and stick to it.',
    searches: [capped('stocking stuffers', 10), capped('gifts under 10 dollars', 10), capped('cute gifts', 10), capped('gadgets', 10)],
    explore: [capped('stocking stuffers for women', 10), capped('stocking stuffers for men', 10), capped('kitchen gadgets', 10), capped('phone accessories', 10), capped('beauty', 10), capped('socks', 10)],
  },
  {
    id: 'under-25', label: 'Under $25', icon: '🎁', title: 'Top 100 Gifts Under $25', maxPrice: 25,
    intro: 'Gifts that look like more, all $25 or less and marked down. Great for coworkers, teachers and white elephant swaps.',
    searches: [capped('gifts under 25 dollars', 25), capped('white elephant gifts', 25), capped('gifts for her', 25), capped('gifts for him', 25)],
    explore: [capped('kitchen gadgets', 25), capped('beauty gift set', 25), capped('tech accessories', 25), capped('cozy gifts', 25), capped('toys', 25), capped('jewelry', 25)],
  },
  {
    id: 'under-50', label: 'Under $50', icon: '🛍️', title: 'Top 100 Gifts Under $50', maxPrice: 50,
    intro: 'Bigger gifts for the people at the top of your list, all $50 or less and marked down from their usual price.',
    searches: [capped('gifts under 50 dollars', 50), capped('gifts for women', 50), capped('gifts for men', 50)],
    explore: [capped('headphones', 50), capped('kitchen appliances', 50), capped('perfume', 50), capped('smart home', 50), capped('boots', 50), capped('toys', 50)],
  },
  {
    id: 'tech', label: 'Electronics', icon: '🎧', title: 'Top 100 Electronics Deals',
    intro: 'Headphones, speakers, tablets, smart home and more, with real discounts.',
    searches: [s('Electronics', 'headphones', 20), s('Electronics', 'bluetooth speaker', 20), s('Electronics', 'tablet', 20), s('Electronics', 'smart home', 20), s('Computers', 'laptop', 15), s('Electronics', 'smart watch', 20), s('Electronics', 'security camera', 20)],
    explore: [s('Electronics', 'earbuds', 20), s('Electronics', 'kindle', 15), s('Electronics', 'webcam', 20), s('Computers', 'monitor', 15), s('Electronics', 'projector', 20), s('Electronics', 'gaming headset', 20), s('Computers', 'keyboard', 20), s('Electronics', 'streaming device', 20)],
  },
  {
    id: 'home', label: 'Home & Kitchen', icon: '🍳', title: 'Top 100 Home & Kitchen Deals',
    intro: 'Kitchen gadgets, cookware, bedding and organizing, all marked down.',
    searches: [s('HomeAndKitchen', 'kitchen'), s('HomeAndKitchen', 'air fryer', 20), s('HomeAndKitchen', 'bedding'), s('HomeAndKitchen', 'storage'), s('HomeAndKitchen', 'coffee maker', 20), s('HomeAndKitchen', 'vacuum', 20)],
    explore: [s('HomeAndKitchen', 'cookware set', 20), s('HomeAndKitchen', 'blender', 20), s('HomeAndKitchen', 'towels'), s('HomeAndKitchen', 'christmas decor'), s('HomeAndKitchen', 'pillows'), s('HomeAndKitchen', 'knife set', 20), s('HomeAndKitchen', 'robot vacuum', 20), s('HomeAndKitchen', 'humidifier', 20)],
  },
  {
    id: 'beauty', label: 'Beauty', icon: '💄', title: 'Top 100 Beauty Deals',
    intro: 'Skincare, makeup and hair tools on sale today.',
    searches: [s('Beauty', 'skincare'), s('Beauty', 'makeup'), s('Beauty', 'hair tools'), s('Beauty', 'perfume'), s('Beauty', 'nail'), s('Beauty', 'hair care')],
    explore: [s('Beauty', 'lipstick'), s('Beauty', 'eyeshadow palette'), s('Beauty', 'serum'), s('Beauty', 'hair straightener'), s('Beauty', 'nail polish'), s('Beauty', 'body wash'), s('Beauty', 'mascara'), s('Beauty', 'beauty gift set')],
  },
  {
    id: 'fashion', label: 'Fashion', icon: '👟', title: 'Top 100 Fashion Deals',
    intro: 'Shoes, bags and jackets marked down from their usual price.',
    searches: [s('Fashion', 'shoes', 30), s('Fashion', 'handbag', 30), s('Fashion', 'jacket', 30), s('Fashion', 'sneakers', 30), s('Fashion', 'sweater', 30), s('Fashion', 'boots', 30)],
    explore: [s('Fashion', 'coat', 30), s('Fashion', 'jeans', 30), s('Fashion', 'sunglasses', 30), s('Fashion', 'backpack', 30), s('Fashion', 'dress', 30), s('Fashion', 'watch', 30), s('Fashion', 'hat', 30), s('Fashion', 'wallet', 30)],
  },
  {
    id: 'outdoors', label: 'Sports & Outdoors', icon: '⛺', title: 'Top 100 Sports & Outdoors Deals',
    intro: 'Fitness, camping and cycling gear on sale.',
    searches: [s('SportsAndOutdoors', 'fitness'), s('SportsAndOutdoors', 'camping'), s('SportsAndOutdoors', 'cycling'), s('SportsAndOutdoors', 'hiking'), s('SportsAndOutdoors', 'yoga')],
    explore: [s('SportsAndOutdoors', 'water bottle'), s('SportsAndOutdoors', 'tent'), s('SportsAndOutdoors', 'resistance bands'), s('SportsAndOutdoors', 'kayak'), s('SportsAndOutdoors', 'sleeping bag'), s('SportsAndOutdoors', 'bike accessories')],
  },
  {
    id: 'automotive', label: 'Automotive', icon: '🚗', title: 'Top 100 Automotive Deals',
    intro: 'Car accessories, dash cams, tire inflators, jump starters and cleaning gear, all marked down.',
    searches: [s('Automotive', 'car accessories'), s('Automotive', 'dash cam', 20), s('Automotive', 'tire inflator jump starter', 20), s('Automotive', 'car cleaning'), s('Automotive', 'car organizer', 20), s('Automotive', 'car phone mount charger', 20), s('Automotive', 'car seat covers', 20), s('Automotive', 'car vacuum', 20)],
    explore: [s('Automotive', 'floor mats', 20), s('Automotive', 'led headlight', 20), s('Automotive', 'car wax', 20), s('Automotive', 'windshield sun shade', 20), s('Automotive', 'car charger', 20), s('Automotive', 'backup camera', 20)],
  },
];

// Extra searches that only feed the main Top 100 pool, to widen it beyond the lists above.
export const POOL_SEARCHES = [
  s('All', 'deal', 40),
  s('All', 'clearance', 40),
  // "Steals": 70%+ off in the big departments, where the $1.99-style markdowns hide (they rarely rank for gift keywords).
  s('FashionWomen', 'women', 70),
  s('FashionMen', 'men', 70),
  s('HomeAndKitchen', 'home', 70),
  s('Beauty', 'beauty', 70),
  s('Electronics', 'electronics', 70),
  s('ToysAndGames', 'toys', 70),
];

// The front page: the biggest savings across every search above.
export const TOP = { id: 'top', label: 'Top 100 Deals', icon: '🔥', size: 100 };
export const LIST_SIZE = 100;
