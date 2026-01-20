# Product Requirements Document (PRD)

## Lelani School Daily Reporting & Analytics System (LSDRAS)

---

## 1. Project Overview

### 1.1 Project Name

**Lelani School Daily Reporting & Analytics System (LSDRAS)**

### 1.2 Organization

**Lelani School**

### 1.3 Project Owner

School Administration (Director and Headteacher)

### 1.4 System Lead

ICT / Coding and Robotics Department

---

## 2. Problem Statement

Teachers currently write manual daily class reports from Monday to Friday. These reports:

- Use different formats
- Are time-consuming to write
- Are tedious for the Headteacher and Director to review daily
- Do not provide analytics, trends, or insights
- Make it difficult to track attendance, discipline, safety, and academic patterns over time

The school needs a centralized, automated, and data-driven system that simplifies reporting while improving decision-making.

---

## 3. Objectives and Goals

### 3.1 Primary Objectives

- Digitize daily class reporting
- Standardize reporting across all grades
- Reduce teacher workload
- Provide real-time visibility to administration
- Enable data-driven school management

### 3.2 Success Metrics

- 100% daily report submission rate
- Reduction in report review time by at least 60%
- Clear visibility of attendance, safety, and discipline trends
- Positive feedback from teachers and administration

---

## 4. User Roles and Permissions

### 4.1 User Roles

1. Teacher
2. Headteacher
3. Director
4. System Admin (ICT)

### 4.2 Role Capabilities

| Role        | Capabilities                                  |
| ----------- | --------------------------------------------- |
| Teacher     | Submit daily reports, view own report history |
| Headteacher | View all reports, comment, flag issues        |
| Director    | View analytics, trends, summaries             |
| Admin       | Manage users, classes, roles, system settings |

---

## 5. System Architecture Overview

### 5.1 High-Level Architecture

```
Frontend (Next.js on Vercel)
        |
        | Supabase Auth and API
        |
Backend (Supabase PostgreSQL + RLS)
        |
Analytics and Dashboards
```

---

## 6. Technology Stack

### 6.1 Frontend

- Framework: Next.js (App Router)
- Styling: Tailwind CSS
- UI Components: Shadcn/UI
- Hosting: Vercel (Free Tier)

### 6.2 Backend

- Authentication: Supabase Auth
- Database: Supabase PostgreSQL (Free Tier)
- Security: Row Level Security (RLS)
- APIs: Supabase client SDK

---

## 7. System Modules (Modular Design)

### Module 1: Authentication and User Management

**Description**: Handles secure login, role assignment, and access control.

**Features**

- Email and password authentication
- Role-based access control
- Admin-managed user creation
- Secure session handling

**Users**: All users

---

### Module 2: Class and Teacher Assignment

**Description**: Defines school structure and class ownership.

**Features**

- Create grades and streams
- Assign teachers to classes
- Prevent teachers from accessing unassigned classes

**Users**: Admin

---

### Module 3: Daily Reporting Module

**Description**: Core module where teachers submit daily class reports.

**Report Fields**

- Date (auto-filled)
- Grade and Stream
- Total learners
- Learners present
- Absentees (names)
- Health and Safety incident (Yes/No + details)
- Feeding status
- Lessons covered (Yes/No)
- Literacy topic
- Discipline issues (Yes/No + details)
- Parent communication (Yes/No + details)
- Challenges or support required

**Users**: Teachers

---

### Module 4: Attendance Tracking Module

**Description**: Tracks and analyzes daily attendance.

**Features**

- Daily attendance records
- Attendance percentage calculation
- Frequent absentee detection
- Class and grade-level trends

**Users**: Headteacher, Director

---

### Module 5: Health, Safety, and Discipline Module

**Description**: Captures and flags critical incidents.

**Features**

- Incident logging
- Severity tagging
- Alerts for serious incidents
- Historical incident records

**Users**: Teachers, Headteacher

---

### Module 6: Communication and Welfare Module

**Description**: Tracks feeding concerns and parent communication.

**Features**

- Feeding status monitoring
- Parent communication logs
- Welfare trend analysis

**Users**: Headteacher, Director

---

### Module 7: Analytics and Dashboard Module

**Description**: Provides insights and summaries through visual dashboards.

**Dashboards**

- Teacher dashboard (submission status)
- Headteacher dashboard (daily oversight)
- Director dashboard (strategic analytics)

**Metrics**

- Attendance trends
- Report submission compliance
- Incident frequency
- Support needs by grade
- Weekly and monthly summaries

---

### Module 8: Reporting and Export Module

**Description**: Allows exporting of reports and summaries.

**Features**

- PDF export
- CSV or Excel export
- Weekly and monthly summaries

**Users**: Headteacher, Director

---

## 8. Frontend Structure (Modular)

```
/app
 ├─ /auth
 │   └─ login
 ├─ /dashboard
 │   ├─ teacher
 │   ├─ headteacher
 │   ├─ director
 ├─ /reports
 │   ├─ new
 │   ├─ history
 ├─ /admin
 │   ├─ users
 │   ├─ classes
 │   ├─ settings
 ├─ /components
 ├─ /lib
 └─ /styles
```

---

## 9. Backend Structure (Logical)

### Core Tables

- users
- classes
- teacher_classes
- daily_reports
- incidents
- comments

### Security

- Row Level Security enforced on all tables
- Role-based policies for read and write access

---

## 10. UI and UX Design Guidelines

### Color Theme

- Primary: Black or Charcoal
- Accent: Red
- Background: White
- Neutral: Gray tones

### Design Principles

- Clean and minimal
- Red used for actions and alerts only
- Mobile-friendly forms
- Accessibility-focused (readability first)

---

## 11. Deployment Strategy

### Hosting

- Frontend: Vercel
- Backend: Supabase

### Environment

- Development
- Production

---

## 12. Rollout Plan

### Phase 1: MVP

- Authentication
- Daily reporting
- Teacher dashboard
- Admin setup

### Phase 2: Oversight

- Headteacher dashboard
- Incident alerts
- Attendance analytics

### Phase 3: Strategy

- Director dashboard
- Exportable reports
- Monthly summaries

---

## 13. Future Enhancements

- Student profiles
- Academic performance tracking
- Library integration
- ICT and Robotics progress tracking
- Mobile app (optional)

---

## 14. Risks and Mitigation

| Risk                 | Mitigation                     |
| -------------------- | ------------------------------ |
| Low adoption         | Teacher training and simple UI |
| Data misuse          | RLS and role-based access      |
| Free tier limits     | Lean data design               |
| Resistance to change | Gradual rollout                |

---

## 15. Conclusion

The Lelani School Daily Reporting and Analytics System will modernize school operations, reduce workload, and enable leadership to make informed decisions through real-time data. The system is scalable, secure, cost-effective, and aligned with the school’s long-term digital transformation goals.

---

**End of PRD**
