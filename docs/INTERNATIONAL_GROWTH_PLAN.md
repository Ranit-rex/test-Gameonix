# Playovia International Organic Growth Plan

**Primary markets:** United States, then United Kingdom, Canada and Australia  
**Goal:** Build toward 500,000 genuine monthly visitors  
**Marketing budget:** $0  
**Review cadence:** Weekly  
**Status:** Initial SEO landing page published in the repository; live deployment and indexing still need verification.

## 1. Principles

- Grow with real players and useful game discovery, not bought traffic, bots, incentivized visits or ad clicks.
- Protect the game experience: no forced redirects and no intrusive ads during active gameplay.
- Publish original gameplay footage, guides and useful game information. Do not mass-produce thin keyword pages.
- Treat 500,000 monthly visitors as a long-term target, not a guaranteed result.

## 2. Country focus

Use the following as an initial planning mix, then revise it using actual country-level analytics:

| Market | Initial planning share | Focus |
|---|---:|---|
| United States | 55% | Main search and creator-discovery market |
| United Kingdom | 20% | English-language search and gaming communities |
| Canada | 15% | English-language search and social discovery |
| Australia | 10% | English-language search and social discovery |

These percentages are campaign targets, not current audience data.

## 3. Technical SEO work

### Completed in this repository
- Added `/free-online-games.html`, a crawlable English landing page with a canonical URL, unique title and description, social-sharing metadata, original category guidance, FAQs and direct links to selected game pages.
- Added the landing page to `sitemap.xml`.
- Added a link to the landing page from the About page navigation.
- Kept the existing homepage canonical, title, description, robots directives and structured data unchanged.

### Verification still required after GitHub Pages deploy
1. Open `https://playovia.xyz/free-online-games.html` and confirm it returns HTTP 200.
2. Open `https://playovia.xyz/sitemap.xml`; confirm it returns XML (not an HTML error page), with HTTP 200 and the new URL.
3. Open `https://playovia.xyz/robots.txt`; confirm the sitemap directive points to the canonical sitemap.
4. In Google Search Console, resubmit the sitemap and inspect the new landing page and representative game URLs.
5. Check canonical selection, rendered page content, mobile usability and indexing exclusions. A sitemap submission is a discovery hint, not an indexing guarantee.

### Next technical SEO priorities
- Audit every game URL in the sitemap against its actual live response; remove broken or redirected URLs and add valid public game pages.
- Make sure every game has a unique, useful title, meta description, visible game description, controls/how-to-play information and crawlable internal links.
- Add contextual links between related games and categories.
- Keep one canonical URL per page and use real, accurate `lastmod` values only when content materially changes.
- Review mobile performance and large game assets; lazy-load non-critical images and avoid blocking the main content.
- Do not create hundreds of near-identical AI-generated pages. Publish only pages with distinct, useful game-specific information.

## 4. Organic social publishing cadence

### Weekly minimum
- YouTube Shorts: 5 original clips per week.
- TikTok: repost/adapt those clips with platform-native captions.
- Instagram Reels: 3–5 clips per week.
- Reddit: 2 helpful community contributions per week, only where self-promotion is allowed.
- Discord: 1 weekly challenge, tournament or community update.
- Website: 1 genuinely useful game guide or substantial game-page improvement per week.

### Clip formats
1. A short gameplay hook: show the challenge in the first 1–2 seconds.
2. A clear objective: explain what the player must do.
3. A real result: show a win, fail, surprising moment or high score.
4. A simple call to action: name the game and link to its direct Playovia page.

Use original footage from Playovia games. Avoid misleading claims, engagement bait, repeated identical posts and unsolicited mass DMs.

## 5. First 30 days

| Week | Deliverables |
|---|---|
| 1 | Verify deployment, sitemap and robots; inspect 5 important game URLs; configure country-level measurement |
| 2 | Improve 10 priority game pages; publish 5 short clips; start a consistent community schedule |
| 3 | Improve another 10 game pages; publish 5 more clips; create one useful guide based on real gameplay |
| 4 | Review country, search query and engagement data; repeat the best-performing topics; fix technical issues found |

## 6. Measurement

Track weekly:
- Search Console clicks, impressions, queries, indexed pages and country performance.
- Analytics users, sessions, engaged sessions, returning users and landing pages by country.
- Game-page visits, game starts and completed sessions.
- Social video views, average watch time, profile visits and actual website referrals.
- Ad revenue and RPM by country only where the ad platform provides reliable reporting.

The existing site loads a custom analytics script that sends visit events to the Playovia backend. Confirm whether that backend exposes reliable country-level reporting before treating it as the source of truth. If it does not, configure a privacy-appropriate analytics property and verify it before using country targets.

## 7. Milestones (planning targets, not forecasts)

| Stage | Monthly visitor milestone |
|---|---:|
| Baseline | Measure current verified traffic |
| Month 1 | 1,000 |
| Month 2 | 3,000 |
| Month 3 | 10,000 |
| Months 4–6 | 25,000–75,000 |
| Months 7–9 | 100,000–250,000 |
| Months 10–12 | Work toward 500,000 |

Reforecast every month using actual growth, search visibility, retention and content capacity. If traffic quality or player experience declines, fix that before increasing publishing volume.

## 8. Social post templates

**Short-video caption**

> Can you beat this Playovia challenge? 🎮  
> Try the game and share your best score: https://playovia.xyz/

Replace the generic link with the direct game URL and use only a real clip of that game.

**Community post**

> I’m building Playovia, a browser gaming site with puzzle, action and multiplayer games. I’d appreciate feedback on this specific game: [direct game URL]. What felt fun, confusing or difficult? Please share honest feedback; no need to sign up just to comment.

Use only in communities whose rules permit project feedback or self-promotion.

## 9. Safety and quality guardrails

- Never buy bot traffic, fake country visits, use VPN traffic to manipulate audience reports or click your own ads.
- Never make play buttons trigger deceptive redirects or ad clicks.
- Keep ads away from active gameplay and ensure ad labels and close controls are clear.
- Respect each community's self-promotion rules and each platform's posting policies.
- Do not claim a page is indexed until Search Console confirms it.
