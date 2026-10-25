# Great Deals Daily

An Amazon affiliate deals website. It pulls discounted products from the
**Amazon Creators API** (the replacement for PA-API 5, which Amazon retired in
2026) and links to them with your Associates tracking tag, so you earn a
commission on qualifying purchases.

- **Top 50 Deals** on the front page: the biggest discounts across every category,
  ranked by % off (then by dollars saved)
- Daily deals by category (Electronics, Home, Fashion, Beauty, Toys, Outdoors)
- Product search
- Discount %, list price, star rating, deal badges and countdowns
- Sorting by discount, price or rating
- Works on phones
- Affiliate and price disclosures that the Associates rules require are already in the footer
- No dependencies: plain Node.js 22+

## Run it

```bash
cp .env.example .env     # then fill in your keys (see below)
npm start                # http://localhost:3000
```

If `.env` has no keys, the site runs in **demo mode** with sample products, so
you can preview the design.

## Get your Amazon keys

1. Join Amazon Associates at https://affiliate-program.amazon.com and get approved.
   Your tracking ID (e.g. `yourname-20`) is your `AMAZON_PARTNER_TAG`.
2. In Associates Central go to **Tools → Creators API** and create a credential.
   Copy the **Credential ID**, **Credential Secret** and **Version** into `.env`.
3. Set `AMAZON_MARKETPLACE` to your store (e.g. `www.amazon.com`).

Amazon only grants API access once your account has made some qualifying
sales. Until then the API answers `AssociateNotEligible`, and the site shows a
"Browse deals on Amazon" button instead, linking to Amazon's own deals and search
pages with your tag. Sales through those links count toward eligibility. The
site retries the API every 10 minutes and switches to live deals by itself once
access opens.

Coupons: the Creators API does not return coupon data, so savings shown are the
price discount only.

## Admin page: add products to campaigns (no API needed)

Go to `/admin` and sign in with the password you set as `ADMIN_PASSWORD` in
Railway. From there you can:

- Pick a **campaign** (Today's Picks on the front page, the Holiday Gift Guide,
  or any you create, such as "Black Friday") and **add products** to it
- Edit, reorder, move or remove products; add, rename or reorder sections
- Create new campaigns. Each gets its own page at `/c/<campaign-name>` and can
  be shown in the site's top menu

Changes save automatically. For each product:

- Paste the link from Amazon's **SiteStripe** bar (**Get Link**). Plain
  amazon.com links get your tag added automatically; non-Amazon links are
  rejected.
- Write why it's a good deal in your own words. Don't add prices: Associates
  rules only allow those through the API.
- **Photo (optional):** upload your own photo (JPG, PNG, WebP or GIF, up to
  5 MB), or paste the code from SiteStripe's **Get Link → Image** (or an
  Amazon-hosted image link). Images copied to other hosts are rejected, since
  re-hosting Amazon's product photos isn't allowed. Without a photo the emoji
  is shown.
- Sections with a search term show a **Browse on Amazon** button that searches
  Amazon for it, with your tag.

## TikTok swipe page

`/swipe` is a full-screen page for your TikTok (or Instagram) link in bio.
Visitors swipe left and right between campaigns, story-style, and scroll down
through each campaign's products. The menu bar at the top lists every campaign
and highlights the one in view; tapping a name jumps to it.

- It shows **Today's Picks** first, then every campaign with **Show this
  campaign in the site's top menu** ticked, in the order of the admin list.
- Link straight to one campaign with `/swipe#<campaign-id>`, e.g.
  `/swipe#black-friday`. The address updates as visitors swipe, so a copied link
  opens on the same campaign.

**Storage:** products are saved to `content.json` in the Railway volume
(`RAILWAY_VOLUME_MOUNT_PATH`), or `DATA_DIR`, or `./data` locally. The files in
`content/` are only the starting content for a brand-new, empty volume.

## Customise

- **Categories and searches:** `src/categories.js`. Each entry is a search with
  keywords, a search index and a minimum discount %. `POOL_SEARCHES` adds extra
  searches that only feed the Top 50.
- **Look:** `public/styles.css` (colours are at the top).
- **Site name:** `SITE_NAME` in `.env`.
- **Refresh rate:** `CACHE_MINUTES` in `.env` (default 60). Results are cached to
  stay within Amazon's rate limit. Don't set it above 1440 (24 hours), because
  Amazon requires prices to be kept fresh.

## Deploy

Any host that runs Node 22+ will work, for example Render, Railway, Fly.io or a
small VPS. Set the same environment variables as in `.env` on the host and use
`npm start` as the start command.

## Rules to follow (Amazon Associates)

- Keep the affiliate disclosure visible (it's in the footer).
- Show prices with their "last updated" time (the site does this).
- Don't use Amazon's logo or make the site look like Amazon itself.
- Don't put affiliate links in emails or offline material.
