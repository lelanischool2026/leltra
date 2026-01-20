# LSDRAS Frontend

## Lelani School Daily Reporting & Analytics System

### Setup Instructions

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Environment Configuration**
   - Copy `.env.local.example` to `.env.local`
   - Your Supabase credentials are already configured in `.env.local`

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

4. **Login Credentials**
   - Use your Supabase email and password
   - System will redirect based on your role

### Project Structure

```
frontend/
├── app/
│   ├── auth/
│   │   └── login/          # Login page
│   ├── dashboard/
│   │   ├── teacher/        # Teacher dashboard
│   │   ├── headteacher/    # (To be built)
│   │   └── director/       # (To be built)
│   ├── reports/
│   │   └── new/            # Daily report form
│   ├── admin/              # (To be built)
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home (redirects to login)
├── lib/
│   ├── supabase.ts         # Supabase client
│   └── types.ts            # TypeScript types
└── components/             # Reusable components (to be added)
```

### Completed Features

✅ **Authentication**
- Login page with email/password
- Role-based redirect
- Session management

✅ **Teacher Dashboard**
- View assigned class
- See recent reports
- Submit new daily reports

✅ **Daily Reporting**
- Complete form with all fields from PRD
- Attendance tracking
- Health, discipline, parent communication
- Challenges and support needs

### Next Steps

1. Build Headteacher dashboard (view all reports, add comments)
2. Build Director dashboard (analytics and trends)
3. Build Admin panel (manage users, classes, assignments)
4. Add report history and detail views
5. Add data visualization (charts for attendance trends)
6. Add export functionality (PDF/CSV)

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Hosting**: Vercel (ready to deploy)

### Color Scheme

- Primary: Black/Charcoal (#1a1a1a)
- Accent: Red (#dc2626)
- Background: White
- Neutral: Gray tones

---

**Status**: MVP Phase 1 Complete ✅
