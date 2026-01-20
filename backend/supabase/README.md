# LSDRAS Supabase Backend Setup Guide

## Prerequisites

Before you begin, you need a **Supabase account** (free tier works perfectly).

---

## Step 1: Create Your Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create a free account
3. Click **"New Project"**
4. Fill in:
   - **Name**: Lelani School System (or any name you prefer)
   - **Database Password**: Choose a strong password and save it securely
   - **Region**: Select the closest region to your school
5. Click **"Create new project"**
6. Wait 2-3 minutes for the project to initialize

---

## Step 2: Get Your API Keys and URL

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **API** in the left menu
3. You'll see:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: Long string starting with `eyJ...` (for frontend)
   - **service_role key**: Another long string (for backend/admin tasks - KEEP SECRET)

**Save these values** - you'll need them for your Next.js app later.

---

## Step 3: Run the Database Schema

Now create all the tables, security policies, and structure:

1. In your Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open `schema.sql` from this folder on your computer
4. Copy **all the SQL code** from `schema.sql`
5. Paste it into the Supabase SQL Editor
6. Click **RUN** (or press Ctrl+Enter)
7. You should see: ✅ **Success. No rows returned**

This creates:

- `profiles` (user roles)
- `classes` (grades and streams)
- `teacher_classes` (who teaches what)
- `daily_reports` (the core reporting data)
- `head_comments` (feedback from headteacher)
- All security policies (RLS)

---

## Step 4: Configure Authentication

1. In your Supabase dashboard, go to **Authentication** (left sidebar)
2. Click **Providers**
3. Enable **Email** provider (should be on by default)
4. Go to **URL Configuration**:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add `http://localhost:3000/**`
5. Click **Save**

---

## Step 5: Create Your First Admin User

### Option A: Via Supabase Dashboard (Recommended)

1. Go to **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter:
   - **Email**: Your email (e.g., `admin@lelani.school`)
   - **Password**: Create a strong password
   - **Auto Confirm User**: ✅ Check this box
4. Click **"Create user"**
5. **Copy the user ID** (it looks like `a1b2c3d4-...`)

### Option B: Via Sign-up Flow (After frontend is built)

You can also sign up through your app's login page once it's ready.

---

## Step 6: Link Your Admin User to the Profiles Table

Your user now exists in `auth.users`, but you need to add them to the `profiles` table with the `admin` role.

1. Stay in **SQL Editor**
2. Create a new query
3. Run this SQL (replace `YOUR_USER_ID` with the ID you copied):

```sql
insert into profiles (id, full_name, role)
values (
  'YOUR_USER_ID',  -- Replace with actual UUID from step 5
  'School Administrator',
  'admin'
);
```

4. Click **RUN**
5. You should see: ✅ **Success. 1 row(s) affected**

---

## Step 7: Add Sample Classes

Add some grades and streams that exist at Lelani School:

```sql
insert into classes (grade, stream) values
  ('Grade 1', 'Tulip'),
  ('Grade 1', 'Orchid'),
  ('Grade 1', 'Lotus'),
  ('Grade 2', 'Tulip'),
  ('Grade 2', 'Orchid'),
  ('Grade 3', 'Tulip'),
  ('Grade 3', 'Orchid'),
  ('Grade 4', 'Tulip'),
  ('Grade 5', 'Tulip');
```

Run this in SQL Editor.

---

## Step 8: Create Sample Teachers (Optional for Testing)

Create a few teacher users to test the system:

### Create teacher users in Authentication

1. Go to **Authentication** → **Users** → **Add user**
2. Create users like:
   - Email: `teacher1@lelani.school`, Password: `Test1234!`, Auto-confirm: ✅
   - Email: `teacher2@lelani.school`, Password: `Test1234!`, Auto-confirm: ✅

### Add them to profiles table

```sql
-- Replace these UUIDs with actual user IDs
insert into profiles (id, full_name, role) values
  ('teacher1-uuid-here', 'Jane Doe', 'teacher'),
  ('teacher2-uuid-here', 'John Smith', 'teacher');
```

### Assign teachers to classes

```sql
-- Get class IDs first
select id, grade, stream from classes;

-- Then assign (replace UUIDs with actual values)
insert into teacher_classes (teacher_id, class_id) values
  ('teacher1-uuid', 'grade1-tulip-class-id'),
  ('teacher2-uuid', 'grade2-orchid-class-id');
```

---

## Step 9: Test Row Level Security

Verify that security policies are working correctly:

### Test 1: Admin can see all profiles

```sql
-- This should return all profiles (run as admin)
select * from profiles;
```

### Test 2: Teacher can only see their assigned classes

To test this properly, you'd need to:

1. Use Supabase's "Auth" context switcher in SQL Editor, OR
2. Build the frontend and log in as a teacher
3. They should only see their own reports and classes

---

## Step 10: Verify Your Setup

Run these queries to confirm everything is ready:

```sql
-- Check profiles
select id, full_name, role from profiles;

-- Check classes
select id, grade, stream from classes;

-- Check teacher assignments
select
  p.full_name as teacher,
  c.grade,
  c.stream
from teacher_classes tc
join profiles p on p.id = tc.teacher_id
join classes c on c.id = tc.class_id;
```

You should see your admin, classes, and any teacher assignments you created.

---

## Next Steps

✅ **Backend is ready!** You can now:

1. Create your **Next.js frontend** project
2. Install **Supabase client library**: `npm install @supabase/supabase-js`
3. Create environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Build the login page, teacher dashboard, and daily report forms
5. Connect them to these tables using Supabase client

---

## Common Issues

### Issue: "Permission denied for table profiles"

**Solution**: Make sure RLS policies were created. Re-run the schema.sql file.

### Issue: "Cannot insert into profiles"

**Solution**: The user ID must match an existing user in `auth.users`. Create the user in Authentication first.

### Issue: "Unique constraint violation on (grade, stream)"

**Solution**: You're trying to add a duplicate class. Each grade+stream combination must be unique.

---

## Files in This Folder

- **schema.sql**: Complete database schema with tables, RLS, and policies
- **README.md**: This setup guide
