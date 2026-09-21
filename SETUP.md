# HRK Jewellery — Full Stack Setup Guide

## Folder Structure

```
hrk-jewellery-web/
├── src/                    ← React Vite frontend
│   ├── admin/              ← Admin panel (new)
│   │   ├── api.js
│   │   ├── context/
│   │   ├── components/
│   │   └── pages/
│   └── ...existing files
├── server/                 ← Node.js backend (new)
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── uploads/
│   ├── seed.js
│   └── server.js
├── .env                    ← Frontend env
└── SETUP.md
```

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

---

## Step 1 — Install Backend Dependencies

```bash
cd server
npm install
```

## Step 2 — Configure Backend

Edit `server/.env`:
- Set `MONGO_URI` (local: `mongodb://localhost:27017/hrk-jewellery` or Atlas URI)
- Change `JWT_SECRET` to a long random string in production
- Optionally add Cloudinary keys for cloud image hosting

## Step 3 — Seed Admin Account

```bash
cd server
node seed.js
```
This creates admin: `admin@hrk.com` / `Admin@123`

## Step 4 — Start Backend

```bash
cd server
npm run dev        # development (auto-restart)
# or
npm start          # production
```
Server runs on http://localhost:5000

## Step 5 — Configure Frontend

The root `.env` already has:
```
VITE_API_URL=http://localhost:5000/api
```

## Step 6 — Start Frontend

```bash
# from project root
npm run dev
```
Frontend runs on http://localhost:5173

---

## Admin Panel Access

- URL: http://localhost:5173/admin/login
- Email: admin@hrk.com
- Password: Admin@123

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | — | Admin login |
| GET | /api/auth/me | JWT | Current user |
| GET | /api/products | — | List products |
| POST | /api/products | Admin | Create product |
| PUT | /api/products/:id | Admin | Update product |
| DELETE | /api/products/:id | Admin | Delete product |
| PATCH | /api/products/:id/toggle | Admin | Show/hide |
| GET | /api/orders | Admin | All orders |
| POST | /api/orders | — | Place order |
| PATCH | /api/orders/:id/status | Admin | Update status |
| GET | /api/users | Admin | All users |
| GET | /api/banners/active | — | Active banners |
| POST | /api/banners | Admin | Add banner |
| GET | /api/dashboard/stats | Admin | Dashboard stats |

---

## Using Cloudinary (Recommended for Production)

1. Create account at cloudinary.com
2. Add keys to `server/.env`:
   ```
   CLOUDINARY_CLOUD_NAME=xxx
   CLOUDINARY_API_KEY=xxx
   CLOUDINARY_API_SECRET=xxx
   ```
3. Images upload to cloud automatically — no local storage needed

## Using Local Storage (Default)

Without Cloudinary keys, images save to `server/uploads/`.
They're served at `http://localhost:5000/uploads/filename.jpg`.
