# MealCraft

Your Ultimate Meal Planning & Nutrition Platform

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: RTK Query + Zustand
- **i18n**: next-intl (Ukrainian + English)
- **Authentication**: NextAuth.js v5 with Google OAuth

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15+
- **ORM**: SQLAlchemy 2.0 (async)
- **Migrations**: Alembic

## Project Structure

```
mealcraft/
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/# React components
│   │   ├── lib/       # Utilities, API, store
│   │   ├── locales/   # i18n translations
│   │   └── i18n/      # i18n configuration
│   └── ...
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/       # API routes
│   │   ├── core/      # Config, security, database
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   └── services/  # Business logic
│   ├── alembic/       # Database migrations
│   └── ...
└── .claudeproject     # Project specification
```

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+

### Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your credentials
npm run dev
```

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials

# Create database
createdb mealcraft_dev

# Run migrations
alembic upgrade head

# Seed initial data
python -m app.scripts.seed_data

# Start server
uvicorn app.main:app --reload
```

## Available Modules

| Module | Status | Description |
|--------|--------|-------------|
| Dashboard | Phase 0 | Overview and quick actions |
| Groceries | Phase 1 | Grocery management (NEXT) |
| Meal Planner | Phase 2 | Weekly meal planning |
| Recipes | Phase 2 | AI recipe generation |
| Shopping Lists | Phase 3 | Generated shopping lists |
| Pantry | Phase 3 | Inventory management |
| Nutrition | Phase 3 | Nutrition tracking |
| Restaurants | Phase 3 | Takeout tracking |
| Seasonality | Phase 4 | Seasonal produce guide |
| Learning | Phase 4 | Cooking techniques |
| Health | Phase 4 | Health integrations |
| Settings | Phase 0 | User preferences |
| Admin | Phase 6 | Admin panel |

## Subscription Tiers

- **Home Cook (Free)**: 5 AI meal plans/month, 20 saved recipes
- **Chef's Choice ($9.99/mo)**: 30 AI plans, inventory, batch cooking
- **Master Chef ($19.99/mo)**: Unlimited, all features

## Development

### Current Phase: 0 (Foundation) - COMPLETE

Phase 0 deliverables:
- [x] Next.js + FastAPI project setup
- [x] PostgreSQL database with SQLAlchemy models
- [x] Alembic migrations
- [x] Google OAuth authentication (NextAuth.js v5)
- [x] User roles and tier system
- [x] i18n (English + Ukrainian)
- [x] shadcn/ui components
- [x] Collapsible sidebar navigation
- [x] Dashboard layout
- [x] ModuleTabs component
- [x] Theme system (light/dark/system)
- [x] State management (RTK Query + Zustand)
- [x] Event bus for inter-module communication
- [x] Seed data for tiers and features

### Next: Phase 1 (Groceries Module)

Ready to implement the Groceries module with all features.

## License

Private - All rights reserved
