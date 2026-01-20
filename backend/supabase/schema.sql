-- LSDRAS Supabase schema and RLS policies
-- Run in Supabase SQL editor or psql. Assumes pgcrypto is available for gen_random_uuid().

-- Enable pgcrypto for UUID generation
create extension if not exists "pgcrypto";

-- Profiles: user metadata and role
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('teacher', 'headteacher', 'director', 'admin')),
  created_at timestamp with time zone default now()
);

-- Classes: grade and stream catalog
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  grade text not null,
  stream text not null,
  active boolean default true,
  created_at timestamp with time zone default now(),
  unique (grade, stream)
);

-- Teacher to class assignments
create table if not exists teacher_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (teacher_id, class_id)
);

-- Daily reports
create table if not exists daily_reports (
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

-- Headteacher comments on reports
create table if not exists head_comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references daily_reports(id) on delete cascade,
  headteacher_id uuid references profiles(id),
  comment text not null,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table classes enable row level security;
alter table teacher_classes enable row level security;
alter table daily_reports enable row level security;
alter table head_comments enable row level security;

-- Create a security definer function to check admin status (bypasses RLS)
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select role = 'admin' from profiles where id = auth.uid()),
    false
  );
$$;

-- Create a function to get user role (bypasses RLS)
create or replace function get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- Profiles policies
drop policy if exists "Users can read own profile" on profiles;
drop policy if exists "Admin can read all profiles" on profiles;
drop policy if exists "Authenticated users can read all profiles" on profiles;
drop policy if exists "Admin can manage profiles" on profiles;
drop policy if exists "Users can insert own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;

-- Allow authenticated users to read all profiles
create policy "Authenticated users can read all profiles"
  on profiles for select
  using (auth.role() = 'authenticated');

-- Allow users to insert their own profile
create policy "Users can insert own profile"
  on profiles for insert
  with check (id = auth.uid());

-- Allow users to update their own profile OR admin can update any
create policy "Users can update own profile"
  on profiles for update
  using (id = auth.uid() or is_admin());

-- Admin can delete profiles
create policy "Admin can delete profiles"
  on profiles for delete
  using (is_admin());

-- Classes policies
drop policy if exists "Read classes" on classes;
create policy "Read classes"
  on classes for select
  using (true);

drop policy if exists "Admin manages classes" on classes;
create policy "Admin manages classes"
  on classes for all
  using (is_admin());

-- Teacher-class assignment policies
drop policy if exists "Teacher reads own class" on teacher_classes;
create policy "Teacher reads own class"
  on teacher_classes for select
  using (teacher_id = auth.uid());

drop policy if exists "Admin manages teacher_classes" on teacher_classes;
create policy "Admin manages teacher_classes"
  on teacher_classes for all
  using (is_admin());

-- Daily reports policies
drop policy if exists "Teacher inserts own class report" on daily_reports;
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

drop policy if exists "Teacher reads own reports" on daily_reports;
create policy "Teacher reads own reports"
  on daily_reports for select
  using (teacher_id = auth.uid());

drop policy if exists "Headteacher reads all reports" on daily_reports;
create policy "Headteacher reads all reports"
  on daily_reports for select
  using (get_my_role() = 'headteacher');

drop policy if exists "Director reads reports" on daily_reports;
create policy "Director reads reports"
  on daily_reports for select
  using (get_my_role() = 'director');

-- Admin reads all reports
drop policy if exists "Admin reads all reports" on daily_reports;
create policy "Admin reads all reports"
  on daily_reports for select
  using (is_admin());

-- Teacher can update own reports
drop policy if exists "Teacher updates own reports" on daily_reports;
create policy "Teacher updates own reports"
  on daily_reports for update
  using (teacher_id = auth.uid());

-- Headteacher comments policies
drop policy if exists "Headteacher comments" on head_comments;
create policy "Headteacher comments"
  on head_comments for insert
  with check (get_my_role() in ('headteacher', 'admin'));

drop policy if exists "Teacher reads comments" on head_comments;
create policy "Teacher reads comments"
  on head_comments for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = head_comments.report_id
      and dr.teacher_id = auth.uid()
    )
  );

drop policy if exists "Headteacher reads all comments" on head_comments;
create policy "Headteacher reads all comments"
  on head_comments for select
  using (get_my_role() in ('headteacher', 'director', 'admin'));

-- Optional helper index for faster comment lookups by report
create index if not exists idx_head_comments_report on head_comments(report_id);
