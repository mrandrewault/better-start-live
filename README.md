# Better Start — Andrew's Edition (Live V1)

A live RSS-first personalized morning homepage.

## Live now
- Smart time-of-day greeting
- Live New Canaan weather via Open-Meteo
- Live RSS aggregation from music, photography, film/culture, books, tech/AI, design, food/travel and science sources
- Live Substack feeds for Jeff Tweedy, Joel Stein, Grissom, José Andrés, The Gall and Aaron Parnas
- Personalized scoring using explicit YES / DON'T WANT interests
- Recency weighting, clickbait penalty and duplicate clustering
- FOR YOU editorial layout
- LOAD MORE GOOD NEWS
- YOU SHOULD KNOW importance lane
- YOU DIDN'T ASK FOR THIS serendipity lane
- Local feedback persistence
- Your uploaded YouTube subscriptions and playlist CSVs bundled into /data for the next ranking pass

## Intentionally deferred
- Instagram/TikTok ingestion: Today's Eye is present, but it does not rely on brittle scraping
- Better Start Radio audio backend
- Login/cloud sync
- Paid news APIs
- AI semantic ranking

## Run locally
Requires Node 18+.

1. `npm install`
2. `npm run dev`
3. Open `http://localhost:3000`

## Deploy
This is a standard Next.js app and can be deployed to Vercel. Import the project/repository and deploy.

## Notes
RSS feeds can change. The app tolerates individual feed failures, so one broken source will not break the whole edition.
