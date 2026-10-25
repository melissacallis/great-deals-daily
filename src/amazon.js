// Minimal client for the Amazon Creators API (the successor to PA-API 5).
// Auth is OAuth2 client credentials; the token endpoint depends on the
// credential version shown in Associates Central.

const API_HOST = 'https://creatorsapi.amazon';

const TOKEN_ENDPOINTS = {
  '2.1': 'https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token',
  '2.2': 'https://creatorsapi.auth.eu-south-2.amazoncognito.com/oauth2/token',
  '2.3': 'https://creatorsapi.auth.us-west-2.amazoncognito.com/oauth2/token',
  '3.1': 'https://api.amazon.com/auth/o2/token',
  '3.2': 'https://api.amazon.co.uk/auth/o2/token',
  '3.3': 'https://api.amazon.co.jp/auth/o2/token',
};

const RESOURCES = [
  'itemInfo.title',
  'itemInfo.byLineInfo',
  'itemInfo.features',
  'images.primary.large',
  'customerReviews.count',
  'customerReviews.starRating',
  'offersV2.listings.price',
  'offersV2.listings.dealDetails',
  'offersV2.listings.availability',
  'offersV2.listings.isBuyBoxWinner',
];

export class CreatorsApi {
  constructor({ credentialId, credentialSecret, version, partnerTag, marketplace }) {
    this.credentialId = credentialId;
    this.credentialSecret = credentialSecret;
    this.version = String(version);
    this.partnerTag = partnerTag;
    this.marketplace = marketplace;
    this.tokenEndpoint = TOKEN_ENDPOINTS[this.version];
    if (!this.tokenEndpoint) {
      throw new Error(`Unsupported AMAZON_CREDENTIAL_VERSION "${version}". Use one of: ${Object.keys(TOKEN_ENDPOINTS).join(', ')}`);
    }
    this.token = null;
    this.tokenExpiresAt = 0;
  }

  get isLwa() {
    return this.version.startsWith('3.');
  }

  async getToken() {
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token;

    const body = {
      grant_type: 'client_credentials',
      client_id: this.credentialId,
      client_secret: this.credentialSecret,
      scope: this.isLwa ? 'creatorsapi::default' : 'creatorsapi/default',
    };
    // v3.x (Login with Amazon) takes JSON; v2.x (Cognito) takes a form body.
    const res = await fetch(this.tokenEndpoint, this.isLwa
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });

    if (!res.ok) throw new Error(`Token request failed (${res.status}): ${await res.text()}`);
    const data = await res.json();
    this.token = data.access_token;
    this.tokenExpiresAt = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
    return this.token;
  }

  async call(operation, payload) {
    const token = await this.getToken();
    const res = await fetch(`${API_HOST}/catalog/v1/${operation}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-marketplace': this.marketplace,
        Authorization: this.isLwa ? `Bearer ${token}` : `Bearer ${token}, Version ${this.version}`,
      },
      body: JSON.stringify({ partnerTag: this.partnerTag, resources: RESOURCES, ...payload }),
    });
    const text = await res.text();
    if (!res.ok) {
      const err = new Error(`${operation} failed (${res.status}): ${text}`);
      err.status = res.status;
      try { err.reason = JSON.parse(text).reason; } catch {}
      throw err;
    }
    return JSON.parse(text);
  }

  async searchItems({ keywords, searchIndex = 'All', minSavingPercent, sortBy, itemPage = 1, itemCount = 10 }) {
    const payload = { keywords, searchIndex, itemPage, itemCount };
    if (minSavingPercent) payload.minSavingPercent = minSavingPercent;
    if (sortBy) payload.sortBy = sortBy;
    const data = await this.call('searchItems', payload);
    return (data.searchResult?.items ?? []).map(normalizeItem).filter(Boolean);
  }

  async getItems(itemIds) {
    const data = await this.call('getItems', { itemIds });
    return (data.itemsResult?.items ?? []).map(normalizeItem).filter(Boolean);
  }
}

// Flatten an API item into what the front end renders.
export function normalizeItem(item) {
  const listings = item.offersV2?.listings ?? [];
  const listing = listings.find((l) => l.isBuyBoxWinner) ?? listings[0];
  const price = listing?.price;
  if (!price?.money) return null;

  const list = price.savingBasis?.money;
  const savingsPct = price.savings?.percentage
    ?? (list?.amount ? Math.round((1 - price.money.amount / list.amount) * 100) : 0);
  const savingsAmount = price.savings?.money?.amount
    ?? (list?.amount ? Math.round((list.amount - price.money.amount) * 100) / 100 : 0);

  return {
    asin: item.asin,
    title: item.itemInfo?.title?.displayValue ?? 'Untitled product',
    brand: item.itemInfo?.byLineInfo?.brand?.displayValue ?? null,
    features: (item.itemInfo?.features?.displayValues ?? []).slice(0, 3),
    image: item.images?.primary?.large?.url ?? item.images?.primary?.medium?.url ?? null,
    url: item.detailPageURL,
    price: price.money.displayAmount ?? `$${price.money.amount}`,
    priceAmount: price.money.amount,
    listPrice: list?.displayAmount ?? null,
    listPriceLabel: price.savingBasis?.savingBasisTypeLabel ?? 'List',
    savingsPct,
    savingsAmount,
    savingsDisplay: price.savings?.money?.displayAmount ?? null,
    dealBadge: listing.dealDetails?.badge ?? null,
    dealEndsAt: listing.dealDetails?.endTime ?? null,
    rating: item.customerReviews?.starRating?.value ?? null,
    reviewCount: item.customerReviews?.count ?? null,
    availability: listing.availability?.message ?? null,
  };
}
