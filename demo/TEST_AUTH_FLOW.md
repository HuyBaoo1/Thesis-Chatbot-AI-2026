# Mock Auth Flow Test Guide

This guide helps you test the admin login/logout flow end to end with mock data.

## Mock Data

Run this script from the repo root:

```bash
python scripts/seed_mock_auth_data.py
```

It creates or updates these users:

| Name | Email | Password | Role |
|---|---|---|---|
| Mock Admin | `admin.mock@vinuni.edu.vn` | `Password123!` | `ADMIN` |
| Mock Counselor | `counselor.mock@vinuni.edu.vn` | `Password123!` | `COUNSELOR` |

## What To Verify

### 1. Login Works

Open the frontend and sign in with the mock admin account.

Expected result:

- redirect to `/dashboard`
- `user` is loaded in the header
- `access_token` exists in `localStorage`
- `refresh_token` exists in browser cookies

### 2. Role Gating Works

Sign in with the counselor account.

Expected result:

- `/dashboard`, `/leads`, `/chat/inbox`, `/notifications` are allowed
- `/analytics` and `/settings` are blocked and redirect back to `/dashboard`

### 3. Refresh Flow Works

To test refresh without waiting one hour, temporarily set in `.env`:

```env
ACCESS_TOKEN_EXPIRE_MINUTES=1
REFRESH_TOKEN_EXPIRE_MINUTES=1440
COOKIE_SECURE=false
```

Then:

1. log in as admin
2. keep the app open for a bit more than 1 minute
3. trigger a request, for example by refreshing the page or opening a protected route

Expected result:

- FE gets `401`
- Axios calls `POST /api/auth/refresh-token`
- new access token is stored automatically
- user stays logged in

### 4. Logout Works

Click sign out from the header or sidebar.

Expected result:

- access token is removed from `localStorage`
- refresh cookie is cleared
- user is redirected to `/login`
- protected pages are no longer accessible

## Manual API Check

You can also test the backend directly from PowerShell:

```bash
curl.exe -i -X POST http://localhost:8000/api/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"admin.mock@vinuni.edu.vn\",\"password\":\"Password123!\"}"
```

Expected response:

- `200 OK`
- JSON with `access_token` and `user`
- `Set-Cookie` header for `refresh_token`

To test logout, use the UI button so the browser can clear the cookie correctly.

## Local Setup

Backend:

```bash
python -m uvicorn src.main:app --reload --port 8000
```

Frontend:

```bash
cd demo
npm install
npm run dev
```

## Common Failure Modes

- `502` on login usually means the backend is not running or the Vite proxy target is wrong.
- Refresh cookie will not work on plain HTTP if `COOKIE_SECURE=true`.
- If login succeeds but refresh fails, check browser cookies and the backend `/api/auth/refresh-token` response.

## Notes

- The mock users are only for local testing.
- The script is idempotent, so you can run it again safely.
- If you later want a counselor-only test, use the mock counselor account.
