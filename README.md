# URL Shortener

A full-stack URL shortener with click analytics.

- **Frontend:** React + Vite + Tailwind CSS + React Router
- **Backend:** Node.js + Express
- **Database:** MySQL (source of truth for links and clicks)
- **Cache:** Redis (caches short code → original URL lookups)
- **Queue:** BullMQ (processes click analytics asynchronously)
- **Short codes:** Base62, generated randomly, 7 characters

## How it works

1. A user submits a long URL. The backend generates a random Base62 code and
   stores the pair in MySQL.
2. When someone visits a short link, the backend checks Redis first. On a
   cache miss, it looks up MySQL and stores the result in Redis for next time.
3. The click is queued in BullMQ and the user is redirected immediately —
   the redirect never waits on the queue or the analytics write.
4. A background worker reads click jobs from the queue and writes them to
   MySQL.
5. The analytics page reads aggregated click data from MySQL.

## Project structure

```text
UrlShorter/
├── src/                     # React frontend (Vite root)
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
│
└── backend/
    ├── src/
    │   ├── config/
    │   ├── controllers/
    │   ├── routes/
    │   ├── services/
    │   ├── db/
    │   ├── queue/
    │   ├── middleware/
    │   └── utils/
    ├── src/app.js
    ├── server.js
    ├── worker.js
    ├── schema.sql
    ├── package.json
    └── .env.example
```

## Prerequisites

- Node.js 18.11+
- MySQL Server (running locally or remotely)
- Redis Server (running locally or remotely)

## Setup

### 1. Database

Run `backend/schema.sql` against your MySQL server. In MySQL Workbench: open
the file (or paste it into a query tab) and execute the whole script. This
creates the `url_shortener` database with the `short_links` and `clicks`
tables.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your MySQL credentials and Redis URL. Then, in two separate
terminals:

```bash
npm run dev      # starts the API on the port set in .env (default 3000)
npm run worker:dev   # starts the background worker that records clicks
```

Both must be running for links to redirect and for click analytics to be
recorded.

### 3. Frontend

From the repo root:

```bash
npm install
npm run dev
```

By default the frontend calls the API at `http://localhost:3000`. To change
this, set `VITE_API_BASE_URL` in a `.env` file at the repo root.

## API

| Method | Path                     | Description                          |
|--------|--------------------------|---------------------------------------|
| POST   | `/api/urls`              | Create a short link                   |
| GET    | `/:code`                 | Redirect to the original URL          |
| GET    | `/api/analytics/:code`   | Get click analytics for a short code  |
| GET    | `/api/health`            | Check API, MySQL and Redis status     |

## Notes

- Redis is a cache and queue backend only. MySQL is the permanent store for
  links and clicks.
- If Redis is unreachable, redirects still work — the backend falls back to
  MySQL and simply can't cache the result until Redis is back.
- Click analytics are processed asynchronously, so a click may take a
  moment to appear on the analytics page.