# Business Inventory Backend

## Setup Instructions

1. **Install Dependencies**
   ```sh
   npm install
   ```

2. **Configure Database**
   - Use PostgreSQL (recommended).
   - Create a database (e.g., `buisness_inventory`).
   - Copy `.env.example` to `.env` and update `DATABASE_URL` with your credentials:
     ```env
     DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/buisness_inventory"
     ```

3. **Run Migrations**
   ```sh
   npx prisma migrate dev --name init
   ```

4. **Generate Prisma Client**
   ```sh
   npx prisma generate
   ```

5. **Start the Server**
   ```sh
   npm run dev
   ```

## Project Structure
- `src/` — Source code (controllers, routes, models, services)
- `prisma/` — Prisma schema and migrations

## API Endpoints
- `/api/crops` — Manage crops
- `/api/transactions` — Manage transactions
- `/api/analytics/summary` — Summary cards
- `/api/analytics/bar` — Bar chart data
- `/api/analytics/trends` — Profit/loss trends

---

**Update the `.env` file with your actual database credentials before running migrations.** 