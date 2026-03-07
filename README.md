# Canupls - Hyperlocal Help Marketplace

<div align="center">
  <img src="./frontend/assets/images/logo.png" alt="Canupls Logo" width="300"/>
  
  **Your Hyperlocal Help Marketplace**
  
  Post tasks or become a helper. Quick. Local. Reliable.
</div>

## 📱 Overview

Canupls is a hyperlocal help marketplace connecting people who need quick help with nearby helpers. Built with React Native (Expo), Supabase, and modern mobile-first architecture.

### ✨ Features

- **🔐 Authentication**: Secure email/password auth via Supabase
- **👥 Dual User Roles**: Requesters and Helpers
- **📍 Location Services**: Real-time GPS tracking with Google Maps
- **💳 Secure Payments**: Stripe integration for seamless transactions
- **⭐ Rating System**: Built-in reviews and ratings
- **📱 Mobile-First**: Beautiful, responsive UI with Poppins font family
- **🔒 Row-Level Security**: Database-level security with Supabase RLS

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React Native (Expo 54) with TypeScript
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Payments**: Stripe (via emergentintegrations)
- **Maps**: Google Maps API
- **Navigation**: Expo Router (file-based routing)

### Project Structure

```
canupls/
├── frontend/                  # React Native Expo App
│   ├── app/                  # File-based routing
│   │   ├── (auth)/          # Authentication screens
│   │   │   ├── welcome.tsx
│   │   │   ├── login.tsx
│   │   │   └── signup.tsx
│   │   ├── (tabs)/          # Main app tabs
│   │   │   ├── home.tsx
│   │   │   ├── tasks.tsx
│   │   │   └── profile.tsx
│   │   ├── _layout.tsx      # Root layout
│   │   └── index.tsx        # Entry point
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx  # Authentication state
│   ├── lib/                 # Utilities
│   │   └── supabase.ts      # Supabase client
│   ├── constants/           # Theme & constants
│   │   └── theme.ts
│   └── assets/              # Images, fonts, etc.
│
├── backend/                 # FastAPI Server
│   ├── server.py           # Main API server
│   ├── supabase_setup.sql  # Database schema
│   └── .env                # Environment variables
│
└── README.md
```

## 🚀 Setup Instructions

### Prerequisites

- Node.js 18+ and Yarn
- Python 3.9+
- Supabase account
- Google Maps API key
- Stripe account (for payments)

### 1. Database Setup

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to SQL Editor
3. Run the schema from `/app/backend/supabase_setup.sql`
4. This will create:
   - `profiles` table (user data)
   - `tasks` table (task management)
   - `ratings` table (review system)
   - `payment_transactions` table (payment tracking)
   - Row-Level Security policies
   - Storage bucket for receipts

### 2. Environment Variables

All environment variables are already configured in `.env` files:

#### Backend (`/app/backend/.env`)
```env
SUPABASE_URL=https://twblkwfdmktajlpugsmx.supabase.co
SUPABASE_ANON_KEY=[your-key]
STRIPE_API_KEY=sk_test_emergent
GOOGLE_MAPS_API_KEY=[your-key]
```

#### Frontend (`/app/frontend/.env`)
```env
EXPO_PUBLIC_SUPABASE_URL=https://twblkwfdmktajlpugsmx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[your-key]
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=[your-key]
```

### 3. Installation

#### Backend
```bash
cd /app/backend
pip install -r requirements.txt
python server.py
```

#### Frontend
```bash
cd /app/frontend
yarn install
yarn start
```

### 4. Running the App

The app is already running at:
- **Backend API**: http://localhost:8001
- **Frontend**: https://canupls-marketplace.preview.emergentagent.com
- **API Docs**: http://localhost:8001/docs

## 🎨 Design System

### Brand Colors
- **Primary (Trust Blue)**: #0047AB
- **Background**: #F8F9FA
- **Success**: #10B981
- **Warning**: #F59E0B
- **Error**: #EF4444

### Typography
- **Font Family**: Poppins
- **Weights**: Regular (400), Medium (500), SemiBold (600), Bold (700)

### Spacing
- Uses 8pt grid system (8px, 16px, 24px, 32px, 48px)

## 📊 Database Schema

### Profiles
```sql
- id (UUID, references auth.users)
- user_role (enum: 'requester', 'helper')
- full_name (text)
- phone (text)
- avatar_url (text)
- rating (decimal)
- completed_tasks (integer)
- is_available (boolean)
- location_lat, location_lng (decimal)
```

### Tasks
```sql
- id (UUID)
- requester_id, helper_id (UUID)
- title, description (text)
- category (enum)
- status (enum: 'open', 'accepted', 'in_progress', 'completed', 'cancelled')
- location_lat, location_lng, location_address
- price (decimal)
- receipt_url (text)
- timestamps
```

### Ratings
```sql
- id (UUID)
- task_id, from_user_id, to_user_id (UUID)
- rating (integer, 1-5)
- comment (text)
```

## 🔒 Security Features

### Row-Level Security (RLS)

All tables have RLS enabled with policies:

- **Profiles**: Users can only read/update their own profile
- **Tasks**: 
  - Requesters can create and view their own tasks
  - Helpers can view open tasks and their accepted tasks
- **Ratings**: Users can rate completed tasks they're involved in
- **Payments**: Users can only view their own transactions

### Storage Policies

- Users can upload receipts for their tasks
- Users can view receipts for tasks they're involved in

## 🔌 API Endpoints

### Health Check
```
GET /api/health
```

### Configuration
```
GET /api/config
```

### Payments
```
POST /api/payments/checkout
GET /api/payments/status/{session_id}
POST /api/webhook/stripe
```

### Tasks (To be implemented)
```
GET /api/tasks/nearby
POST /api/tasks
PUT /api/tasks/{id}
```

## 📱 Mobile Features

### Permissions Required

#### iOS
- Location (when in use and always)
- Camera
- Photo library access

#### Android
- ACCESS_COARSE_LOCATION
- ACCESS_FINE_LOCATION
- CAMERA
- READ/WRITE_EXTERNAL_STORAGE

### Navigation Structure

The app uses bottom tab navigation:
- **Home**: Dashboard with quick actions
- **My Tasks**: Task management (requester view) / Available tasks (helper view)
- **Profile**: User profile and settings

## 🧪 Testing

### Backend Testing
```bash
curl http://localhost:8001/api/health
```

### Frontend Testing
- Open the Expo preview URL
- Test authentication flow
- Verify navigation between screens
- Test role selection during signup

## 🎯 User Flows

### For Requesters
1. Sign up → Select "Request Help" role
2. Browse home dashboard
3. Post a new task (coming soon)
4. Track task status
5. Rate helper after completion

### For Helpers
1. Sign up → Select "Offer Help" role
2. Browse available tasks nearby
3. Accept task
4. Complete task with real-time tracking
5. Get rated by requester

## 🚧 Next Steps

### Phase 2: Core Task Features (Next)
- [ ] Task posting form
- [ ] Browse open tasks
- [ ] Task acceptance flow
- [ ] Status updates

### Phase 3: Maps & Tracking
- [ ] Google Maps integration
- [ ] Location permissions
- [ ] Real-time task tracking
- [ ] Nearby helper matching

### Phase 4: Payments & Ratings
- [ ] Complete Stripe integration
- [ ] Payment flow
- [ ] Rating submission
- [ ] Review system

## 📄 License

Proprietary - All rights reserved to Canupls

## 👨‍💻 Development

Built with ❤️ for the Canupls team

---

**Note**: This is Phase 1 (MVP Foundation) with authentication, database setup, and core infrastructure complete. Task management, maps, and payment features are ready for implementation in the next phases.
