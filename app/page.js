"use client";
import {useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";

const FALLBACK = "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1400&q=80";
const BATCH_SIZE = 25;
const SERENDIPITY_BATCH_SIZE = 9;
const categoryClass = section => `cat-${(section || "news").toLowerCase().replace(/[^a-z]+/g, "-").replace(/(^-|-$)/g, "")}`;
const arrangeForFrames = items => {
  const arranged = [...items];
  const compactSlots = [1, 3, 4, 8];
  const visualSlots = [0, 2, 6, 5, 7, 9].filter(index => index < arranged.length);
  const needsVisualFrame = item => ["video", "bandcamp", "visual", "social"].includes(item?.format);
  compactSlots.filter(index => index < arranged.length && needsVisualFrame(arranged[index])).forEach(index => {
    const swap = visualSlots.find(candidate => !needsVisualFrame(arranged[candidate]));
    if (swap !== undefined) [arranged[index], arranged[swap]] = [arranged[swap], arranged[index]];
  });
  return arranged;
};
function age(date) { if (!date) return "From the shelf"; const hours = (Date.now() - new Date(date)) / 36e5; return hours < 1 ? `${Math.max(1, Math.round(hours * 60))} min ago` : hours < 24 ? `${Math.round(hours)} hr ago` : `${Math.round(hours / 24)}d ago`; }
function Feedback({item, onRate}) { return <div className="controls" aria-label="Story feedback"><button onClick={() => onRate(item, "more")}>♡ More like this</button><button onClick={() => onRate(item, "less")}>Less</button><button onClick={() => onRate(item, "political")}>Too political</button><button onClick={() => onRate(item, "depressing")}>Too depressing</button></div>; }
function RollingFact({label, children}) { return <div className="rollingFact"><b>{label}</b><span className="ticker"><i>{children}</i></span></div>; }
function Story({item, index, onRate}) {
  const tileRef = useRef(null);
  const type = item.format || "article";
  const [playing, setPlaying] = useState(false);
  const playable = type === "video" || type === "bandcamp";
  const playerUrl = type === "video" ? `https://www.youtube-nocookie.com/embed/${item.videoId}?autoplay=1&rel=0` : item.embedUrl;
  useLayoutEffect(() => {
    const tile = tileRef.current;
    const cluster = tile?.closest(".tetrisCluster");
    if (!tile || !cluster) return;
    const fitContents = () => {
      const headline = tile.querySelector("h3");
      if (!headline) return;
      headline.style.fontSize = "";
      let size = parseFloat(getComputedStyle(headline).fontSize);
      while ((tile.scrollHeight > tile.clientHeight + 1 || headline.scrollWidth > headline.clientWidth + 1) && size > 14) {
        size -= 1;
        headline.style.fontSize = `${size}px`;
      }
    };
    const observer = new ResizeObserver(fitContents);
    observer.observe(cluster);
    tile.querySelectorAll("img").forEach(image => image.addEventListener("load", fitContents));
    requestAnimationFrame(fitContents);
    return () => observer.disconnect();
  }, [item.canonicalUrl, playing]);
  return <article ref={tileRef} className={`tile tile-${type} tile-pattern-${index % 9} ${item.image ? "tile-has-image" : "tile-no-image"} ${categoryClass(item.section)}`}>
    {playable && playing ? <div className="inlinePlayer"><iframe src={playerUrl} title={item.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div> : item.image && (playable ? <button className="imageLink mediaTrigger" onClick={() => setPlaying(true)} aria-label={`Play ${item.title}`}><img src={item.image} alt="" onError={event => {event.currentTarget.src = FALLBACK;}} /><span className="play">▶</span></button> : <a className="imageLink" href={item.url} target="_blank" rel="noreferrer"><img src={item.image} alt="" onError={event => {event.currentTarget.src = FALLBACK;}} /></a>)}
    <div className="tileBody"><div className="kicker"><span>{item.section}</span><span>{type === "bandcamp" ? "New release" : type === "video" ? "Saved find" : age(item.date)}</span></div><h3><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></h3>{item.summary && type !== "visual" && <p>{item.summary.slice(0, type === "feature" ? 280 : 170)}</p>}<div className="meta">{item.source}</div><Feedback item={item} onRate={onRate}/></div>
  </article>;
}

export default function Home() {
  const [data, setData] = useState(null), [weather, setWeather] = useState(null), [batches, setBatches] = useState(1), [serendipityCount, setSerendipityCount] = useState(3), [radio, setRadio] = useState(false), [now, setNow] = useState(new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); fetch("/api/feed").then(response => response.json()).then(setData).catch(() => {}); fetch("/api/weather").then(response => response.json()).then(setWeather).catch(() => {}); return () => clearInterval(timer); }, []);
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const date = now.toLocaleDateString(undefined, {weekday: "long", month: "long", day: "numeric"});
  const wall = useMemo(() => { const stories = [...(data?.gallery || [])], media = [...(data?.media || [])], mixed = []; while (stories.length || media.length) { mixed.push(...stories.splice(0, 3)); if (media.length) mixed.push(media.shift()); } const result = [], pool = [...mixed], lastSeen = new Map(); while (pool.length) { const recent = result.slice(-20).map(item => item.source); let index = pool.findIndex(item => !recent.includes(item.source)); if (index < 0) { let oldest = Infinity; pool.forEach((item, candidate) => { const seen = lastSeen.get(item.source) ?? -Infinity; if (seen < oldest) { oldest = seen; index = candidate; } }); } const item = pool.splice(Math.max(0, index), 1)[0]; lastSeen.set(item.source, result.length); result.push(item); } return result; }, [data]);
  const visibleBatches = useMemo(() => Array.from({length: batches}, (_, index) => wall.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE)).filter(batch => batch.length), [wall, batches]);
  const rate = (item, action) => { const ratings = JSON.parse(localStorage.getItem("betterStartFeedback") || "[]"); ratings.push({url: item.url, title: item.title, source: item.source, action, ts: Date.now()}); localStorage.setItem("betterStartFeedback", JSON.stringify(ratings.slice(-250))); };
  return <main className="shell">
    <header className="mast"><div><div className="brand">Better Start <i>— Andrew&apos;s Edition</i></div><div className="edition">A curious morning, composed for you</div></div><button className={`radio ${radio ? "radioOn" : ""}`} onClick={() => setRadio(!radio)} aria-label={`Better Start Radio ${radio ? "on" : "off"}`} title="Better Start Radio placeholder"><span>♪</span><small>{radio ? "ON" : "RADIO"}</small></button></header>
    <div className="hello"><h1>{greeting}.</h1><p>{date}</p></div>

    <section className="ribbon" aria-label="Quick facts"><div className="weatherFact"><b>New Canaan</b><span>{weather?.high ? `${weather.high}° / ${weather.low}° · ${weather.precip}% rain` : "Forecast loading…"}</span></div><RollingFact label="Freshest favorite">{data?.ribbonFavorite?.title || "Checking your writers…"}</RollingFact><RollingFact label="A little good news">{data?.goodNews?.title || "Finding something cheerful…"}</RollingFact></section>

    <section className="favoritesSection"><div className="sectionHead"><div><span>From people you follow</span><h2>Just In From Your Favorites</h2></div><p>Recent posts, not an inbox</p></div><div className="favorites">{(data?.favorites || []).map(item => <a className="favorite" href={item.url} target="_blank" rel="noreferrer" key={item.canonicalUrl}><span>{age(item.date)}</span><h3>{item.title}</h3><b>{item.name}</b></a>)}</div></section>

    <section className="gallerySection"><div className="sectionHead wallHead"><div><span>Your coffee table</span><h2>Good Stuff</h2></div><p>Chosen for joy, curiosity & variety</p></div>{visibleBatches.length ? visibleBatches.map((batch, batchIndex) => <div className="galleryBatch" key={batchIndex}>{Array.from({length: Math.ceil(batch.length / 10)}, (_, clusterIndex) => { const cluster = arrangeForFrames(batch.slice(clusterIndex * 10, (clusterIndex + 1) * 10)), variant = (batchIndex * 3 + clusterIndex) % 3; return <div className={`tetrisCluster clusterVariant-${variant} ${cluster.length <= 5 ? "partialCluster" : ""}`} key={clusterIndex}>{cluster.map((item, index) => <Story item={item} index={batchIndex * BATCH_SIZE + clusterIndex * 10 + index} onRate={rate} key={item.canonicalUrl} />)}</div>; })}</div>) : <div className="loading"><span>Composing today&apos;s wall</span><i /><i /><i /></div>}
      {batches * BATCH_SIZE < wall.length && <div className="loadWrap"><button className="loadBtn" onClick={() => setBatches(count => count + 1)}>Load 25 More Good Things<span>↓</span></button></div>}
    </section>

    <section className="important"><div className="importantIntro"><span>Importance override</span><h2>You Should Know</h2><p>A small, calm briefing of consequential stories—kept distinct from the things chosen simply to brighten your morning.</p></div><div className="importantGrid">{(data?.important || []).map((item, index) => <Story item={item} index={index} onRate={rate} key={item.canonicalUrl} />)}</div></section>
    {!!data?.serendipity?.length && <section className="serendipity"><div className="sectionHead"><div><span>One more magazine underneath</span><h2>You Didn&apos;t Ask For This…</h2></div><p>Worth the detour</p></div><div className="serendipityGrid">{data.serendipity.slice(0, serendipityCount).map((item, index) => <Story item={item} index={index} onRate={rate} key={item.canonicalUrl} />)}</div>{serendipityCount < data.serendipity.length && <div className="loadWrap"><button className="loadBtn surpriseBtn" onClick={() => setSerendipityCount(count => count + SERENDIPITY_BATCH_SIZE)}>Add More Stuff I Didn&apos;t Ask For<span>↓</span></button></div>}</section>}
    <footer><b>BETTER START</b><span>Live RSS-first V2 · Feedback stays in this browser · No inbox debt</span></footer>
  </main>;
}
