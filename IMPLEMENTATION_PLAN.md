# Water Utility Operations Calendar - Implementation Plan

## Overview
A task management system for tracking recurring operational tasks and compliance deadlines for a water utility company. Hosted on Cloudflare with minimal cost.

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React 18 + Vite + TypeScript | User preference, fast builds, modern DX |
| Styling | Tailwind CSS | Rapid responsive UI development |
| State | TanStack Query + Zustand | Server state caching + simple local state |
| Backend | Cloudflare Workers (Pages Functions) | Serverless, auto-scaling, free tier |
| Database | Cloudflare D1 (SQLite) | 5GB free, perfect for small team |
| Auth | Session-based with Argon2 | Simple, secure, stored in D1 |
| Excel | SheetJS (xlsx) | Client-side Excel parsing |

## Project Structure

```
ops_calendar_v2/
├── src/
│   ├── components/
│   │   ├── calendar/
│   │   │   ├── DailyView.tsx
│   │   │   ├── WeeklyView.tsx
│   │   │   ├── MonthlyView.tsx
│   │   │   └── YearlyView.tsx
│   │   ├── tasks/
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskItem.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   └── TaskStatusBadge.tsx
│   │   ├── import/
│   │   │   └── ExcelImporter.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── UserManagement.tsx
│   │   └── ui/
│   │       └── (shared components)
│   ├── hooks/
│   │   ├── useTasks.ts
│   │   ├── useAuth.ts
│   │   └── useCalendar.ts
│   ├── lib/
│   │   ├── recurrence.ts      # Recurrence pattern engine
│   │   ├── api.ts             # API client
│   │   └── excel.ts           # Excel import/export
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Calendar.tsx
│   │   ├── Tasks.tsx
│   │   ├── Import.tsx
│   │   ├── Settings.tsx
│   │   └── Login.tsx
│   ├── App.tsx
│   └── main.tsx
├── functions/                  # Cloudflare Pages Functions (API)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.ts
│   │   │   ├── logout.ts
│   │   │   └── me.ts
│   │   ├── tasks/
│   │   │   ├── index.ts       # GET all, POST create
│   │   │   └── [id].ts        # GET, PUT, DELETE by id
│   │   ├── instances/
│   │   │   ├── index.ts       # GET instances by date range
│   │   │   └── [id].ts        # PUT update status
│   │   ├── categories/
│   │   │   └── index.ts
│   │   ├── users/
│   │   │   └── index.ts       # User management (admin only)
│   │   └── import/
│   │       └── generate.ts    # Generate instances from definitions
│   └── _middleware.ts          # Auth middleware
├── db/
│   └── schema.sql              # D1 database schema
├── public/
├── index.html
├── vite.config.ts
├── wrangler.toml               # Cloudflare config
├── tailwind.config.js
└── package.json
```

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0
);

-- Task definitions (templates)
CREATE TABLE task_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT,
  recurrence_type TEXT NOT NULL,
  recurrence_config TEXT,  -- JSON for pattern-specific config
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Task instances (scheduled occurrences)
CREATE TABLE task_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_definition_id INTEGER NOT NULL REFERENCES task_definitions(id),
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  completed_at DATETIME,
  completed_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_definition_id, scheduled_date)
);

-- Indexes
CREATE INDEX idx_instances_date ON task_instances(scheduled_date);
CREATE INDEX idx_instances_status ON task_instances(status);
CREATE INDEX idx_definitions_category ON task_definitions(category_id);
```

## Recurrence Pattern Engine

The system must handle these patterns (from the Excel data):

| Pattern | Example | Config Structure |
|---------|---------|------------------|
| Daily | "Daily" | `{ type: "daily", weekdaysOnly: false }` |
| Daily (Weekdays) | "Daily (weekdays)" | `{ type: "daily", weekdaysOnly: true }` |
| Weekly | "Weekly" | `{ type: "weekly", dayOfWeek: 1 }` |
| Monthly | "Monthly" | `{ type: "monthly", dayOfMonth: 1 }` |
| Monthly (Nth Day) | "10th of Month" | `{ type: "monthly", dayOfMonth: 10 }` |
| Bi-Monthly | "Bi-Monthly" (even) | `{ type: "bimonthly", monthParity: "even", dayOfMonth: 1 }` |
| Quarterly | "Quarterly" | `{ type: "quarterly", monthsOfQuarter: [1], dayOfMonth: 1 }` |
| Yearly | "January", "May" | `{ type: "yearly", month: 1, dayOfMonth: 1 }` |
| Yearly (Specific Date) | "January 11", "October 27" | `{ type: "yearly", month: 1, dayOfMonth: 11 }` |
| Nth Weekday | "Second Tuesday" | `{ type: "nthWeekday", n: 2, dayOfWeek: 2 }` |
| Multi-Month | "Jan-Mar", "Oct/Nov" | `{ type: "multiMonth", months: [1,2,3] }` |
| Multi-Year | "Every 3 years" | `{ type: "multiYear", interval: 3, baseYear: 2022, month: 1 }` |
| One-Time | "May 2025", "June 2026" | `{ type: "oneTime", date: "2025-05-01" }` |
| As Needed | "As Needed" | `{ type: "asNeeded" }` |
| As Occurs | "As Occurs" | `{ type: "asOccurs" }` |

### Instance Generation Logic

```typescript
// lib/recurrence.ts - Core algorithm
interface RecurrenceConfig {
  type: string;
  [key: string]: any;
}

function generateInstances(
  definition: TaskDefinition,
  startDate: Date,
  endDate: Date
): Date[] {
  const config = definition.recurrence_config;
  const dates: Date[] = [];

  switch (config.type) {
    case 'daily':
      // Generate for each day, filter weekends if weekdaysOnly
      break;
    case 'weekly':
      // Generate for each week on specified day
      break;
    case 'monthly':
      // Generate for specified day each month
      break;
    // ... etc
  }

  return dates;
}
```

## UI Mockups

### Login Screen
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    ┌─────────────────────┐                  │
│                    │    OpsCalendar      │                  │
│                    │   Water Utility Co  │                  │
│                    └─────────────────────┘                  │
│                                                             │
│                    ┌─────────────────────┐                  │
│                    │ Username            │                  │
│                    └─────────────────────┘                  │
│                    ┌─────────────────────┐                  │
│                    │ ********            │                  │
│                    └─────────────────────┘                  │
│                    ┌─────────────────────┐                  │
│                    │      Sign In        │                  │
│                    └─────────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Main Layout (Sidebar + Content)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  OpsCalendar                                           John v  │ Settings   │
├─────────────┬────────────────────────────────────────────────────────────────┤
│             │                                                                │
│  > Today    │   [ Daily ] [ Weekly ] [ Monthly ] [ Yearly ]    Jan 11, 2026 │
│  > Calendar │  ─────────────────────────────────────────────────────────────│
│  > Tasks    │                                                                │
│  > Import   │   (Content area changes based on view selection)              │
│             │                                                                │
│  ─────────  │                                                                │
│  Categories │                                                                │
│  * Sampling │                                                                │
│  * Billing  │                                                                │
│  * Maint.   │                                                                │
│  * Renewals │                                                                │
│  * Reporting│                                                                │
│  * Admin    │                                                                │
│  * Planning │                                                                │
│  * Meetings │                                                                │
│             │                                                                │
├─────────────┴────────────────────────────────────────────────────────────────┤
│  Admin Panel (if admin)                                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Daily View (Today's Checklist)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Today: Saturday, January 11, 2026                    < Prev │ Today │ Next >│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [!] OVERDUE (2)                                                             │
│  |-- [ ] Chlorine Residual (Jan 10) ......................... Water Sampling│
│  '-- [ ] Recording Payments (Jan 10) ........................ Billing       │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  [BLUE] WATER SAMPLING                                                  v    │
│  |-- [ ] Chlorine Residual ............................... [ Add Note ][Skip]│
│  '-- [x] Monitoring Tank - completed 8:30am                                  │
│                                                                              │
│  [GREEN] BILLING                                                        v    │
│  |-- [ ] Recording Payments .............................. [ Add Note ][Skip]│
│  '-- [ ] Deposits/Banking ................................ [ Add Note ][Skip]│
│                                                                              │
│  [ORANGE] MAINTENANCE AND REPAIRS                                       v    │
│  |-- [ ] Locates ......................................... [ Add Note ][Skip]│
│  '-- [ ] Pump Stations/Daily Volume ...................... [ Add Note ][Skip]│
│                                                                              │
│  [PURPLE] GENERAL ADMINISTRATION                                        v    │
│  |-- [ ] Collect Mail .................................... [ Add Note ][Skip]│
│  '-- [ ] Email ........................................... [ Add Note ][Skip]│
│                                                                              │
│  [RED] RENEWALS                                                         v    │
│  '-- [ ] SAM Renewal (due today!) ........................ [ Add Note ][Skip]│
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  Progress: [========..............] 3/12 completed (25%)                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Weekly View (7-Day Grid)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Week of January 5-11, 2026                           < Prev │ Today │ Next >│
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬───────────┤
│   Mon 5  │  Tue 6   │  Wed 7   │  Thu 8   │  Fri 9   │  Sat 10  │  Sun 11   │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────────┤
│ Chlorine │ Chlorine │ Chlorine │ Chlorine │ Chlorine │ Chlorine │ Chlorine  │
│ Record   │ Record   │ Record   │ Record   │ Record   │ Record   │ Record    │
│ Deposits │ Deposits │ Deposits │ Deposits │ Deposits │ Deposits │ Deposits  │
│ Locates  │ Locates  │ Locates  │ Locates  │ Locates  │ Locates  │ Locates   │
│ Tank     │ Tank     │ Tank     │ Tank     │ Tank     │ Tank     │ Tank      │
│ Pumps    │ Pumps    │ Pumps    │ Pumps    │ Pumps    │ Pumps    │ Pumps     │
│ Mail     │ Mail     │ Mail     │ Mail     │ Mail     │ Mail     │ Mail      │
│ Email    │ Email    │ Email    │ Email    │ Email    │ Email    │ Email     │
│          │          │          │          │          │          │ SAM       │
│          │          │          │ System   │          │          │ Renewal   │
│          │          │          │ Rounds   │          │          │           │
│──────────│──────────│──────────│──────────│──────────│──────────│───────────│
│  8 tasks │  8 tasks │  8 tasks │  9 tasks │  8 tasks │  8 tasks │  9 tasks  │
│  Done: 8 │  Done: 8 │  Done: 8 │  Done: 9 │  Done: 6 │  Done: 0 │  Done: 0  │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴───────────┘
```

### Monthly View (Calendar Grid)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  <  January 2026  >                                                          │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬───────────┤
│   Sun    │   Mon    │   Tue    │   Wed    │   Thu    │   Fri    │   Sat     │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────────┤
│          │          │          │    1     │    2     │    3     │    4      │
│          │          │          │ ........ │ ........ │ ........ │ ........  │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────────┤
│    5     │    6     │    7     │    8     │    9     │   10     │  [11]     │
│ ........ │ ........ │ ........ │ .........│ ........ │ ........ │ ......... │
│          │          │          │          │          │          │ SAM DUE   │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────────┤
│   12     │   13     │   14     │   15     │   16     │   17     │   18      │
│ ........ │ .........│ ........ │ ........ │ ........ │ ........ │ ........  │
│          │ Board Mtg│          │          │          │          │           │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────────┤
│   19     │   20     │   21     │   22     │   23     │   24     │   25      │
│ ........ │ ........ │ ........ │ ........ │ ........ │ ........ │ ........  │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────────┤
│   26     │   27     │   28     │   29     │   30     │   31     │           │
│ ........ │ ........ │ ........ │ ........ │ ........ │ .........│           │
│          │          │          │          │          │ W2/W3    │           │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴───────────┘

Legend: . = daily task  [11] = today  Named items = special deadlines
```

### Yearly View (12-Month Overview)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  2026 Overview                                              < 2025 │ 2027 >  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  +- January --+  +- February -+  +-- March ---+  +-- April ---+             │
│  |11 SAM Renew|  |   Truck    |  | WETRC WOW  |  | CCR Members|             │
│  |31 W2/W3    |  |   Backflow |  | Climb Tank |  | Evaluations|             │
│  |   Board Mtg|  |            |  | WUE to DOH |  | Fire Exting|             │
│  | [======   ]|  | [======   ]|  | [======   ]|  | [======   ]|             │
│  +------------+  +------------+  +------------+  +------------+             │
│                                                                              │
│  +-- May -----+  +-- June ----+  +-- July ----+  +- August ---+             │
│  | DOH Permit |  | CCR State  |  | Lubricate  |  | Annual Mtg |             │
│  | Wage Incr. |  | Truck Tabs |  |   Pumps    |  |   Prep     |             │
│  | Tank Clean |  | Wix Domain |  | Clean HVAC |  | Sec. State |             │
│  | [======   ]|  | [======   ]|  | [======   ]|  | [======   ]|             │
│  +------------+  +------------+  +------------+  +------------+             │
│                                                                              │
│  +- September +  +- October --+  +- November -+  +- December -+             │
│  | DWSRF Mail |  | Annual Mtg |  | TTHM/HAA5  |  | Health Ins |             │
│  | Tank Valve |  | Insurance  |  | Cert Renew |  | Cradlepoint|             │
│  | Mtg Notices|  | Lead Inv.  |  | Truck Tabs |  | PO Box     |             │
│  | [======   ]|  | [======   ]|  | [======   ]|  | [======   ]|             │
│  +------------+  +------------+  +------------+  +------------+             │
│                                                                              │
│  [=====] = daily tasks baseline    Named items = key deadlines              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Task Import View
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Import Tasks from Excel                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │     ┌──────────────────────────────────────┐                          │ │
│  │     │                                      │                          │ │
│  │     │    Drop Excel file here              │                          │ │
│  │     │       or click to browse             │                          │ │
│  │     │                                      │                          │ │
│  │     └──────────────────────────────────────┘                          │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Preview (126 tasks found):                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Category              │ Task                        │ Recurrence       │ │
│  ├───────────────────────┼─────────────────────────────┼──────────────────┤ │
│  │ Water Sampling        │ Chlorine Residual           │ Daily            │ │
│  │ Water Sampling        │ Bactis                      │ Monthly          │ │
│  │ Billing               │ Recording Payments          │ Daily            │ │
│  │ Renewals              │ SAM Renewal                 │ Yearly (Jan 11)  │ │
│  │ Maintenance & Repairs │ System Rounds               │ Weekly           │ │
│  │ Planning              │ Board Meetings              │ 2nd Tuesday      │ │
│  │ ...                   │ ...                         │ ...              │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Generate instances for: [2026 v] to [2027 v]                               │
│                                                                              │
│  [ Cancel ]                                            [ Import 126 Tasks ] │
└──────────────────────────────────────────────────────────────────────────────┘
```

### User Management (Admin)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  User Management                                              [ + Add User ] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Username        │ Role      │ Created        │ Actions                 │ │
│  ├─────────────────┼───────────┼────────────────┼─────────────────────────┤ │
│  │ admin           │ Admin     │ Jan 1, 2026    │ [Edit] [Reset Password] │ │
│  │ john.smith      │ User      │ Jan 5, 2026    │ [Edit] [Reset] [Delete] │ │
│  │ mary.jones      │ User      │ Jan 8, 2026    │ [Edit] [Reset] [Delete] │ │
│  └─────────────────┴───────────┴────────────────┴─────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Mobile Responsive (Daily View)
```
┌─────────────────────────┐
│ =  OpsCalendar      @   │
├─────────────────────────┤
│ <  Jan 11, 2026  >      │
├─────────────────────────┤
│ [Day][Week][Month][Year]│
├─────────────────────────┤
│                         │
│ [!] OVERDUE (2)         │
│ ┌─────────────────────┐ │
│ │ [ ] Chlorine Resid. │ │
│ │   Jan 10 - Sampling │ │
│ └─────────────────────┘ │
│                         │
│ WATER SAMPLING          │
│ ┌─────────────────────┐ │
│ │ [ ] Chlorine Resid. │ │
│ │ [x] Monitoring Tank │ │
│ └─────────────────────┘ │
│                         │
│ BILLING                 │
│ ┌─────────────────────┐ │
│ │ [ ] Recording Paymts│ │
│ │ [ ] Deposits/Banking│ │
│ └─────────────────────┘ │
│                         │
│ RENEWALS                │
│ ┌─────────────────────┐ │
│ │ [ ] SAM Renewal [!] │ │
│ │   Due today!        │ │
│ └─────────────────────┘ │
│                         │
├─────────────────────────┤
│ Progress: [==    ] 3/12 │
└─────────────────────────┘
```

## Key Features Implementation

### 1. Calendar Views

**Daily View**
- Checklist format with checkboxes
- Group by category with collapsible sections
- Quick status toggle (pending/completed/skipped)
- Notes input per task
- Overdue tasks highlighted at top

**Weekly View**
- 7-column grid (Mon-Sun)
- Task cards in each day cell
- Color-coded by category
- Click to expand/complete

**Monthly View**
- Traditional calendar grid
- Dots/indicators showing task count per day
- Click day to see task list
- Navigate months with arrows

**Yearly View**
- 12-month mini-calendars
- Heat map style showing task density
- Highlight compliance deadlines
- Jump to specific month

### 2. Task Management

- Create/edit task definitions with recurrence picker
- Bulk generate instances for date range
- Mark instances complete/skipped with notes
- Filter by category, status, date range
- Search tasks by title

### 3. Excel Import/Export

**Import Flow:**
1. User uploads Excel file (drag & drop or file picker)
2. Client-side parsing with SheetJS
3. Map columns to task fields
4. Preview import with validation
5. Confirm to create task definitions
6. Auto-generate instances for current + next year

**Export:**
- Export task definitions to Excel
- Export instances (completed log) to Excel
- Export filtered views

### 4. Authentication

- Login with username/password
- Session stored in D1, cookie-based
- Admin role can manage users
- Password hashing with Argon2 (via @noble/hashes for Workers)
- Session expiry: 7 days

### 5. User Management (Admin)

- Create/edit/delete users
- Reset passwords
- Assign roles (admin/user)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current user |
| GET | /api/categories | List categories |
| POST | /api/categories | Create category |
| GET | /api/tasks | List task definitions |
| POST | /api/tasks | Create task definition |
| PUT | /api/tasks/:id | Update task definition |
| DELETE | /api/tasks/:id | Delete task definition |
| GET | /api/instances?start=&end= | Get instances by date range |
| PUT | /api/instances/:id | Update instance status |
| POST | /api/import/generate | Generate instances from definitions |
| GET | /api/users | List users (admin) |
| POST | /api/users | Create user (admin) |
| PUT | /api/users/:id | Update user (admin) |
| DELETE | /api/users/:id | Delete user (admin) |

## Implementation Phases

### Phase 1: Foundation
1. Initialize Vite + React + TypeScript project
2. Configure Tailwind CSS
3. Set up Cloudflare Pages + D1 binding
4. Create database schema
5. Implement auth (login/logout/session)
6. Basic routing with React Router

### Phase 2: Core Task Management
1. Build recurrence pattern engine
2. CRUD for categories and task definitions
3. Instance generation logic
4. Task list view with status updates

### Phase 3: Calendar Views
1. Daily view with task checklist
2. Weekly view grid
3. Monthly calendar view
4. Yearly planning view

### Phase 4: Import/Export
1. Excel file upload UI
2. Column mapping interface
3. Import preview and validation
4. Import execution with instance generation
5. Export functionality

### Phase 5: Polish & Deploy
1. User management UI
2. Responsive design refinement
3. Error handling and loading states
4. Deploy to Cloudflare Pages
5. Set up custom domain (if needed)

## Verification Plan

1. **Local Development**
   - Run `npm run dev` for frontend
   - Run `wrangler pages dev` for full-stack local testing
   - Test all CRUD operations

2. **Auth Testing**
   - Login/logout flow
   - Session persistence
   - Admin vs user permissions

3. **Recurrence Testing**
   - Create tasks with each recurrence type
   - Verify correct instance generation
   - Test edge cases (leap year, month boundaries)

4. **Calendar Views**
   - Navigate between views
   - Verify task display on correct dates
   - Test status updates

5. **Import Testing**
   - Import the provided Excel file
   - Verify all 126 tasks are created
   - Check recurrence patterns are correctly parsed

6. **Production Deploy**
   - Deploy to Cloudflare Pages
   - Run migrations on D1
   - Smoke test all features

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "@tanstack/react-query": "^5.62.0",
    "zustand": "^5.0.1",
    "xlsx": "^0.18.5",
    "date-fns": "^4.1.0",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "vite": "^6.0.3",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^3.4.16",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "wrangler": "^3.99.0",
    "@cloudflare/workers-types": "^4.20241218.0"
  }
}
```

## Cloudflare Configuration

```toml
# wrangler.toml
name = "ops-calendar"
compatibility_date = "2024-12-01"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "ops-calendar-db"
database_id = "<will be generated>"
```

## Estimated Cloudflare Costs

| Resource | Free Tier | Expected Usage |
|----------|-----------|----------------|
| Pages | Unlimited sites | 1 site |
| Workers | 100k req/day | ~1k req/day |
| D1 | 5GB, 5M rows read/day | ~100MB, ~10k reads/day |
| **Total** | **$0/month** | Within free tier |
