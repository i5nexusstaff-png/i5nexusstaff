# i5 Nexus — Staff Portal

A full-stack real estate staff management portal built with **Django REST Framework** (backend) and **React + Vite + Tailwind CSS** (frontend).

---

## Features

| Module | Description |
|---|---|
| **Dashboard** | KPI cards, attendance summary, quick stats |
| **Staff Management** | Add/edit staff profiles, roles, departments |
| **Attendance** | GPS-tagged selfie check-in/out with geofencing |
| **Projects & Plots** | Interactive plot layout grid with real-time status updates (WebSocket) |
| **Booking Requests** | Staff can request plot status changes (block/book/sell); admins approve, reject, or hold |
| **Daily Reports** | Structured daily reports with admin review workflow |
| **Leave Requests** | Leave application and admin approval flow |
| **To-Do List** | Personal task management |
| **Tutorials** | YouTube video library — admins add videos, all staff watch them |
| **Achievements** | Leaderboard and performance badges |
| **Feedback** | Two-way feedback between staff and admin |
| **Offers & Banners** | Promotional offer management |
| **Notifications** | Real-time in-app notifications + Web Push for all key events |
| **Settings** | Profile, password, dark/light mode |

---

## Tech Stack

### Backend
- **Python 3.9** · **Django 4.2** · **Django REST Framework**
- **Django Channels** — WebSocket support for real-time plot updates
- **PostgreSQL** — primary database
- **pywebpush** — Web Push notifications (VAPID)
- **openpyxl / pandas** — Excel import/export for plot data
- **Pillow** — image handling (layout images, attendance selfies)

### Frontend
- **React 18** · **Vite** · **Tailwind CSS**
- **Lucide React** — icon set
- **Recharts** — analytics charts
- **Axios** — API client
- **Web Push API / Service Worker** — browser push notifications

---

## Project Structure

```
i5nexus/
├── backend/
│   ├── config/               # Django settings, URLs, ASGI, routing
│   ├── accounts/             # Custom User model, auth, JWT
│   ├── projects/             # Project & layout management
│   ├── plots/                # Plot CRUD + booking request flow (WebSocket)
│   ├── reports/              # Daily report submission & review
│   ├── attendance/           # Check-in/out, geofencing
│   ├── leaves/               # Leave request workflow
│   ├── todos/                # Personal task list
│   ├── tutorials/            # YouTube tutorial library
│   ├── notifications/        # In-app + Web Push notifications
│   ├── achievements/         # Leaderboard & badges
│   ├── feedback/             # Staff ↔ admin feedback
│   ├── offers/               # Offer banners
│   ├── banners/              # App banners
│   ├── requirements.txt
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── pages/            # admin/, staff/, superadmin/ page components
│   │   ├── components/       # Shared UI components
│   │   ├── contexts/         # Auth, Theme context providers
│   │   ├── services/         # Axios API layer (api.js)
│   │   └── utils/            # Push notification helpers
│   ├── public/
│   │   └── sw.js             # Service Worker for push notifications
│   ├── index.html
│   └── vite.config.js
├── start_backend.bat         # One-click backend start (Windows)
├── start_frontend.bat        # One-click frontend start (Windows)
└── README.md
```

---

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 14+

---

### 1 — Clone the repo

```bash
git clone https://github.com/i5nexusstaff-png/i5nexusstaff.git
cd i5nexusstaff
```

---

### 2 — Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your database credentials and secret key
```

**`.env` variables required:**

```env
SECRET_KEY=your-django-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=i5nexus
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432

# Web Push (optional — generate with: python manage.py generate_vapid_keys)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=admin@yourdomain.com
```

```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

> The backend runs at **http://localhost:8000**

---

### 3 — Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Set VITE_API_URL=http://localhost:8000/api

# Start dev server
npm run dev
```

> The frontend runs at **http://localhost:5173**

---

### 4 — Windows one-click start

Double-click `start_backend.bat` and `start_frontend.bat` from the project root.

---

## User Roles

| Role | Access |
|---|---|
| `super_admin` | Full access — all modules, manage projects, tutorials, reports |
| `admin` | Manage staff, approve bookings/leaves, add tutorials, view reports |
| `staff` | Submit reports, request plot changes, view tutorials, attendance |

---

## Notification Events

Push notifications fire automatically for:

- 🏠 **New booking request** → all admins notified
- ✅ **Booking approved / ❌ rejected / ⏸ on hold** → staff who submitted notified
- 📄 **Daily report submitted** → all admins notified
- 🎬 **New tutorial uploaded** → all users notified

---

## API Overview

All endpoints are prefixed with `/api/`.

| Endpoint | Description |
|---|---|
| `/api/auth/` | JWT login / refresh / logout |
| `/api/projects/` | Project CRUD + plot import |
| `/api/plots/` | Plot CRUD + booking request actions |
| `/api/booking-requests/` | Request flow (approve/reject/hold) |
| `/api/reports/` | Daily reports |
| `/api/attendance/` | Check-in/out |
| `/api/tutorials/` | YouTube tutorial library |
| `/api/notifications/` | In-app + push subscriptions |

WebSocket: `ws://localhost:8000/ws/plots/{project_id}/`

---

## License

Private — i5 Nexus © 2025. All rights reserved.
