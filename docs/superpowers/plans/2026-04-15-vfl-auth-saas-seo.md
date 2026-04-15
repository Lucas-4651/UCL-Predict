# VFL Auth, SaaS Style & SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a professional authentication system for Users and Admins, transform the UI into a modern SaaS aesthetic, and optimize the site for SEO.

**Architecture:**
- **Authentication:** Session-based authentication using `express-session` and `bcryptjs` for password hashing. SQLite will store user credentials and roles.
- **Authorization:** Middleware-based Role-Based Access Control (RBAC) to distinguish between standard users and administrators.
- **UI/UX:** Transition to a modern SaaS look using Tailwind CSS (via CDN for rapid deployment).
- **SEO:** Implementation of semantic HTML, meta tags, and search engine directives.

**Tech Stack:** Node.js, Express, SQLite3, express-session, bcryptjs, EJS, Tailwind CSS.

---

## File Map

### Created
- `src/config/authConfig.js`: Auth constants and session configuration.
- `src/middleware/authMiddleware.js`: `isAuthenticated` and `isAdmin` guards.
- `src/routes/authRoutes.js`: Login, Register, and Logout handlers.
- `src/views/auth/login.ejs`: Professional login page.
- `src/views/auth/register.ejs`: Professional registration page.
- `public/robots.txt`: Search engine directives.
- `public/sitemap.xml`: Site structure for crawlers.

### Modified
- `index.js`: Integrate session middleware and auth routes.
- `src/config/dbInit.js`: Add `users` table to initial schema.
- `src/routes/userRoutes.js`: Protect specific routes and add user context to views.
- `src/routes/adminRoutes.js`: Apply `isAdmin` middleware.
- `src/views/index.ejs`: Redesign as a SaaS dashboard with Tailwind CSS.
- `src/views/admin.ejs`: Redesign as a SaaS admin panel with Tailwind CSS.

---

## Tasks

### Task 1: Auth Foundation & Database
**Files:**
- Modify: `src/config/dbInit.js`
- Create: `src/config/authConfig.js`

- [ ] **Step 1: Update DB Schema**
  Add `users` table to `initDb`:
  ```sql
  CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```

- [ ] **Step 2: Create Auth Configuration**
  Define session secrets and role constants in `src/config/authConfig.js`.

- [ ] **Step 3: Install Dependencies**
  Run: `npm install bcryptjs`

- [ ] **Step 4: Commit**
  `git add . && git commit -m "feat: auth foundation and user schema"`

### Task 2: Session & Middleware
**Files:**
- Modify: `index.js`
- Create: `src/middleware/authMiddleware.js`

- [ ] **Step 1: Configure Express Session**
  In `index.js`, add `express-session` middleware before routes.
  ```javascript
  const session = require('express-session');
  app.use(session({
      secret: 'vfl-super-secret-key', // In prod use env var
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
  }));
  ```

- [ ] **Step 2: Implement Auth Guards**
  In `src/middleware/authMiddleware.js`, implement:
  - `isAuthenticated`: Redirect to `/login` if `req.session.userId` is missing.
  - `isAdmin`: Redirect to `/` if `req.session.role !== 'admin'`.

- [ ] **Step 3: Commit**
  `git add . && git commit -m "feat: session management and auth guards"`

### Task 3: Auth Routes & Logic
**Files:**
- Create: `src/routes/authRoutes.js`
- Create: `src/views/auth/login.ejs`
- Create: `src/views/auth/register.ejs`
- Modify: `index.js`

- [ ] **Step 1: Implement Registration Logic**
  Create `POST /register` in `authRoutes.js` using `bcryptjs.hash` to store passwords.

- [ ] **Step 2: Implement Login Logic**
  Create `POST /login` in `authRoutes.js` using `bcryptjs.compare`. Set `req.session.userId` and `req.session.role`.

- [ ] **Step 3: Implement Logout Logic**
  Create `GET /logout` to call `req.session.destroy()`.

- [ ] **Step 4: Create Professional Auth Views**
  Build `login.ejs` and `register.ejs` using Tailwind CSS (Clean, centered cards, SaaS feel).

- [ ] **Step 5: Register Routes in index.js**
  `app.use('/auth', authRoutes);`

- [ ] **Step 6: Commit**
  `git add . && git commit -m "feat: registration and login flow"`

### Task 4: Secure Routes & Context
**Files:**
- Modify: `src/routes/userRoutes.js`
- Modify: `src/routes/adminRoutes.js`

- [ ] **Step 1: Protect Admin Dashboard**
  Apply `isAuthenticated` and `isAdmin` to all `adminRoutes`.

- [ ] **Step 2: Add User Context to Global Middleware**
  Add a middleware in `index.js` to make `user` object available to all EJS templates:
  `app.use((req, res, next) => { res.locals.user = req.session.user; next(); });`

- [ ] **Step 3: Protect Result Updates**
  Apply `isAuthenticated` to `POST /update-result` in `userRoutes.js`.

- [ ] **Step 4: Commit**
  `git add . && git commit -m "feat: route protection and user context"`

### Task 5: SaaS UI Transformation
**Files:**
- Modify: `src/views/index.ejs`
- Modify: `src/views/admin.ejs`

- [ ] **Step 1: Implement Tailwind CSS Layout**
  Add Tailwind CDN to all views. Create a consistent Navigation Bar (Logo, User Profile, Logout).

- [ ] **Step 2: Redesign User Dashboard (index.ejs)**
  - Transform the match list into a grid of professional "Prediction Cards".
  - Use a a clean, light-gray background with white cards and blue accents.
  - Add a "Hero" section explaining the VFL platform.

- [ ] **Step 3: Redesign Admin Panel (admin.ejs)**
  - Use a sidebar layout.
  - Transform weight lists into a clean data table with status badges.
  - Add system health metrics as "Stat Cards" at the top.

- [ ] **Step 4: Commit**
  `git add . && git commit -m "feat: SaaS UI overhaul with Tailwind CSS"`

### Task 6: SEO Optimization
**Files:**
- Create: `public/robots.txt`
- Create: `public/sitemap.xml`
- Modify: `src/views/index.ejs`

- [ ] **Step 1: Implement Semantic HTML & Meta Tags**
  In `index.ejs`, add:
  - `<title>` optimized for football predictions.
  - Meta descriptions, OpenGraph tags (OG:title, OG:description, OG:image).
  - Proper `<h1>` through `<h3>` hierarchy.

- [ ] **Step 2: Configure Search Engine Directives**
  Create `robots.txt` allowing all bots but disallowing `/admin` and `/auth`.

- [ ] **Step 3: Generate Sitemap**
  Create `sitemap.xml` listing the main prediction pages.

- [ ] **Step 4: Commit**
  `git add . && git commit -m "feat: SEO optimization and crawler config"`
