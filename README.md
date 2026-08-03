# NGO Expense Reimbursement System

A full-stack web application for NGOs to manage employee expense reimbursements across multiple CSR projects — built with React, Tailwind CSS, Node.js (Express), PostgreSQL, and Prisma.

## Features

**Employee**
- Secure login (JWT access token + rotating httpOnly refresh token)
- Submit reimbursement claims: CSR project, expense date, amount, category, description, payment mode, and bill attachments (JPG/PNG/PDF)
- Track status of all submitted claims
- Edit claims until they are approved

**Finance / Admin**
- Manage employees, CSR projects, and expense categories
- Review all claims: approve, reject, or put on hold with remarks
- Open uploaded bills in-app
- After approval, mark claims Pending Payment, and record partial/full payments (date, amount, UTR/reference, remarks) with automatic balance calculation
- Dashboard: pending/approved/paid claims, pending reimbursement amount, project-wise statistics
- Filters by employee, project, category, status, and date range
- Monthly reports (employee-wise & project-wise: Approved / Paid / Pending / Outstanding), exportable to Excel and PDF
- Full audit trail of submissions, approvals, payments, and user actions

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL
- **Auth:** JWT (short-lived access token + rotating refresh token stored in DB), bcrypt password hashing
- **Reports:** ExcelJS (Excel export), PDFKit (PDF export)

## Project Structure

```
backend/    Express API, Prisma schema & migrations, file uploads
frontend/   React SPA (Vite + Tailwind)
docker-compose.yml   Postgres + backend + frontend for local/prod-like runs
```

## Getting Started (local development)

### 1. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # adjust secrets as needed
npm install
npm run prisma:migrate   # creates tables
npm run prisma:seed      # demo admin/employee/projects/categories
npm run dev               # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

### Demo accounts (after seeding)

| Role          | Email              | Password     |
|---------------|--------------------|--------------|
| Finance/Admin | admin@ngo.org      | Admin@123    |
| Employee      | employee@ngo.org   | Employee@123 |

## Production

`docker-compose.yml` builds and runs the Postgres database, backend API, and frontend together. Set strong values for `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` and configure `CORS_ORIGIN` before deploying. Uploaded bill files are stored on a persistent volume (`backend_uploads`); for multi-instance deployments, back this with shared/object storage.

## Claim Lifecycle

```
SUBMITTED / ON_HOLD  →  APPROVED  →  PENDING_PAYMENT  →  PARTIALLY_PAID  →  PAID
                     ↘  REJECTED
```

Employees can edit a claim (and resubmit) only while it is `SUBMITTED` or `ON_HOLD`. Every transition is recorded in the audit trail with the acting user, timestamp, and remarks.
