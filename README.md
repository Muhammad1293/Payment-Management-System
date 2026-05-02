# Payment Management System

A web-based system to manage residential society finances, including residents, dues, contributions, and expenses.

---

## Features

- Manage houses and residents (owners/tenants)
- Track active/inactive residents with monthly charges
- Auto-generate monthly maintenance dues
- Collect single or multiple month payments
- View pending dues by month and year
- Maintain complete payment history with receipts
- Create and manage development contribution events
- Track resident contributions and progress
- Record and categorize expenses
- Generate financial reports (income, expenses, pending dues)
- Role-based user management (Admin, Accountant, Supervisor)
- Password management with email notifications

---

## Tech Stack

- Framework: Next.js (App Router)  
- Runtime: Cloudflare Workers (OpenNext)  
- Database: Cloudflare D1 (SQLite)  
- Authentication: JWT + HTTP-only cookies, bcryptjs  
- Styling: Tailwind CSS  
- Email Service: Brevo API  

---

## Run Locally

### Requirements
- Node.js 20+
- Cloudflare account

### 1. Clone and Install

git clone https://github.com/YOUR_USERNAME/Payment-Management-System.git  
cd Payment-Management-System  
npm install  

---

### 2. Setup Cloudflare D1 Database

npx wrangler login  
npx wrangler d1 create pms-db  

Copy the `database_id` and add it to `wrangler.toml`.

---

### 3. Configure `wrangler.toml`

name = "payment-management-system"  
compatibility_date = "2024-09-23"  
compatibility_flags = ["nodejs_compat"]  
main = ".open-next/worker.js"  

[[d1_databases]]  
binding = "DB"  
database_name = "pms-db"  
database_id = "YOUR_D1_DATABASE_ID"  

[vars]  
JWT_SECRET = "your-secret"  
APP_URL = "http://localhost:3000"  
BREVO_API_KEY = "your-api-key"  
SENDER_EMAIL = "your-email@gmail.com"  
SENDER_NAME = "Society Management"  

---

### 4. Initialize Database

npx wrangler d1 execute pms-db --local --file=./schema.sql  
node scripts/generate-seed.js  
npx wrangler d1 execute pms-db --local --file=./seed.sql  

---

### 5. Run Project

npm run dev  

Open: http://localhost:3000