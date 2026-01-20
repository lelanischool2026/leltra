# LSDRAS - Lelani School Daily Reporting & Analytics System

A comprehensive daily reporting and analytics system for Lelani School built with Next.js and Supabase.

## Project Overview

LSDRAS digitizes and standardizes daily class reporting, reduces teacher workload, and provides real-time visibility and data-driven insights to school administration.

## Features

- **Role-based Authentication** (Teacher, Headteacher, Director, Admin)
- **Daily Class Reporting** with attendance, health, discipline tracking
- **Secure Database** with Row Level Security (RLS)
- **Modern UI** with Tailwind CSS (Black/Red color scheme)
- **Real-time Data** with Supabase

## Repository Structure

```
leltra/
├── backend/
│   └── supabase/
│       ├── schema.sql          # Database schema and RLS policies
│       └── README.md           # Backend setup guide
├── frontend/
│   ├── app/                    # Next.js app directory
│   ├── lib/                    # Utilities and types
│   ├── package.json
│   └── README.md               # Frontend setup guide
├── prd.md                      # Product Requirements Document
├── schema.md                   # Database schema documentation
└── README.md                   # This file
```

## Quick Start

### 1. Backend Setup (Supabase)

Follow the detailed guide in [backend/supabase/README.md](backend/supabase/README.md)

**Quick steps:**
- Create Supabase project
- Run `backend/supabase/schema.sql` in SQL Editor
- Create admin user and add to profiles table
- Add classes

### 2. Frontend Setup (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000 and login with your Supabase credentials.

See [frontend/README.md](frontend/README.md) for details.

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Hosting**: Vercel (frontend), Supabase (backend)

## Documentation

- [PRD - Product Requirements](prd.md)
- [Database Schema](schema.md)
- [Backend Setup Guide](backend/supabase/README.md)
- [Frontend Setup Guide](frontend/README.md)

## Current Status

✅ **Phase 1 - MVP Complete**
- Authentication system
- Teacher dashboard
- Daily reporting module
- Database with RLS

🚧 **In Progress**
- Headteacher dashboard
- Director analytics
- Admin panel

## Contributing

This is a private school management system. Contact the school administration for access.

## License

Proprietary - Lelani School

---

**Built with ❤️ by Lelani School ICT Department**
