# SEO Research & Strategy for Kepler (Music Artist)

> Research date: 2026-04-03
> Domain: keplermusik.de (owned) | Currently hosted on GitHub Pages
> Core problem: "Kepler" is dominated in search by Johannes Kepler (astronomer), the Kepler space telescope, and multiple other musicians named Kepler.

---

## Table of Contents

1. [Quick Wins (Do This Week)](#1-quick-wins-do-this-week)
2. [Name Collision & Differentiation Strategy](#2-name-collision--differentiation-strategy)
3. [Technical SEO Foundations](#3-technical-seo-foundations)
4. [Structured Data / Schema.org Markup](#4-structured-data--schemaorg-markup)
5. [Open Graph & Social Cards](#5-open-graph--social-cards)
6. [Domain Strategy](#6-domain-strategy)
7. [Long-Tail Keyword Strategy](#7-long-tail-keyword-strategy)
8. [Google Knowledge Panel Roadmap](#8-google-knowledge-panel-roadmap)
9. [Music Directory & Platform SEO](#9-music-directory--platform-seo)
10. [Content Strategy](#10-content-strategy)
11. [Measurement & Tools](#11-measurement--tools)

---

## 1. Quick Wins (Do This Week)

These require minimal effort and have outsized impact:

### 1.1 Add meta tags to index.html

The current `<head>` has no meta description, no Open Graph tags, and no structured data. This is the single highest-impact fix.

```html
<head>
  <!-- Existing tags... -->

  <!-- SEO Meta -->
  <meta name="description" content="Kepler -- Elektronische Musik, Visuals und digitale Identitat aus Deutschland. Hore Tracks auf Spotify, Apple Music und Bandcamp.">
  <meta name="keywords" content="Kepler Musik, Kepler electronic music, Kepler artist, Kepler Germany, elektronische Musik">
  <link rel="canonical" href="https://keplermusik.de/">

  <!-- Open Graph -->
  <meta property="og:title" content="Kepler -- Music & Visuals">
  <meta property="og:description" content="Electronic music artist from Germany. Music, visuals, digital identity.">
  <meta property="og:type" content="music.musician">
  <meta property="og:url" content="https://keplermusik.de/">
  <meta property="og:image" content="https://keplermusik.de/assets/images/kepler-social-card.png">
  <meta property="og:locale" content="de_DE">
  <meta property="og:site_name" content="Kepler">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Kepler -- Music & Visuals">
  <meta name="twitter:description" content="Electronic music artist from Germany.">
  <meta name="twitter:image" content="https://keplermusik.de/assets/images/kepler-social-card.png">
</head>
```

**Action item:** Create a 1200x630px social card image (`assets/images/kepler-social-card.png`) with the Kepler branding. This image appears whenever the site is shared on social media.

### 1.2 Create robots.txt

Place at repository root (`/robots.txt`):

```
User-agent: *
Allow: /

# Block AI crawlers (optional, preserves content exclusivity)
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

Sitemap: https://keplermusik.de/sitemap.xml
```

### 1.3 Create sitemap.xml

Place at repository root (`/sitemap.xml`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://keplermusik.de/</loc>
    <lastmod>2026-04-03</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

Since the site is a single-page application, the sitemap is minimal. Update `<lastmod>` whenever content changes. If the site grows to have separate pages/routes, add each one.

### 1.4 Claim Spotify for Artists profile

If not already done: go to [artists.spotify.com](https://artists.spotify.com/home), claim the profile for Kepler (Spotify artist ID: `42o6wEuAtZaVCte7QZnDtH` based on the link in index.html). This unlocks:
- Custom artist bio with keywords
- Header image control
- Artist's Pick section
- Fan demographics data
- The "Registered Artist" badge (replaced the old blue checkmark in January 2026)

---

## 2. Name Collision & Differentiation Strategy

### The Problem in Detail

Searching "Kepler" returns:
- Johannes Kepler (astronomer, 1571-1630) -- dominates the Knowledge Panel
- Kepler space telescope (NASA)
- Multiple other musicians/bands named "Kepler"
- Kepler's laws of planetary motion
- Various companies, places, and software named Kepler

### Strategy: Never compete on "Kepler" alone

The artist will likely never rank for the bare term "Kepler." Instead, **own the modified search terms**:

| Target Phrase | Difficulty | Notes |
|---|---|---|
| `Kepler Musik` | Low | German-language differentiator, matches the domain |
| `Kepler Musiker` | Low | "Kepler musician" in German |
| `Kepler electronic music` | Medium | Genre qualifier |
| `Kepler artist Germany` | Low | Geographic qualifier |
| `Kepler music visuals` | Low | Niche descriptor |
| `keplermusik` | Very Low | Brand term, own it completely |
| `Kepler [album name]` | Low-Med | Per-release targeting |
| `Kepler [track name]` | Low-Med | Per-track targeting |

### Practical Differentiation Tactics

1. **Always pair "Kepler" with a qualifier** in all online presences: "Kepler (Musik)" on MusicBrainz, "Kepler - Electronic Music" in social bios, etc.
2. **Use "keplermusik" as the unified brand handle** across all platforms where possible.
3. **The domain keplermusik.de is the strongest asset** -- it is a unique, unambiguous identifier. Every backlink should point here.
4. **Consistent NAP (Name, Address, Platform):** Use the exact same artist name format, bio first sentence, and profile image across ALL platforms. Google cross-references these for entity recognition.

---

## 3. Technical SEO Foundations

### 3.1 Page Title

Current: `Kepler -- Music & Visuals`

Recommended: `Kepler -- Elektronische Musik & Visuals | keplermusik.de`

This adds a German keyword and the unique brand domain. Keep under 60 characters.

### 3.2 Heading Structure

The current page lacks an `<h1>` tag entirely. Search engines rely heavily on heading hierarchy:

```html
<!-- Add a visually hidden h1 if design doesn't call for a visible one -->
<h1 class="sr-only">Kepler -- Elektronische Musik, Visuals & Digitale Identitat</h1>
```

CSS for visually hidden but SEO-accessible:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

(Note: Tailwind already provides `sr-only` as a utility class.)

### 3.3 Language & hreflang

The site is in German (`lang="de"` is already set -- good). If an English version is ever added:

```html
<link rel="alternate" hreflang="de" href="https://keplermusik.de/">
<link rel="alternate" hreflang="en" href="https://keplermusik.de/en/">
```

### 3.4 Performance

GitHub Pages serves static files, which is inherently fast. Additional optimizations:
- Add `loading="lazy"` to images below the fold
- Compress images (the current PNGs could be converted to WebP)
- Consider self-hosting fonts instead of loading from Google Fonts (eliminates render-blocking requests and third-party dependency)

### 3.5 HTTPS

GitHub Pages provides free HTTPS with custom domains. Ensure the `Enforce HTTPS` checkbox is enabled in repo Settings > Pages.

---

## 4. Structured Data / Schema.org Markup

This is critical for disambiguation. When Google sees structured MusicGroup data on keplermusik.de, it can begin to understand that this "Kepler" is a distinct musical entity, separate from the astronomer.

### 4.1 MusicGroup JSON-LD (add to index.html)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "MusicGroup",
  "name": "Kepler",
  "alternateName": ["Kepler Musik", "keplermusik"],
  "url": "https://keplermusik.de",
  "genre": ["Electronic", "Elektronische Musik"],
  "description": "Electronic music artist from Germany producing music, visuals, and exploring digital identity.",
  "foundingLocation": {
    "@type": "Place",
    "name": "Germany",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "DE"
    }
  },
  "sameAs": [
    "https://open.spotify.com/artist/42o6wEuAtZaVCte7QZnDtH",
    "https://www.instagram.com/keplermusik/",
    "https://www.youtube.com/@keplermusik",
    "https://soundcloud.com/keplermusik",
    "https://keplermusik.bandcamp.com"
  ],
  "image": "https://keplermusik.de/assets/images/kepler-social-card.png",
  "logo": "https://keplermusik.de/assets/icons/user.png"
}
</script>
```

**Important:** Update the `sameAs` array with the actual URLs of all Kepler profiles. Every platform listed here helps Google connect the dots between the website and the streaming/social profiles.

### 4.2 MusicAlbum / MusicRecording (per release)

For each album or single, add structured data. Example:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "MusicAlbum",
  "name": "Album Title",
  "byArtist": {
    "@type": "MusicGroup",
    "name": "Kepler",
    "url": "https://keplermusik.de"
  },
  "datePublished": "2025-01-01",
  "genre": "Electronic",
  "numTracks": 8,
  "image": "https://keplermusik.de/assets/images/album-cover.jpg",
  "url": "https://open.spotify.com/album/ALBUM_ID"
}
</script>
```

### 4.3 Validation

After adding structured data, validate with:
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Validator](https://validator.schema.org/)

---

## 5. Open Graph & Social Cards

### 5.1 Basic Tags (covered in Quick Wins)

The `og:type` should be `music.musician` -- this is a recognized Open Graph type for music artists.

### 5.2 Audio-Specific Tags (optional, for track pages)

If individual track pages are ever created:

```html
<meta property="og:type" content="music.song">
<meta property="og:audio" content="https://example.com/track-preview.mp3">
<meta property="og:audio:type" content="audio/mpeg">
<meta property="music:musician" content="https://keplermusik.de/">
<meta property="music:duration" content="240">
```

### 5.3 Social Card Image Specifications

| Platform | Recommended Size | Format |
|---|---|---|
| Facebook / Open Graph | 1200 x 630 px | PNG or JPG |
| Twitter | 1200 x 628 px | PNG or JPG |
| LinkedIn | 1200 x 627 px | PNG or JPG |

Create one 1200x630px image that works everywhere. Include the artist name "Kepler" and a visual that communicates "music artist" (not astronomer).

---

## 6. Domain Strategy

### 6.1 Current Situation

- **Owned:** `keplermusik.de`
- **Current hosting:** GitHub Pages (likely at `username.github.io/kepler`)

### 6.2 Recommended Setup

**Point keplermusik.de to GitHub Pages.** This is the single most important domain action.

Steps:
1. In your DNS provider, create the following records:
   - `A` record for `keplermusik.de` pointing to GitHub's IPs:
     ```
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```
   - `CNAME` record for `www.keplermusik.de` pointing to `username.github.io`
2. In the GitHub repo Settings > Pages > Custom domain, enter `keplermusik.de`
3. Check "Enforce HTTPS"
4. Add a `CNAME` file to the repo root containing: `keplermusik.de`

### 6.3 Why This Matters

- **Brand authority:** `keplermusik.de` is a unique, brandable domain. No one else has it.
- **Geographic signal:** The `.de` TLD signals to Google that this is a German entity, which helps for German-language searches.
- **Link equity:** All backlinks should accumulate on one domain, not split between `github.io` and `keplermusik.de`.
- **Canonical URL:** Set `<link rel="canonical" href="https://keplermusik.de/">` so Google knows the authoritative URL.

### 6.4 Future Consideration

If the artist grows internationally, consider also acquiring `keplermusik.com` as a redirect to `.de`, but this is low priority.

---

## 7. Long-Tail Keyword Strategy

### 7.1 Primary Keyword Clusters

**Cluster 1: Brand + Language**
- `Kepler Musik` (primary -- matches domain)
- `Kepler Musiker`
- `Kepler Musiker Deutschland`

**Cluster 2: Brand + Genre**
- `Kepler electronic music`
- `Kepler elektronische Musik`
- `Kepler ambient` / `Kepler techno` / etc. (adjust to actual genre)

**Cluster 3: Brand + Platform**
- `Kepler Spotify`
- `Kepler Bandcamp`
- `Kepler Apple Music`

**Cluster 4: Brand + Content Type**
- `Kepler music visuals`
- `Kepler music video`
- `Kepler live performance`

**Cluster 5: Release-Specific**
- `Kepler [album name]`
- `Kepler [track name] lyrics`
- `Kepler new album 2026`

### 7.2 Where to Use Keywords

| Location | What to Include |
|---|---|
| Page `<title>` | Primary keyword cluster |
| `<meta description>` | Natural sentence using 2-3 keyword clusters |
| `<h1>` | Artist name + primary descriptor |
| Schema.org `alternateName` | All brand variations |
| Spotify bio (first sentence) | Genre + location + artist name |
| Social media bios | Consistent keyword-rich description |
| Image `alt` text | Descriptive text including artist name |
| URL structure | `keplermusik.de` already contains the keyword |

### 7.3 Content Ideas for Keyword Targeting

Each of these could be a blog post or journal entry that targets specific long-tail queries:

- "Behind the Track: [Song Name]" -- targets `Kepler [song name]`
- "Kepler Live @ [Venue]" -- targets `Kepler live` + geographic terms
- "How I Made [Album]" -- targets `Kepler [album name]` + process keywords

---

## 8. Google Knowledge Panel Roadmap

Getting a Knowledge Panel is the ultimate goal for disambiguation. When someone searches "Kepler musician" or "Kepler Musik," a panel on the right side of results would clearly establish the artist as a distinct entity.

### 8.1 Prerequisites (in priority order)

1. **MusicBrainz entry** -- Google treats MusicBrainz as a "Trust Anchor" database. Create a complete artist entry with:
   - Artist name: "Kepler"
   - Disambiguation: "German electronic music artist" (this is how MusicBrainz differentiates between artists with the same name)
   - All releases with correct metadata
   - URL relationships (link to keplermusik.de, Spotify, etc.)

2. **Wikidata entry** -- Create a Wikidata item for Kepler (the musician) with:
   - Label: "Kepler"
   - Description: "German electronic music artist"
   - Properties: instance of (Q5 - human or Q215380 - musical group), genre, official website, Spotify artist ID, MusicBrainz artist ID, country of origin
   - This is NOT the same as Wikipedia -- Wikidata is a structured database that feeds Google's Knowledge Graph directly

3. **Discogs entry** -- Another Trust Anchor. Add artist profile and all physical/digital releases.

4. **YouTube Official Artist Channel** -- Often the most powerful signal for a music artist Knowledge Panel. Requires distributing music to YouTube Music through a distributor.

5. **Consistent information everywhere** -- Google's algorithms cross-reference multiple sources. The artist name, bio, genre, and image should be identical across:
   - keplermusik.de
   - Spotify
   - Apple Music
   - YouTube
   - MusicBrainz
   - Wikidata
   - Discogs
   - Social media profiles

### 8.2 Timeline Expectation

Knowledge Panels cannot be requested or purchased. Google generates them automatically when enough consistent, authoritative signals exist. Typical timeline for an independent musician:
- **Month 1-2:** Set up all directory entries (MusicBrainz, Wikidata, Discogs)
- **Month 2-4:** Build backlinks, ensure consistency, add structured data
- **Month 3-6+:** Panel may appear for qualified searches like "Kepler musician" first, then broader terms

### 8.3 After the Panel Appears

Once a Knowledge Panel exists, you can **claim it** through Google's verification process, which lets you suggest edits to the information displayed.

---

## 9. Music Directory & Platform SEO

### 9.1 Priority Directory Listings

| Platform | Priority | Action | Why |
|---|---|---|---|
| **MusicBrainz** | Critical | Create/complete artist entry | Google Trust Anchor, feeds Knowledge Graph |
| **Wikidata** | Critical | Create item with structured properties | Directly feeds Google Knowledge Panel |
| **Discogs** | High | Create artist profile + discography | Google Trust Anchor |
| **Spotify for Artists** | High | Claim profile, optimize bio | Largest streaming platform |
| **Apple Music for Artists** | High | Claim profile | Second-largest streaming platform |
| **YouTube Music** | High | Ensure official artist channel exists | Powerful Knowledge Panel signal |
| **Bandcamp** | Medium | Complete artist profile | Good for indie/electronic discovery |
| **SoundCloud** | Medium | Complete profile | Backlink + discovery |
| **Rate Your Music** | Medium | Ensure discography listed | Community-driven authority site |
| **Genius** | Medium | Add lyrics / annotations | Targets lyric searches |
| **Bandsintown** | Low-Med | Add artist profile | Concert discovery, backlink |
| **Songkick** | Low-Med | Add artist profile | Concert discovery, backlink |

### 9.2 Profile Optimization Checklist (apply to every platform)

- [ ] Profile image matches across all platforms (same photo)
- [ ] Bio first sentence includes: artist name, genre, location
- [ ] Bio includes link to keplermusik.de
- [ ] All releases are listed with correct metadata
- [ ] Links to other platforms are included where possible

---

## 10. Content Strategy

### 10.1 The Existing Journal as SEO Leverage

The site already has a journal/logbook section. This is excellent SEO material if each entry is:
- Indexable by search engines (currently it loads dynamically via JS -- ensure content is in the DOM or consider server-side rendering for critical pages)
- Tagged with relevant keywords
- Linked to from other pages

### 10.2 SPA (Single-Page App) SEO Challenge

The current site is a single-page application where all "pages" (Projektubersicht, Prozess-Logbuch, Uber mich, etc.) are sections toggled by JavaScript. This means:
- Google sees only ONE URL for all content
- Individual sections cannot rank independently
- There are no unique `<title>` or `<meta description>` tags per section

**Short-term fix:** Ensure the main page's meta tags cover the most important keywords.

**Long-term consideration:** If SEO becomes a priority, converting to separate HTML pages (or using hash-based routing with `history.pushState` so Google can index separate URLs) would significantly improve search visibility. Each page could then have its own title, description, and structured data.

### 10.3 Backlink Strategy

For a niche artist, the most natural backlinks come from:
- Music blogs and review sites (pitch for reviews)
- Interviews and features
- Collaboration credits (other artists linking to you)
- Event/venue pages listing you as a performer
- University/research context (the site mentions Technische Hochschule OWL)

---

## 11. Measurement & Tools

### 11.1 Set Up Google Search Console

1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Add property for `keplermusik.de`
3. Verify ownership (DNS TXT record or HTML file method)
4. Submit `sitemap.xml`
5. Monitor: which queries bring traffic, indexing status, any errors

### 11.2 Key Metrics to Track

| Metric | Tool | Target |
|---|---|---|
| Indexed pages | Google Search Console | All important pages indexed |
| Search impressions for "Kepler Musik" | Google Search Console | Growing month-over-month |
| Average position for brand terms | Google Search Console | Top 10 for "Kepler Musik" |
| Knowledge Panel appearance | Manual search | Appears within 6 months |
| Structured data validity | Rich Results Test | Zero errors |
| Backlink count | Google Search Console / Ahrefs | Growing |

### 11.3 Regular Maintenance

- **Monthly:** Check Search Console for errors, update sitemap `<lastmod>` dates
- **Per release:** Add MusicAlbum structured data, update MusicBrainz/Discogs, update Spotify bio
- **Quarterly:** Review keyword rankings, update meta descriptions if needed

---

## Implementation Priority Matrix

| Priority | Task | Effort | Impact |
|---|---|---|---|
| 1 | Connect keplermusik.de to GitHub Pages | 30 min | Very High |
| 2 | Add meta tags + Open Graph to index.html | 15 min | High |
| 3 | Add MusicGroup JSON-LD structured data | 15 min | High |
| 4 | Create robots.txt + sitemap.xml | 10 min | Medium |
| 5 | Create social card image | 30 min | Medium |
| 6 | Set up Google Search Console | 15 min | High |
| 7 | Create/complete MusicBrainz entry | 45 min | Very High |
| 8 | Create Wikidata item | 30 min | Very High |
| 9 | Create/complete Discogs entry | 30 min | High |
| 10 | Claim Spotify for Artists | 15 min | High |
| 11 | Optimize bios on all platforms | 60 min | Medium |
| 12 | Add visually hidden h1 tag | 5 min | Medium |
| 13 | Add lazy loading to images | 15 min | Low |
| 14 | Claim Apple Music for Artists | 15 min | Medium |
| 15 | Consider SPA-to-multi-page migration | Hours | High (long-term) |

---

## Sources

- [Musician's Guide to SEO 2025 - Hypebot](https://www.hypebot.com/hypebot/2025/07/musicians-guide-to-seo-2.html)
- [SEO for Musicians: A 2025 Review - MusicPromoToday](https://medium.com/@MusicPromoToday/seo-for-musicians-a-2025-review-of-keywords-and-strategies-that-drive-discovery-d94f29716e63)
- [14 Best SEO Tips for Musicians in 2026](https://soundcamps.com/blog/best-seo-tips-for-musicians/)
- [Schema Markup for Musicians - InClassics](https://inclassics.com/blog/seo-for-musicians-schema-markup)
- [How to Optimize Your Band Schema for SEO - Bandzoogle](https://bandzoogle.com/blog/how-to-optimize-your-band-schema)
- [MusicGroup - Schema.org](https://schema.org/MusicGroup)
- [MusicRecording - Schema.org](https://schema.org/MusicRecording)
- [The Open Graph Protocol](https://ogp.me/)
- [Open Graph Music - Meta for Developers](https://developers.facebook.com/docs/opengraph/music/)
- [Google Knowledge Panel for Musicians: 2026 Strategy Guide - 12AM Agency](https://12amagency.com/blog/google-knowledge-panel-for-musicians/)
- [How to Get a Google Knowledge Panel for Musicians - Ditto Music](https://dittomusic.com/en/blog/how-to-get-a-google-knowledge-graph-for-musicians)
- [How to Get a Google Knowledge Panel - Bandsintown](https://www.artists.bandsintown.com/blog/how-to-get-a-google-knowledge-panel-for-musicians)
- [How to Get a Band Knowledge Panel - Bandzoogle](https://bandzoogle.com/blog/how-to-get-a-band-knowledge-panel)
- [Managing a Custom Domain for GitHub Pages - GitHub Docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [Optimizing SEO for GitHub-Hosted Sites](https://free-git-hosting.github.io/seo-for-github-hosted-sites/)
- [XML Sitemaps & Robots.txt Guide - Straight North](https://www.straightnorth.com/blog/xml-sitemaps-and-robots-txt-how-to-guide-search-engines-effectively/)
- [Robots.txt for SEO: Complete 2025 Guide - Increv](https://increv.co/academy/seo/robots-txt/)
- [MusicBrainz](https://musicbrainz.org/)
- [Spotify for Artists](https://artists.spotify.com/home)
- [Artist Name Disambiguation - Spotify Research](https://research.atspotify.com/2023/11/which-witch-artist-name-disambiguation-and-catalog-curation-using-audio-and-metadata)
