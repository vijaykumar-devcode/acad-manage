# CampusAssess

A full-stack campus assessment and learning management platform built with React, Express, and MongoDB.

---

## Tech Stack

| Layer       | Technology                            |
|-------------|---------------------------------------|
| Frontend    | React 19, TypeScript, Vite, Zustand   |
| Backend     | Node.js, Express 5, TypeScript, tsx   |
| Database    | MongoDB (Mongoose ODM)                |
| Auth        | JWT (httpOnly cookies, sameSite:strict)|
| Validation  | Zod (client + server)                 |
| Logging     | Pino (structured JSON logging)        |
| Security    | Helmet, express-rate-limit, mongo-sanitize |

---

## Project Structure

```
campusasses/
├── src/                  # React frontend
│   ├── components/       # UI components (layout, ui)
│   ├── pages/            # Route-level page components
│   ├── store/            # Zustand state management
│   ├── services/         # Axios API client
│   └── types/            # Shared TypeScript types
│
└── server/
    └── src/
        ├── config/       # DB connection (with connection pool)
        ├── controllers/  # Express route handlers
        ├── middleware/   # Auth, error, rate-limiting
        ├── models/       # Mongoose schemas
        ├── routes/       # Express routers
        └── utils/        # Shared utilities (gradeUtils, quizUtils, logger)
```

---

## Getting Started

### Prerequisites

- Node.js >= 20
- MongoDB (local or Atlas)

### 1. Clone and install dependencies

```bash
# Frontend
npm install

# Backend
cd server
npm install
```

### 2. Configure environment variables

**Frontend** — create `campusasses/.env` from the example:
```bash
cp .env.example .env
```

**Backend** — create `campusasses/server/.env`:
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/campusasses
JWT_SECRET=<generate-a-strong-secret-with-openssl-rand-base64-48>
CLIENT_URL=http://localhost:5173
LOG_LEVEL=debug
```

> ⚠️ **Never commit `.env` files.** `JWT_SECRET` must be at least 48 characters of random entropy.

### 3. Start the development servers

```bash
# Frontend (in root directory)
npm run dev

# Backend (in server/ directory)
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:5000`.

---

## Available Scripts

### Frontend (`/`)

| Script          | Description                          |
|-----------------|--------------------------------------|
| `npm run dev`   | Start Vite dev server                |
| `npm run build` | Production build                     |
| `npm run format`| Format source files with Prettier    |
| `npm run lint`  | Lint with oxlint                     |

### Backend (`/server`)

| Script               | Description                          |
|----------------------|--------------------------------------|
| `npm run dev`        | Start server with hot-reload (tsx)   |
| `npm run typecheck`  | Run TypeScript type check            |
| `npm run lint`       | Lint with ESLint                     |
| `npm run format`     | Format source files with Prettier    |

---

## Roles & Access Control

| Role    | Access                                              |
|---------|-----------------------------------------------------|
| Admin   | Full system access, user management, all reports    |
| Faculty | Own classes, quizzes, assignments, marks, PYQs      |
| Student | Enrolled classes, own submissions, own results      |

---

## Security Notes

- JWT stored in `httpOnly`, `sameSite: strict` cookies — not accessible to JavaScript
- All user inputs validated with Zod on both client and server
- MongoDB operator injection prevented by `express-mongo-sanitize`
- Search queries are regex-escaped to prevent ReDoS
- Rate limiting: 10 auth attempts / 15 min, 300 global / 15 min
- CORS restricted to `CLIENT_URL` env variable
- Helmet CSP enabled with strict defaults

---

## License

Private repository — All rights reserved.
