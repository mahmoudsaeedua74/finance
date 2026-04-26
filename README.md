# Personal Finance (Next.js + MongoDB)

Monolithic app: the UI is **Next.js (App Router)** and the **API** lives in `src/app/api/**/route.ts` (no separate Express server). Data is stored in **MongoDB** via **Mongoose**.

## Prerequisites

- Node.js 18+
- A running **MongoDB** instance (local install, Docker, or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

## 1. Install dependencies

```bash
npm install
```

## 2. Configure the environment

Copy the example file and set your connection string:

```bash
copy .env.example .env
```

On macOS or Linux, use `cp` instead of `copy`.

Edit `.env` and set:

- **`MONGODB_URI`** — required. Examples:
  - Local: `mongodb://127.0.0.1:27017/personal-finance`
  - Atlas: `mongodb+srv://USER:PASS@cluster.example.mongodb.net/personal-finance?retryWrites=true&w=majority`

For **email reports** (optional), set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and either `REPORT_EMAIL_TO` or use the `to` field in the API body.

## 3. Start MongoDB (if local)

**Windows (installed service):** start the *MongoDB* service from *Services* or your installer’s shortcut.

**Docker:**

```bash
docker run -d --name mongo -p 27017:27017 mongo:7
```

## 4. (Optional) Load example data

With MongoDB up and `MONGODB_URI` set in `.env`:

```bash
npm run seed
```

This clears existing `incomes`, `expenses`, and `projects` in that database and inserts a small demo set for the **current** calendar month.

## 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The frontend and API run together; API routes are under `/api/...`.

## 6. Production build

```bash
npm run build
npm start
```

---

## How it is wired

| Layer        | Path |
|-------------|------|
| Pages / UI  | `src/app/(dashboard)/**` |
| API routes  | `src/app/api/**/route.ts` |
| DB models   | `src/lib/models/*` |
| Report math | `src/lib/build-monthly-report.ts` |

**Recurring “fixed” expenses** are stored as a single document with `isTemplate: true` and a date range; each month the report **includes** the amount if the month falls in range.

**Projects** are included in the same month’s **income** total as salary/freelance (see `build-monthly-report.ts`).

## API quick reference

- `GET/POST /api/incomes` — list (optional `?year=&month=`) and create
- `GET/PUT/DELETE /api/incomes/:id`
- `GET/POST /api/expenses` — list for a month: `?year=&month=`; full list: omit both
- `GET/PUT/DELETE /api/expenses/:id`
- `GET/POST /api/projects` — same query pattern
- `GET/PUT/DELETE /api/projects/:id`
- `GET /api/reports/monthly?year=&month=`
- `POST /api/email/monthly-report` — body `{ "year": 2026, "month": 4 }` (and optional `to` email) when SMTP is configured
