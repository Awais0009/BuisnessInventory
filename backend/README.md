# Business Inventory Backend

A comprehensive TypeScript/Express.js backend for managing business inventory with crop transactions, analytics, and dashboard features.

## 🚀 Features

- **Crop Management**: CRUD operations for crops with stock tracking
- **Transaction Management**: Buy/sell transactions with automatic stock updates
- **Analytics**: Profit/loss analysis, trends, and performance metrics
- **Dashboard**: Real-time statistics and overview data
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: Request validation with Zod schemas
- **TypeScript**: Full type safety throughout the application

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## 🛠️ Installation

1. **Clone and navigate to backend**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your database credentials:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/business_inventory?schema=public"
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL="http://localhost:3002"
   ```

4. **Set up database**:
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Create database tables
   npm run db:push
   
   # Seed with sample data
   npm run db:seed
   ```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will be available at `http://localhost:5000`

## 📊 API Endpoints

### Health Check
- `GET /health` - Server health status

### Crops
- `GET /api/crops` - Get all crops (paginated)
- `GET /api/crops/:id` - Get single crop
- `POST /api/crops` - Create new crop
- `PUT /api/crops/:id` - Update crop
- `DELETE /api/crops/:id` - Delete crop
- `GET /api/crops/:id/transactions` - Get crop transactions
- `GET /api/crops/search/:query` - Search crops

### Transactions
- `GET /api/transactions` - Get all transactions (filtered)
- `GET /api/transactions/:id` - Get single transaction
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/recent/:limit` - Get recent transactions

### Analytics
- `GET /api/analytics/profit-loss` - Get profit/loss trends
- `GET /api/analytics/crop-performance` - Get crop-wise analytics
- `GET /api/analytics/trends` - Get trend data for charts
- `GET /api/analytics/summary` - Get overall analytics summary

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/overview` - Get overview for date range
- `GET /api/dashboard/quick-stats` - Get quick statistics
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