# RP Canteen — Rashtrotthana Parishath

**RP Canteen** is a full-stack web application developed for **Rashtrotthana Parishath**. It allows public customers to browse daily, authentic pure vegetarian canteen menus with dietary availability indicators, while offering a private, role-based inventory and stock management system for authorized canteen workers and the Head of Canteen.

---

## 🥗 Core Institutional Policies

1. **Exclusively 100% Pure Vegetarian**: Every food item is strictly vegetarian (Sattvic principles). Non-vegetarian items and categories are completely prohibited and blocked at both frontend and backend schema layers.
2. **Zero Food Prices**: As an institutional canteen serving staffs and visitors, **food prices are not displayed anywhere** on the public interface, cards, or menus.
3. **Head-Exclusive Stock Control**: Modifying stock quantities, adjusting counts, receiving stock, logging consumption, and publishing daily menus is **strictly restricted to the Head of Canteen**. Canteen staff/workers have read-only visibility.

---

## 👥 Role-Based Access Control (RBAC)

| Role | Access Level | Permissions |
|---|---|---|
| **Public Customer** | No authentication required | • View published daily vegetarian menu<br>• Select past/future published dates<br>• View meal categories and dish availability<br>• Cannot view inventory, stock, or dashboards |
| **Canteen Staff / Cook / Worker** | Authenticated (`worker`) | • View ingredient inventory and measurement units<br>• Search and filter inventory by category & stock level<br>• View low-stock and out-of-stock alerts<br>• View stock movement history<br>• View today's published menu<br>• **Cannot** modify stock, add/delete items, or publish menus |
| **Head of Canteen** | Authenticated (`head`) | • All worker viewing capabilities<br>• Add, edit, and archive inventory items<br>• Update stock (Received, Consumed, Discarded, Correction) with mandatory reason<br>• Create, edit, draft, and publish daily menus<br>• Toggle individual food item availability<br>• Manage authorized staff accounts<br>• View full administrative audit logs |

---

## 🛠 Technology Stack

- **Frontend**: React 19, Vite, Vanilla CSS Design System with Outfit & Inter typography, Lucide Icons, React Router DOM.
- **Backend**: Node.js, Express.js, RESTful API architecture.
- **Database**: MongoDB with Mongoose ODM (`rp_canteen`).
- **Database Inspection**: MongoDB Compass compatible.
- **Authentication**: JWT tokens, bcrypt password hashing, server-side RBAC middleware.

---

## 📁 Project Structure

```text
RP/
├── client/                     # React + Vite Frontend
│   ├── public/
│   │   └── favicon.svg         # RP Monogram logo placeholder
│   ├── src/
│   │   ├── components/         # Navbar, Footer, VegBadge, StatusBadge, Modal
│   │   ├── context/            # AuthContext (JWT & session state)
│   │   ├── pages/              # PublicHome, StaffLogin, WorkerDashboard, HeadDashboard, NotFound
│   │   ├── services/           # api.js (Centralized API client)
│   │   ├── styles/             # index.css (Tokens, theme, animations)
│   │   ├── App.jsx             # Role-based protected routes
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js          # API proxy to backend on port 5000
│
├── server/                     # Node.js + Express Backend
│   ├── config/
│   │   └── db.js               # MongoDB connection with detailed troubleshooting guide
│   ├── middleware/
│   │   └── auth.js             # authenticate, requireRole, requireHead, createAudit
│   ├── models/
│   │   ├── User.js             # Staff accounts & roles
│   │   ├── Inventory.js        # Ingredients, categories, units, threshold, virtual status
│   │   ├── StockMovement.js    # Immutable stock movement history
│   │   ├── Menu.js             # Date-specific pure vegetarian menus (NO prices)
│   │   └── AuditLog.js         # Administrative action trail
│   ├── routes/
│   │   ├── authRoutes.js       # Login, profile, logout
│   │   ├── menuRoutes.js       # Public menu & Head menu management
│   │   ├── inventoryRoutes.js  # Staff inventory & Head stock updates
│   │   ├── movementRoutes.js   # Stock movement history
│   │   ├── staffRoutes.js      # Worker account provisioning
│   │   └── auditRoutes.js      # Head audit trail
│   ├── scripts/
│   │   ├── initHeadAccount.js  # Secure initial administrator provisioning CLI
│   │   ├── seedData.js         # Database seeder (pure vegetarian menus, stock items, staff)
│   │   └── testSuite.js        # Automated 30-scenario test runner
│   ├── server.js               # Express application entry point
│   ├── .env.example
│   └── package.json
│
├── .env.example                # Root configuration reference
├── .gitignore                  # Ignores node_modules, .env, build output
└── README.md                   # Full documentation & setup guide
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or higher recommended; verified with v24.18.0)
- **MongoDB Community Server** (v6.0 or higher)
- **MongoDB Compass** (for visual database administration)

---

### 2. Setting Up MongoDB & MongoDB Compass

#### A. Install MongoDB Community Server (Windows)
1. Download MongoDB Community Server from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community).
2. Run the MSI installer and choose **"Complete"** setup.
3. Select **"Install MongoDB as a Service"** (Service Name: `MongoDB`).
4. Ensure the service is running:
   - Press `Win + R`, type `services.msc`, locate **MongoDB Server**, and verify status is **Running**.
   - Or in PowerShell (Administrator):
     ```powershell
     Get-Service -Name MongoDB
     Start-Service -Name MongoDB
     ```

#### B. Install MongoDB Compass
1. Download MongoDB Compass from [mongodb.com/try/download/compass](https://www.mongodb.com/try/download/compass).
2. Install and launch **MongoDB Compass**.

#### C. Connect Compass to the RP Canteen Database
1. In MongoDB Compass, enter the connection URI:
   ```text
   mongodb://127.0.0.1:27017
   ```
2. Click **Connect**.
3. In the database list on the left, locate the **`rp_canteen`** database.
4. You will see 5 collections:
   - **`users`**: Authorized staff accounts (Head of Canteen and Canteen Workers).
   - **`inventory`**: Ingredient names, stock quantities, units, and minimum alert thresholds.
   - **`stock_movements`**: Immutable history of stock additions, consumption, and corrections.
   - **`menus`**: Date-specific daily menus with vegetarian food items (strictly no prices).
   - **`audit_logs`**: Administrative audit records of all modifications.

---

### 3. Environment Configuration

Copy the sample environment file in `server/`:
```powershell
cd server
copy .env.example .env
```

Ensure `server/.env` contains:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/rp_canteen
JWT_SECRET=rp_canteen_super_secure_jwt_secret_token_2026_dev
JWT_EXPIRES_IN=24h
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

---

### 4. Database Seeding & Secure Initial Head Account Setup

#### Option A: Seed Comprehensive Sample Data
To populate the database with authentic South Indian pure vegetarian menus (Thatte Idli, Masala Dosa, Bisibelebath, Thali, Filter Coffee, Mysore Pak), realistic kitchen ingredients, and sample accounts:
```powershell
cd server
npm run seed
```

This creates two ready-to-test staff accounts:
- **Head of Canteen**:
  - **Username**: `canteenhead`
  - **Password**: `Head@RP2026`
- **Canteen Worker / Cook**:
  - **Username**: `canteenworker`
  - **Password**: `Worker@RP2026`

#### Option B: Securely Provision Head Account via Dedicated CLI Script
To provision a brand new Head-of-Canteen account with custom credentials:
```powershell
cd server
node scripts/initHeadAccount.js [username] [email] [password] [fullName]
```
Example:
```powershell
node scripts/initHeadAccount.js head_admin head@rashtrotthana.org MySecretPass#2026 "Sri Ramesh Bhat"
```

---

### 5. Running the Application

Open two terminal tabs:

#### Terminal 1 — Start the Backend Server:
```powershell
cd server
npm start
# or npm run dev (for nodemon live reload)
```
*Backend runs at: `http://localhost:5000`*

#### Terminal 2 — Start the Frontend Application:
```powershell
cd client
npm run dev
```
*Frontend runs at: `http://127.0.0.1:5173/`*

---

## 🧪 Automated Test Suite (30 Verification Scenarios)

The project includes an automated test runner executing live checks against MongoDB:
```powershell
cd server
npm test
# runs node scripts/testSuite.js
```

### Scenarios Tested:
- **Public Menu**:
  1. Customers can view the homepage without logging in.
  2. Customers can view published vegetarian menus.
  3. No food prices appear anywhere in the public menu.
  4. No non-vegetarian menu options are available.
  5. Unpublished draft menus remain strictly private.
  6. Customers cannot retrieve inventory information.
- **Worker / Staff Role**:
  7. Workers can log in with authorized credentials.
  8. Workers can view inventory stock and measurement units.
  9. Workers can view stock movement history.
  10. Workers cannot update stock quantities (HTTP 403 Forbidden).
  11. Workers cannot create or delete inventory items (HTTP 403 Forbidden).
  12. Workers cannot create or publish menus (HTTP 403 Forbidden).
  13. Workers cannot grant themselves privileged roles (HTTP 403 Forbidden).
- **Head of Canteen Role**:
  14. Head can log in with administrator credentials.
  15. Head can add new inventory items with thresholds.
  16. Head can update stock quantities (received/consumed/discarded/correction).
  17. Stock changes automatically generate persistent movement audit entries.
  18. Invalid quantities and accidental negative stock are rejected.
  19. Head can create and publish daily menus.
  20. Published menus appear immediately on the public website.
  21. Head can toggle individual food item availability.
- **Database Persistence**:
  22. Data persists in MongoDB across browser sessions.
  23. Data persists after application restarts.
  24. Connection error handling is configured with troubleshooting guides.
  25. Application connects using `MONGODB_URI` to `rp_canteen`.
- **Application Security**:
  26. Unauthenticated users cannot access private staff APIs.
  27. Direct API requests cannot bypass backend role verification.
  28. Public responses do not leak private inventory or staff records.
  29. Passwords and credentials are not exposed in API responses.
  30. Workers cannot modify or delete historical stock movement records.

---

## 🌐 API Reference Overview

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/auth/login` | POST | Public | Authenticates staff credentials & issues JWT |
| `/api/auth/me` | GET | Staff/Head | Returns authenticated user session profile |
| `/api/menus/published` | GET | Public | Retrieves published menu for `?date=YYYY-MM-DD` |
| `/api/menus/published-dates` | GET | Public | Lists dates with published menus |
| `/api/menus/all` | GET | Staff/Head | Lists all menus including drafts |
| `/api/menus` | POST | **Head Only** | Creates a new daily menu (Strictly vegetarian) |
| `/api/menus/:id` | PUT | **Head Only** | Updates menu details & dishes |
| `/api/menus/:id/publish` | PATCH | **Head Only** | Toggles publish / draft status |
| `/api/menus/:id/item-availability` | PATCH | **Head Only** | Toggles dish availability |
| `/api/inventory` | GET | Staff/Head | Lists inventory items with search, filter, and sort |
| `/api/inventory/summary` | GET | Staff/Head | Summary counts (Total, Low-stock, Out-of-stock) |
| `/api/inventory` | POST | **Head Only** | Adds a new inventory item |
| `/api/inventory/:id` | PUT | **Head Only** | Edits inventory item details |
| `/api/inventory/:id/stock` | PATCH | **Head Only** | Adjusts stock quantity (Received, Consumed, Discarded, Correction) |
| `/api/inventory/:id/archive` | PATCH | **Head Only** | Archives obsolete item while preserving history |
| `/api/movements` | GET | Staff/Head | View immutable stock movement history |
| `/api/staff` | GET | **Head Only** | Lists authorized staff accounts |
| `/api/staff` | POST | **Head Only** | Provisions a new staff/worker account |
| `/api/staff/:id/status` | PATCH | **Head Only** | Activates or deactivates a staff account |
| `/api/audit-logs` | GET | **Head Only** | Administrative action audit history |

---

## 🏛 Institution Details
**Rashtrotthana Parishath**  
*RP Canteen — Institutional Sattvic Vegetarian Services*  
Bengaluru, Karnataka, India
