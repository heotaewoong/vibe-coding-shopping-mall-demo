# Shopping Server

Minimal Node.js + Express backend using MongoDB (Mongoose).

Quick start

1. Install dependencies

```bash
npm install
```

2. Run without DB (quick smoke test)

```bash
# Start with SKIP_DB=1 to skip Mongo connection
SKIP_DB=1 npm start
```

3. Run with MongoDB

Set `MONGO_URI` environment variable to your Mongo connection string, then run:

```bash
npm start
```

API
- GET / -> sanity
- GET /items -> list items
- POST /items -> create item (body: { name, qty })
