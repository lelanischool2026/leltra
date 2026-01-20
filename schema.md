# Database Schema and RLS Policies

## Lelani School Daily Reporting and Analytics System (LSDRAS)

---

## 1. Design Principles

- Security first (school data)
- Role-based access
- Teacher sees only own class
- Director sees analytics, not raw edits
- Free-tier friendly
- Modular and extensible

---

## 2. Core Tables Overview

```
auth.users        -> Supabase Auth (system)
profiles          -> User metadata and roles
classes           -> Grades and streams
teacher_classes   -> Teacher <-> class mapping
daily_reports     -> Core daily reporting data
head_comments     -> Headteacher feedback
```

---

## 3. Profiles Table (User Metadata)

Supabase manages authentication; extend with a `profiles` table.

### Table: `profiles`

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('teacher', 'headteacher', 'director', 'admin')),
  created_at timestamp with time zone default now()
);
```

### Purpose

- Stores user role
- Links securely to Supabase Auth
- Central for RLS checks

---

## 4. Classes Table

### Table: `classes`

```sql
create table classes (
  id uuid primary key default gen_random_uuid(),
  grade text not null,
  stream text not null,
  active boolean default true,
  created_at timestamp with time zone default now(),
  unique (grade, stream)
);
```

### Example Records

| grade   | stream |
| ------- | ------ |
| Grade 1 | Tulip  |
| Grade 2 | Orchid |
| Grade 5 | Tulip  |

---

## 5. Teacher-Class Assignment Table

### Table: `teacher_classes`

```sql
create table teacher_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (teacher_id, class_id)
);
```

### Purpose

- Defines ownership
- Enforces that a teacher can only submit for their class

---

## 6. Daily Reports Table (Core Module)

### Table: `daily_reports`

```sql
create table daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  class_id uuid references classes(id) on delete cascade,
  teacher_id uuid references profiles(id) on delete cascade,

  total_learners integer not null,
  present_learners integer not null,
  absentees text,

  health_incident boolean default false,
  health_details text,

  feeding_status text,
  lessons_covered boolean default true,
  literacy_topic text,

  discipline_issue boolean default false,
  discipline_details text,

  parent_communication boolean default false,
  parent_details text,

  challenges text,

  created_at timestamp with time zone default now(),

  unique (report_date, class_id)
);
```

### Notes

- Prevents duplicate daily reports
- Structured for analytics
- Avoids sensitive learner data

---

## 7. Headteacher Comments Table

### Table: `head_comments`

```sql
create table head_comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references daily_reports(id) on delete cascade,
  headteacher_id uuid references profiles(id),
  comment text not null,
  created_at timestamp with time zone default now()
);
```

### Purpose

- Accountability
- Follow-ups
- Audit trail

---

## 8. Enable Row Level Security (RLS)

```sql
alter table profiles enable row level security;
alter table classes enable row level security;
alter table teacher_classes enable row level security;
alter table daily_reports enable row level security;
alter table head_comments enable row level security;
```

---

## 9. RLS Policies (Most Important Part)

### Profiles Policies

**Users can read their own profile**

```sql
create policy "Users can read own profile"
on profiles for select
using (auth.uid() = id);
```

**Admin can read all profiles**

```sql
create policy "Admin can read all profiles"
on profiles for select
using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
```

---

### Classes Policies

**Everyone can read classes**

```sql
create policy "Read classes"
on classes for select
using (true);
```

**Only admin can modify classes**

```sql
create policy "Admin manages classes"
on classes for all
using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  )
);
```

---

### Teacher-Class Assignment Policies

**Teacher can read their assignments**

```sql
create policy "Teacher reads own class"
on teacher_classes for select
using (teacher_id = auth.uid());
```

**Admin manages assignments**

```sql
create policy "Admin manages teacher_classes"
on teacher_classes for all
using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  )
);
```

---

### Daily Reports Policies

**Teacher can insert reports for their class only**

```sql
create policy "Teacher inserts own class report"
on daily_reports for insert
with check (
  teacher_id = auth.uid()
  and exists (
    select 1 from teacher_classes tc
    where tc.teacher_id = auth.uid()
    and tc.class_id = daily_reports.class_id
  )
);
```

**Teacher can read own reports**

```sql
create policy "Teacher reads own reports"
on daily_reports for select
using (teacher_id = auth.uid());
```

**Headteacher can read all reports**

```sql
create policy "Headteacher reads all reports"
on daily_reports for select
using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'headteacher'
  )
);
```

**Director can read all reports (read-only)**

```sql
create policy "Director reads reports"
on daily_reports for select
using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'director'
  )
);
```

---

### Headteacher Comments Policies

**Headteacher can insert comments**

```sql
create policy "Headteacher comments"
on head_comments for insert
with check (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'headteacher'
  )
);
```

**Teachers can read comments on their reports**

```sql
create policy "Teacher reads comments"
on head_comments for select
using (
  exists (
    select 1 from daily_reports dr
    where dr.id = head_comments.report_id
    and dr.teacher_id = auth.uid()
  )
);
```

---

## 10. What This Guarantees

- Teachers cannot see other classes
- Directors cannot edit data
- Reports cannot be duplicated
- School leadership gets trusted analytics
- System is audit-ready

---
