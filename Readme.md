# Phantom Load

Phantom Load is a full-stack home energy audit application. It helps households record appliances room by room, estimate electricity consumption and monthly costs, identify standby-power waste, and get tailored energy-saving guidance from an AI advisor.

The project is built for a practical workflow: create an account, add the rooms in a home, record each appliance's usage pattern, and use the dashboard to understand what is driving the bill.

## Features

- Account registration and login with password hashing and JWT authentication.
- Room-based appliance inventory for homes, apartments, or individual spaces.
- Appliance details including wattage, quantity, daily use, and standby use.
- Estimated daily and monthly kWh consumption and electricity cost.
- Configurable electricity rate per unit for each user.
- Standby-power analysis to surface appliances that continue using energy while idle.
- Audit snapshots for comparing energy use over time.
- AI energy advisor powered by Google Gemini, informed by the signed-in user's current appliance inventory.
- Responsive React dashboard with charts and visual consumption summaries.

## How It Works

For every appliance, the app estimates energy use from its wattage, quantity, and daily usage time. Monthly consumption is based on a 30-day estimate. Appliances marked as having standby usage also contribute a lower standby load outside their active hours.

The app aggregates those figures by room and across the entire home. Once the inventory is populated, the AI advisor receives a summary of the user's rooms, appliances, consumption, and configured rate so its recommendations are specific to the household rather than generic.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, Vite, Recharts |
| Backend | Node.js, Express, ES modules |
| Database | MongoDB with Mongoose |
| Authentication | JSON Web Tokens and bcryptjs |
| AI | Google Gemini via `@google/generative-ai` |
| Development | Nodemon, ESLint, Playwright |

## Project Structure

```text
TeamError/
|-- backend/
|   |-- config/          # Database, Gemini, and authentication configuration
|   |-- controllers/     # Request handling and application logic
|   |-- middleware/      # Auth, validation, CORS, logging, and errors
|   |-- models/          # MongoDB schemas
|   |-- routes/          # Express API routes
|   |-- utils/           # Prompt and helper utilities
|   `-- server.js        # Backend entry point
|-- frontend/
|   |-- src/             # React components, pages, and API client
|   |-- scripts/         # Local development checks
|   `-- vite.config.js   # Vite configuration
`-- Readme.md
```

## Prerequisites

- Node.js 18 or newer
- npm
- A MongoDB database
- A Google Gemini API key for the AI advisor

## Installation

Install and run the backend first, then start the frontend in a separate terminal.

### 1. Configure the backend

Create `backend/.env` with your own values:

```env
MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=use_a_long_random_secret
JWT_EXPIRES_IN=7d
PORT=your_backend_port
```

`JWT_SECRET` should be a strong, private value. Do not commit `.env` files or real credentials to source control.

### 2. Install and start the backend

```bash
cd backend
npm install
npm run dev
```

Use `npm start` when you want to run the backend without Nodemon.

### 3. Configure the frontend

Create `frontend/.env` and point it at the backend address appropriate for your environment:

```env
VITE_API_BASE_URL=your_backend_address
```

For a phone or another computer on the same network, use an address the device can reach rather than a loopback-only address.

### 4. Install and start the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend development command checks that the backend health endpoint is reachable before Vite starts. This catches configuration issues early.

## Typical User Flow

1. Register a new account or sign in.
2. Create rooms such as Living Room, Kitchen, or Bedroom.
3. Add appliances to each room with wattage, quantity, and usage hours.
4. Mark appliances that draw power in standby mode and enter their standby hours.
5. Set the local electricity rate in Settings.
6. Review estimated energy usage, monthly costs, and high-consumption appliances.
7. Save an audit snapshot when you want to compare household usage later.
8. Ask the AI advisor for practical reduction ideas based on the saved inventory.

## Data Model

### User

Stores a user's name, unique email address, and bcrypt password hash. Password hashes are not returned in normal queries.

### Room

Each room belongs to a user and stores a display name. Rooms contain the user's appliances through their room reference.

### Appliance

An appliance belongs to both a user and a room. It records:

- `name`
- `wattage`
- `quantity`
- `daily_hours`
- `standby`
- `standby_hours`
- `is_custom`

### Settings

Settings are key-value entries scoped to a user. The primary setting is `ratePerUnit`, which is used for cost estimates.

### Audit

An audit snapshot stores totals for monthly kWh, estimated cost, CO2, high standby consumers, and room-level summaries.

## API Overview

All application routes are grouped under `/api`. Protected routes require an `Authorization: Bearer <token>` header obtained after registration or login.

| Area | Routes | Authentication |
| --- | --- | --- |
| Health | `GET /api/health` | No |
| Authentication | `POST /api/auth/register`, `POST /api/auth/login` | No |
| Rooms | `GET`, `POST /api/rooms`; `GET`, `PUT`, `DELETE /api/rooms/:id` | Yes |
| Appliances | `POST /api/rooms/:id/appliances`; `PUT`, `DELETE /api/appliances/:id` | Yes |
| Settings | `GET /api/settings`, `GET`, `PUT /api/settings/:key` | Yes |
| AI advisor | `POST /api/chat` | Yes |
| Audits | `POST`, `GET /api/audits`; `GET /api/audits/:id` | No |

## Available Commands

### Backend

```bash
npm run dev    # Start with automatic restart on source changes
npm start      # Start the production-style Node process
```

### Frontend

```bash
npm run dev    # Start Vite development server
npm run build  # Create a production build
npm run lint   # Run ESLint
npm run preview # Preview the production build locally
```

## Security Notes

- Keep `MONGO_URI`, `GEMINI_API_KEY`, and `JWT_SECRET` private.
- Use different credentials for local development and deployed environments.
- Rotate a credential immediately if it is committed or otherwise exposed.
- Protected room, appliance, settings, and chat requests are scoped to the authenticated user.

## Team

Built by Team Error.
