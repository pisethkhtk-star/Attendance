# 🕐 Employee Attendance System

ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិក ជាមួយ Face Recognition, QR Code Check-in, Geofencing Kiosk, RBAC Permissions, និង Attendance Log Management។

---

## 📋 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Vite + TailwindCSS |
| **Backend** | Node.js + Express.js (ESM) |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | JWT (JSON Web Token) |
| **Maps** | Leaflet.js + React Leaflet |
| **Face AI** | face-api.js (@vladmandic) |
| **QR Code** | qrcode + html5-qrcode |

---

## ✅ Prerequisites

ត្រូវ install ជាមុន:

- **Node.js** ≥ v18 → [nodejs.org](https://nodejs.org)
- **PostgreSQL** ≥ v14 → [postgresql.org](https://www.postgresql.org)
- **npm** (comes with Node.js)

---

## 🗂️ Project Structure

```
att/
├── backend/          # Node.js + Express API Server
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.js         # Demo data seeder
│   ├── src/
│   │   ├── controllers/    # Route handler logic
│   │   ├── middlewares/    # Auth, permission guards
│   │   ├── routes/         # API route definitions
│   │   └── utils/          # Helpers (DB, permissions)
│   ├── server.js           # Express entry point
│   └── .env                # Environment variables
│
└── frontend/         # React + Vite SPA
    ├── src/
    │   ├── components/     # Sidebar, Navbar, ProtectedRoute
    │   ├── context/        # AuthContext, LanguageContext
    │   ├── pages/          # All page components
    │   └── utils/          # Axios API instance
    └── index.html
```

---

## ⚙️ Setup & Installation

### Step 1 — Clone or navigate to project

```bash
cd d:\IT\att
```

---

### Step 2 — Setup PostgreSQL Database

បើក **pgAdmin** ឬ **psql** ហើយ create database:

```sql
CREATE DATABASE employee_attendance_db;
```

---

### Step 3 — Configure Backend Environment

បើក `backend/.env` ហើយ update ទៅតាម PostgreSQL របស់អ្នក:

```env
PORT=5050
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/employee_attendance_db?schema=public"
JWT_SECRET="your-secret-key-here"
```

---

### Step 4 — Install Backend Dependencies

```bash
cd backend
npm install
```

---

### Step 5 — Run Database Migrations

```bash
# Windows PowerShell
npx.cmd prisma migrate dev --name init

# macOS / Linux
npx prisma migrate dev --name init
```

---

### Step 6 — Seed Demo Data (Optional but Recommended)

```bash
# Windows PowerShell
npx.cmd prisma db seed

# macOS / Linux
npx prisma db seed
```

> ⚠️ Seed data creates demo employees, departments, and attendance records.

---

### Step 7 — Start Backend Server

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

Backend runs at: **http://localhost:5050**

---

### Step 8 — Install Frontend Dependencies

Open a **new terminal tab/window**:

```bash
cd frontend
npm install
```

---

### Step 9 — Start Frontend Dev Server

```bash
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

### Step 10 — Install Mobile Dependencies (Expo)

បើក **terminal ថ្មី** មួយទៀត / Open a **new terminal tab/window**:

```bash
cd mobile
npm install
```

---

### Step 11 — Start Mobile Dev Server (Expo)

```bash
# Windows
npm.cmd start

# macOS / Linux
npm start
```

**របៀបដំណើរការលើទូរស័ព្ទ / Running on mobile device:**
1. ដំឡើងកម្មវិធី **Expo Go** លើទូរស័ព្ទដៃ (iOS App Store ឬ Android Google Play Store) / Install **Expo Go** app on your phone.
2. ត្រូវប្រាកដថា ទូរស័ព្ទដៃ និងកុំព្យូទ័ររបស់អ្នក **ភ្ជាប់ទៅកាន់ Wi-Fi តែមួយ (Same Network)** / Make sure both devices are on the same Wi-Fi network.
3. ស្កេន **QR Code** ដែលបង្ហាញលើ Terminal ជាមួយកម្មវិធី Expo Go (សម្រាប់ iOS ប្រើកាមេរ៉ាស្កេនធម្មតា) / Scan the QR code shown in terminal using the Expo Go app (or iOS Camera).
4. នៅលើផ្ទាំង Login នៃទូរស័ព្ទដៃ សូមវាយបញ្ចូល IP Address របស់កុំព្យូព័រអ្នកទៅក្នុងប្រអប់ **API Server URL** (ឧទាហរណ៍៖ `http://192.168.1.105:5050/api`) / In the Mobile login screen, set the **API Server URL** to your computer's local IP address (e.g. `http://192.168.1.105:5050/api`). You can find your IP by running `ipconfig` (Windows) or `ifconfig` (Mac).

---

## 🔐 Default Login Accounts

បន្ទាប់ពី seed data ហើយ:

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Admin** | `admin@attendance.com` | `admin123` | Full access |
| **HR** | `hr@attendance.com` | `hr123` | HR features |
| **Manager** | `manager@attendance.com` | `manager123` | View + Reports |
| **Employee** | `employee@attendance.com` | `emp123` | Attendance + Leaves |

---

## 🌐 Main Pages & URLs

| Page | URL | Access |
|------|-----|--------|
| Login | `/login` | Public |
| Dashboard | `/` | All roles |
| Departments | `/departments` | Admin / Manager |
| Positions | `/positions` | Admin / Manager |
| Employees | `/employees` | Admin / HR |
| Attendance Log | `/attendance` | All roles |
| Leave Requests | `/leaves` | All roles |
| Reports | `/reports` | Admin / Manager |
| Kiosk Mode | `/kiosk` | Admin / HR |
| Kiosk Geofencing | `/kiosk-settings` | **Admin only** |
| Permissions | `/permissions` | **Admin only** |

---

## 🗺️ Kiosk Geofencing Setup

1. Login as **Admin**
2. Go to **Kiosk Geofencing** from Sidebar
3. Click on the **map** or drag the **marker** to set HQ location
4. Set the **allowed radius** (in meters) using the slider or preset buttons
5. Click **"📍 Use My Location"** to auto-fill your current GPS
6. Click **"💾 Save Geofence Settings"**

> Employees who scan QR or Face outside this zone will be **blocked**.

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/departments` | List departments |
| GET | `/api/positions` | List positions |
| GET | `/api/employees` | List employees |
| GET | `/api/attendances` | Get attendance logs |
| POST | `/api/attendances` | Add attendance record |
| PUT | `/api/attendances/:id` | Edit attendance record |
| DELETE | `/api/attendances/:id` | Delete attendance record |
| POST | `/api/face/enroll` | Register face data |
| POST | `/api/face/checkin` | Face recognition check-in |
| GET | `/api/qrcode/generate/:staffId` | Generate QR code |
| POST | `/api/qrcode/scan` | Scan QR for check-in |
| GET | `/api/kiosk-settings` | Get geofence settings |
| PUT | `/api/kiosk-settings` | Update geofence settings (Admin) |
| GET | `/api/permissions` | Get RBAC permission matrix |
| PUT | `/api/permissions` | Update role permissions |
| GET | `/api/leaves` | List leave requests |
| GET | `/api/attendance-logs` | Get scan audit logs |
| GET | `/api/health` | Server health check |

---

## 🛠️ Useful Development Commands

```bash
# Open Prisma Studio (Visual DB Browser)
cd backend
npx.cmd prisma studio       # Windows
npx prisma studio           # Mac/Linux

# Re-run migrations after schema changes
npx.cmd prisma migrate dev --name your_migration_name

# Regenerate Prisma Client after schema update
npx.cmd prisma generate

# Check migration status
npx.cmd prisma migrate status
```

---

## 🔑 Permissions System

Permissions ត្រូវបានគ្រប់គ្រងដោយ **Admin** នៅក្នុង `/permissions` page:

| Resource | Description |
|----------|-------------|
| `departments` | Manage departments |
| `positions` | Manage positions |
| `employees` | Manage employees |
| `attendance` | View attendance logs |
| `add_attendance` | Add attendance records |
| `edit_attendance` | Edit attendance records |
| `delete_attendance` | Delete attendance records |
| `leaves` | View / manage leaves |
| `reports` | Access reports |
| `kiosk` | Use Kiosk scan mode |
| `permissions` | Manage role permissions |

---

## 📝 Notes

- Backend uses **ESM modules** (`"type": "module"` in package.json)
- Frontend runs on **Vite** — use `npm run dev` (not `npm start`)
- Face Recognition uses **CDN models** — requires internet on first load
- GPS Geofencing requires **HTTPS** or `localhost` for browser permission
- Default Kiosk geofence center: **Phnom Penh HQ** (11.5564, 104.9282), radius: **100m**

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check PostgreSQL is running
# Verify .env DATABASE_URL is correct
# Ensure migrations have been run
npx.cmd prisma migrate status
```

### Prisma migration fails on Windows
Use `npx.cmd` instead of `npx` in PowerShell:
```bash
npx.cmd prisma migrate dev --name fix
```

### Script Execution Error on Windows (npm/npx)
ប្រសិនបើជួបបញ្ហា `cannot be loaded because running scripts is disabled on this system` នៅពេល run commands៖
ប្រើប្រាស់ `npm.cmd` ឬ `npx.cmd` ជំនួសវិញ៖
```bash
# running dev server
npm.cmd run dev

# running prisma commands
npx.cmd prisma migrate dev
```

### GPS not working on Kiosk
- Browser must be on `localhost` or **HTTPS**
- Allow **Location** permission in browser settings
- Chrome: Address bar → 🔒 icon → Site Settings → Location → Allow

### Face models slow to load
- First load downloads models from CDN (~20MB)
- Requires stable internet connection
- Models are cached after first load

---

*Built with ❤️ — Employee Attendance System v1.0*
