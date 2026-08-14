"use client";
import {useEffect, useMemo, useState} from "react";

const FALLBACK = "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1400&q=80";
const categoryClass = section => `cat-${(section || "news").toLowerCase().replace(/[^a-z]+/g, "-").replace(/(^-|-$)/g, "")}`;
function age(date) { if (!date) return "From the shelf"; const hours = (Date.now() - new Date(date)) / 36e5; return hours < 1 ? `${Math.max(1, Math.round(hours * 60))} min ago` : hours < 24 ? `${Math.round(hours)} hr ago` : `${Math.round(hours / 24)}d ago`; }
function Feedback({item, onRate}) { return <div className="controls" aria-label="Story feedback"><button onClick={() => onRate(item, "more")}>♡ More like this</button><button onClick={() => onRate(item, "less")}>Less</button><button onClick={() => onRate(item, "political")}>Too political</button><button onClick={() => onRate(item, "depressing")}>Too depressing</button></div>; }
function RollingFact({label, children}) { return <div className="rollingFact"><b>{label}</b><span className="ticker"><i>{children}</i></span></div>; }
function Story({item, index, onRate}) {
  const type = item.format || "article";
  return <article className={`tile tile-${type} tile-pattern-${index % 9} ${categoryClass(item.section)}`}>
    {item.image && <a className="imageLink" href={item.url} target="_blank" rel="noreferrer"><img src={item.image} alt="" onError={event => {event.currentTarget.src = FALLBACK;}} />{type === "video" && <span className="play">▶</span>}</a>}
    <div className="tileBody"><div className="kicker"><span>{item.section}</span><span>{age(item.date)}</span></div><h3><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></h3>{item.summary && type !== "visual" && <p>{item.summary.slice(0, type === "feature" ? 280 : 170)}</p>}<div className="meta">{item.source}</div><Feedback item={item} onRate={onRate}/></div>
  </article>;
}

export default function Home() {
  const [data, setData] = useState(null), [weather, setWeather] = useState(null), [expanded, setExpanded] = useState(false), [radio, setRadio] = useState(false), [now, setNow] = useState(new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); fetch("/api/feed").then(response => response.json()).then(setData).catch(() => {}); fetch("/api/weather").then(response => response.json()).then(setWeather).catch(() => {}); return () => clearInterval(timer); }, []);
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const date = now.toLocaleDateString(undefined, {weekday: "long", month: "long", day: "numeric"});
  const visible = useMemo(() => (data?.gallery || []).slice(0, expanded ? 24 : 14), [data, expanded]);
  const rate = (item, action) => { const ratings = JSON.parse(localStorage.getItem("betterStartFeedback") || "[]"); ratings.push({url: item.url, title: item.title, source: item.source, action, ts: Date.now()}); localStorage.setItem("betterStartFeedback", JSON.stringify(ratings.slice(-250))); };
  return <main className="shell">
    <header className="mast"><div><div className="brand">Better Start <i>— Andrew&apos;s Edition</i></div><div className="edition">A curious morning, composed for you</div></div><button className={`radio ${radio ? "radioOn" : ""}`} onClick={() => setRadio(!radio)} aria-label={`Better Start Radio ${radio ? "on" : "off"}`} title="Better Start Radio placeholder"><span>♪</span><small>{radio ? "ON" : "RADIO"}</small></button></header>
    <div className="hello"><h1>{greeting}.</h1><p>{date}</p></div>

    <section className="ribbon" aria-label="Quick facts"><div className="weatherFact"><b>New Canaan</b><span>{weather?.high ? `${weather.high}° / ${weather.low}° · ${weather.precip}% rain` : "Forecast loading…"}</span></div><RollingFact label="Freshest favorite">{data?.ribbonFavorite?.title || "Checking your writers…"}</RollingFact><RollingFact label="A little good news">{data?.goodNews?.title || "Finding something cheerful…"}</RollingFact></section>

    <section className="favoritesSection"><div className="sectionHead"><div><span>From people you follow</span><h2>Just In From Your Favorites</h2></div><p>Recent posts, not an inbox</p></div><div className="favorites">{(data?.favorites || []).map(item => <a className="favorite" href={item.url} target="_blank" rel="noreferrer" key={item.canonicalUrl}><span>{age(item.date)}</span><h3>{item.title}</h3><b>{item.name}</b></a>)}</div></section>

    <section className="gallerySection"><div className="sectionHead wallHead"><div><span>Your coffee table</span><h2>Good Stuff</h2></div><p>Chosen for joy, curiosity & variety</p></div>{visible.length ? <div className="gallery">{visible.map((item, index) => <Story item={item} index={index} onRate={rate} key={item.canonicalUrl} />)}</div> : <div className="loading"><span>Composing today&apos;s wall</span><i /><i /><i /></div>}
      {data?.gallery?.length > 14 && <div className="loadWrap"><button className="loadBtn" onClick={() => setExpanded(!expanded)}>{expanded ? "Fold the magazines back up" : "Load More Good Stuff"}<span>→</span></button></div>}
    </section>

    <section className="important"><div className="importantIntro"><span>Importance override</span><h2>You Should Know</h2><p>A small, calm briefing of consequential stories—kept distinct from the things chosen simply to brighten your morning.</p></div><div className="importantGrid">{(data?.important || []).map((item, index) => <Story item={item} index={index} onRate={rate} key={item.canonicalUrl} />)}</div></section>
    {!!data?.serendipity?.length && <section className="serendipity"><div className="sectionHead"><div><span>One more magazine underneath</span><h2>You Didn&apos;t Ask For This…</h2></div><p>Worth the detour</p></div><div className="serendipityGrid">{data.serendipity.map((item, index) => <Story item={item} index={index} onRate={rate} key={item.canonicalUrl} />)}</div></section>}
    <footer><b>BETTER START</b><span>Live RSS-first V2 · Feedback stays in this browser · No inbox debt</span></footer>
  </main>;
}
