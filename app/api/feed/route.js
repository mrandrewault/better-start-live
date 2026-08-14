import Parser from "rss-parser";
import fs from "fs";
import path from "path";

const parser = new Parser({
  timeout: 9000,
  headers: {"User-Agent": "BetterStart/2.0"},
  customFields: {item: [["media:content", "mediaContent"], ["media:thumbnail", "mediaThumbnail"]]}
});
const dataPath = name => path.join(process.cwd(), "data", name);
const load = name => JSON.parse(fs.readFileSync(dataPath(name), "utf8"));

function plain(value = "") {
  return value.replace(/<[^>]+>/g, " ").replace(/&\w+;/g, " ").replace(/\s+/g, " ").trim();
}
function normalizeTitle(value = "") {
  return plain(value).toLowerCase().replace(/\b(the|a|an|and|or|but|to|of|for|in|on|at|with|from)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
}
function canonicalUrl(value = "") {
  try {
    const url = new URL(value);
    url.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "source", "output"].forEach(key => url.searchParams.delete(key));
    url.hostname = url.hostname.replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/$/, "") || "/";
    return `${url.hostname}${url.pathname}${url.searchParams.toString() ? `?${url.searchParams}` : ""}`;
  } catch { return value.replace(/\/$/, ""); }
}
function imageFor(item) {
  const html = item.content || item["content:encoded"] || "";
  return item.enclosure?.url || item.mediaContent?.$?.url || item.mediaThumbnail?.$?.url || html.match(/<img[^>]+src=["']([^"']+)/i)?.[1] || null;
}
function itemText(item) { return `${item.title || ""} ${item.contentSnippet || ""} ${item.content || ""}`.toLowerCase(); }
function isDisallowed(item) {
  const value = `${item.title || ""} ${item.summary || ""} ${item.contentSnippet || ""}`.toLowerCase();
  return /\b(trump|maga|white house|mar-a-lago|gop|republican party|democratic party|democrats|congress|senate|house speaker|pentagon|department of justice|doj|ice agents?|fbi|supreme court|presidential election|midterms?|campaign trail|rfk jr|jd vance|stephen miller|karoline leavitt|washington politics|android|google pixel|pixel phone|samsung galaxy|samsung phone|windows laptop|windows pc|microsoft surface|dell laptop|dell computer|lenovo laptop|chromebook)\b/i.test(value);
}
function isJoyful(item) {
  const value = `${item.title || ""} ${item.summary || ""}`;
  return /discover|new|beautiful|guide|best|love|return|release|photo|album|art|music|food|travel|space|nature|design|book|film|restor|celebrat|rescue|record|garden|recipe|festival|museum/i.test(value) && !/killed|deadly|war|attack|crisis|disaster|outrage|scandal|cancer|dies?\b|death|threat|fear|begging|dashed dreams|cranky|torches|revolt|horrific/i.test(value);
}
function isGoodNews(item) {
  const value = `${item.title || ""} ${item.summary || ""}`;
  return /discover|beautiful|love|return|restor|celebrat|rescue|breakthrough|success|wins?\b|record|opens?|reun|reviv|saved?|found/i.test(value) && isJoyful(item);
}
function score(item, source, taste) {
  const text = itemText(item); let value = (source.quality || 5) * 5, hits = 0, noHits = 0;
  for (const raw of taste.yes) if (text.includes(raw.toLowerCase())) { value += 8; if (++hits >= 7) break; }
  for (const raw of taste.no) if (text.includes(raw.toLowerCase())) { value -= 24; noHits++; }
  const hours = item.isoDate ? (Date.now() - new Date(item.isoDate)) / 36e5 : 24;
  value += hours <= 6 ? 10 : hours <= 24 ? 6 : hours <= 48 ? 2 : -Math.min(12, hours / 24);
  if (/you won't believe|internet is freaking|shocking|what happened next/i.test(item.title || "")) value -= 15;
  return {score: Math.round(value), interestHits: hits, noHits};
}
function formatFor(item, index) {
  if (item.videoId) return "video";
  if (item.image && index % 7 === 0) return "feature";
  if (item.image && (/photography|art \+ design/i.test(item.section) || index % 3 === 1)) return "visual";
  if (!item.image || (item.summary || "").length < 90) return "blurb";
  return "article";
}
function unique(items) {
  const urls = new Set(), titles = new Set(), output = [];
  for (const item of items) {
    const url = canonicalUrl(item.url), title = normalizeTitle(item.title);
    if (!url || !title || urls.has(url) || titles.has(title)) continue;
    urls.add(url); titles.add(title); output.push({...item, canonicalUrl: url, normalizedTitle: title});
  }
  return output;
}

// A greedy magazine editor: every choice is judged by how much it improves the
// current page, with diminishing returns for repeated sources/topics/formats.
function compose(candidates, count, seed = {}) {
  const chosen = [], sourceCounts = {...seed.sources}, topicCounts = {...seed.topics}, formatCounts = {...seed.formats};
  const pool = [...candidates];
  while (chosen.length < count && pool.length) {
    let winner = 0, best = -Infinity;
    pool.forEach((item, index) => {
      const sourcePenalty = (sourceCounts[item.source] || 0) >= 2 ? 1000 : (sourceCounts[item.source] || 0) * 24;
      const topicPenalty = (topicCounts[item.section] || 0) * 18;
      const formatPenalty = (formatCounts[item.format] || 0) * 8;
      const visualBonus = item.image && !(formatCounts.visual || 0) ? 12 : 0;
      const serendipityBonus = item.interestHits === 0 && chosen.length > 3 ? 5 : 0;
      const moodBonus = /discover|new|beautiful|guide|best|love|return|release|photo|album/i.test(`${item.title} ${item.summary}`) ? 4 : 0;
      const compositionScore = item.score - sourcePenalty - topicPenalty - formatPenalty + visualBonus + serendipityBonus + moodBonus + Math.random() * 0.01;
      if (compositionScore > best) { best = compositionScore; winner = index; }
    });
    const [item] = pool.splice(winner, 1); chosen.push(item);
    sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1;
    topicCounts[item.section] = (topicCounts[item.section] || 0) + 1;
    formatCounts[item.format] = (formatCounts[item.format] || 0) + 1;
  }
  return chosen;
}
function playlistFeature() {
  const files = fs.readdirSync(dataPath(".")).filter(name => name.endsWith("-videos.csv"));
  if (!files.length) return null;
  const day = Math.floor(Date.now() / 86400000);
  const file = files[day % files.length], rows = fs.readFileSync(dataPath(file), "utf8").trim().split(/\r?\n/).slice(1);
  const videoId = rows[(day * 7) % rows.length]?.split(",")[0];
  if (!videoId) return null;
  const playlist = file.replace(/-videos\.csv$/, "");
  return {title: `A video from Andrew's ${playlist} shelf`, url: `https://www.youtube.com/watch?v=${videoId}`, source: "YouTube library", section: /camera/i.test(playlist) ? "PHOTOGRAPHY" : "MUSIC", summary: `A daily find from the existing ${playlist} playlist.`, date: null, image: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, score: 52, interestHits: 1, noHits: 0, videoId, format: "video"};
}

function youtubeSubscriptions() {
  const lines = fs.readFileSync(dataPath("subscriptions.csv"), "utf8").split(/\r?\n/).slice(1);
  return lines.map(line => {
    const match = line.match(/^([^,]+),[^,]*,(?:"([^"]+)"|(.+))$/);
    return match ? {id: match[1], name: match[2] || match[3]} : null;
  }).filter(Boolean).filter(channel => !/andrew ault|drsuperfresh/i.test(channel.name));
}
async function loadYouTubeDiscoveries() {
  const affinity = /music|jazz|synth|record|photo|camera|film|cinema|norm|comedy|dead|beatles|stones|dylan|criterion|leica|moog|piano|concert/i;
  const channels = youtubeSubscriptions().filter(channel => affinity.test(channel.name));
  const day = Math.floor(Date.now() / 86400000), rotated = channels.slice(day % Math.max(1, channels.length)).concat(channels.slice(0, day % Math.max(1, channels.length))).slice(0, 16);
  const results = await Promise.allSettled(rotated.map(async channel => {
    const feed = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`);
    return (feed.items || []).slice(0, 2).map(item => {
      const videoId = item.id?.split(":").pop() || item.link?.match(/[?&]v=([^&]+)/)?.[1];
      return {title: plain(item.title), url: item.link, summary: `A recent find from one of Andrew's YouTube subscriptions.`, date: item.isoDate || item.pubDate || null, source: channel.name, section: /photo|camera|leica/i.test(channel.name) ? "PHOTOGRAPHY" : /film|cinema/i.test(channel.name) ? "FILM + CULTURE" : "MUSIC", image: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null, score: 66, interestHits: 2, noHits: 0, videoId, format: "video"};
    });
  }));
  const items = []; results.forEach(result => { if (result.status === "fulfilled") items.push(...result.value); });
  return items.filter(item => item.videoId && !isDisallowed(item) && isJoyful(item)).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}
async function loadPlaylistDiscoveries() {
  const preferred = ["funny shit-videos.csv", "Movie clips-videos.csv", "Film Class-videos.csv", "Favorites-videos.csv", "Blue Notes-videos.csv", "Synth-videos.csv", "GD-videos.csv", "Camera-videos.csv", "Concerts-videos.csv"];
  const day = Math.floor(Date.now() / 86400000), picks = [];
  preferred.forEach((file, index) => {
    const rows = fs.readFileSync(dataPath(file), "utf8").trim().split(/\r?\n/).slice(1);
    const videoId = rows[(day * (index + 3)) % rows.length]?.split(",")[0];
    if (videoId) picks.push({videoId, shelf: file.replace(/-videos\.csv$/, "")});
  });
  const results = await Promise.allSettled(picks.map(async pick => {
    const url = `https://www.youtube.com/watch?v=${pick.videoId}`;
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {next: {revalidate: 86400}});
    const meta = response.ok ? await response.json() : {};
    return {title: meta.title || `A video from Andrew's ${pick.shelf} shelf`, url, summary: `Pulled from Andrew's saved ${pick.shelf} playlist—not from his uploads.`, date: null, source: meta.author_name || `YouTube · ${pick.shelf}`, section: /camera/i.test(pick.shelf) ? "PHOTOGRAPHY" : /movie|film/i.test(pick.shelf) ? "FILM + CULTURE" : "MUSIC", image: meta.thumbnail_url || `https://i.ytimg.com/vi/${pick.videoId}/hqdefault.jpg`, score: 68, interestHits: 3, noHits: 0, videoId: pick.videoId, format: "video"};
  }));
  const items = []; results.forEach(result => { if (result.status === "fulfilled") items.push(result.value); });
  return items.filter(item => !/andrew ault|drsuperfresh/i.test(item.source) && !isDisallowed(item));
}
async function loadBandcampReleases() {
  const sources = load("bandcamp-sources.json");
  const results = await Promise.allSettled(sources.map(async source => {
    const response = await fetch(new URL("music", source.url), {headers: {"User-Agent": "BetterStart/2.0"}, next: {revalidate: 3600}});
    const html = await response.text(), items = [];
    const blockPattern = /<li data-item-id="(album|track)-(\d+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?<img src="([^"]+)"[\s\S]*?<p class="title">([\s\S]*?)<\/p>[\s\S]*?<\/li>/g;
    for (const match of html.matchAll(blockPattern)) {
      const titleText = plain(match[5].replace(/<br\s*\/?>/gi, " — "));
      const url = new URL(match[3], source.url).toString();
      items.push({title: titleText, url, summary: `A new-release shelf pick from ${source.name}. Click to listen.`, date: null, source: source.name, section: "MUSIC", image: match[4], score: 72, interestHits: 3, noHits: 0, format: "bandcamp", embedUrl: `https://bandcamp.com/EmbeddedPlayer/${match[1]}=${match[2]}/size=large/bgcol=fffefa/linkcol=d23d32/tracklist=false/artwork=small/transparent=true/`});
      if (items.length >= 3) break;
    }
    return items;
  }));
  const items = []; results.forEach(result => { if (result.status === "fulfilled") items.push(...result.value); });
  return items;
}
async function loadInstagramProfile() {
  try {
    const url = "https://www.instagram.com/andrew.ault.photography/";
    const html = await (await fetch(url, {headers: {"User-Agent": "Mozilla/5.0"}, next: {revalidate: 21600}})).text();
    const image = html.match(/property="og:image" content="([^"]+)/)?.[1]?.replace(/&amp;/g, "&");
    return {title: "A visual pause from Andrew Ault Photography", url, summary: "A doorway into Andrew's public photography feed.", date: null, source: "@andrew.ault.photography", section: "PHOTOGRAPHY", image, score: 70, interestHits: 3, noHits: 0, format: "social"};
  } catch { return null; }
}

export async function GET() {
  const taste = load("taste.json"), sources = load("sources.json"), favorites = load("favorites.json");
  const results = await Promise.allSettled(sources.map(async source => {
    const feed = await parser.parseURL(source.url);
    return (feed.items || []).slice(0, 14).map((item, index) => {
      const scored = score(item, source, taste);
      const story = {title: plain(item.title) || "Untitled", url: item.link || "#", summary: plain(item.contentSnippet || item.content || ""), date: item.isoDate || item.pubDate || null, source: source.name, section: source.section, image: imageFor(item), ...scored};
      return {...story, format: formatFor(story, index)};
    });
  }));
  let all = [];
  results.forEach(result => { if (result.status === "fulfilled") all.push(...result.value); });
  const video = playlistFeature(); if (video) all.push(video);
  all = unique(all.filter(item => item.score > 18 && !isDisallowed(item) && isJoyful(item)).sort((a, b) => b.score - a.score));

  const favoriteResults = await Promise.allSettled(favorites.map(async favorite => {
    const feed = await parser.parseURL(favorite.url);
    return (feed.items || []).slice(0, 3).map(item => ({name: favorite.name, source: favorite.name, title: plain(item.title) || "New post", url: item.link || "#", date: item.isoDate || item.pubDate || null, summary: plain(item.contentSnippet || ""), section: "FAVORITES", format: "favorite"}));
  }));
  let favoriteItems = [];
  favoriteResults.forEach(result => { if (result.status === "fulfilled") favoriteItems.push(...result.value); });
  favoriteItems = unique(favoriteItems.filter(item => !isDisallowed(item) && isJoyful(item)).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));

  // One shared registry across every page region makes duplicates impossible.
  const usedUrls = new Set(), usedTitles = new Set();
  const claim = items => items.filter(item => {
    const url = canonicalUrl(item.url), title = normalizeTitle(item.title);
    if (usedUrls.has(url) || usedTitles.has(title)) return false;
    usedUrls.add(url); usedTitles.add(title); return true;
  });
  const ribbonFavorite = claim(favoriteItems.slice(0, 1))[0] || null;
  const favoriteSelection = claim(favoriteItems).slice(0, 6);
  const goodNews = claim(compose(all.filter(isGoodNews), 1))[0] || null;
  const [youtubeItems, bandcampItems] = await Promise.all([loadPlaylistDiscoveries(), loadBandcampReleases()]);
  const mediaPool = unique([...bandcampItems, ...youtubeItems]);
  const media = claim(compose(mediaPool, 7));
  const importantPool = all.filter(item => ["NASA", "NYT Technology", "Guardian Science"].includes(item.source) && isJoyful(item));
  const important = claim(compose(importantPool, 3));
  const galleryPool = all.filter(item => !usedUrls.has(canonicalUrl(item.url)) && !usedTitles.has(normalizeTitle(item.title)));
  const gallery = claim(compose(galleryPool, 24));
  const serendipityPool = all.filter(item => item.interestHits === 0 && item.noHits === 0 && isJoyful(item) && !usedUrls.has(canonicalUrl(item.url)));
  const serendipity = claim(compose(serendipityPool, 3));

  return Response.json({generatedAt: new Date().toISOString(), ribbonFavorite, goodNews, favorites: favoriteSelection, media, gallery, important, serendipity, sourceStatus: {total: sources.length, successful: results.filter(result => result.status === "fulfilled").length}}, {headers: {"Cache-Control": "s-maxage=900, stale-while-revalidate=1800"}});
}
