# VinUni Admin FE

This folder contains the React + Vite frontend for the VinUni admissions admin portal.
It is the staff-facing UI for login, dashboard, leads, conversations, notifications, analytics, majors, policies, knowledge base, and profile management.

## What This UI Does

The frontend now supports the admin authentication flow end to end:

1. Admin opens `/login`.
2. FE sends credentials to `POST /api/auth/login`.
3. Backend returns:
   - `access_token`
   - `user` payload with `name`, `email`, and `role`
4. FE stores the access token in memory and `localStorage`.
5. FE sends the token on every API request through Axios.
6. When the access token expires, FE automatically calls `POST /api/auth/refresh-token`.
7. Refresh token is stored in an HTTP-only cookie.
8. If refresh fails, the session is cleared and the user is redirected back to `/login`.
9. Logout clears the access token and refresh cookie.

## What I Changed

### Frontend

- Updated Axios auth handling in `demo/src/lib/api.js`
  - store access token in memory + `localStorage`
  - attach `Authorization: Bearer <token>` to requests
  - refresh token automatically on `401`
  - force redirect to `/login` when refresh fails
- Updated auth store in `demo/src/stores/authStore.js`
  - use backend `user` response directly after login
  - clear session state on logout and failed refresh
- Updated login screen in `demo/src/pages/LoginPage.jsx`
  - keep the sign-in flow clean
  - navigate with `replace` after success
- Updated profile page in `demo/src/pages/profile/ProfilePage.jsx`
  - fixed change-password payload to match backend (`old_password`, `new_password`)
- Added route compatibility file `demo/src/pages/ProfilePage.jsx`
  - keeps `App.jsx` lazy import working
- Updated header and sidebar logout actions
  - use replace navigation
  - show user email in the header menu

### Backend

- Updated `src/services/auth_service.py`
  - refresh cookie is no longer hard-coded to `secure=True`
  - logout also uses the config value
- Updated `src/core/config.py`
  - added `COOKIE_SECURE`
- Updated `.env.example`
  - added `COOKIE_SECURE=false` for local development

## Important Notes

- Access token lifetime is 1 hour.
- Refresh token lifetime is 1 day.
- Refresh token is kept in an HTTP-only cookie, not in frontend storage.
- For local development over HTTP, `COOKIE_SECURE=false` is required or the browser may not store the refresh cookie.
- Backend role checks are still enforced by `src/api/deps.py` and route-level `require_role(...)`.

## Files Touched

- `demo/src/lib/api.js`
- `demo/src/stores/authStore.js`
- `demo/src/pages/LoginPage.jsx`
- `demo/src/pages/profile/ProfilePage.jsx`
- `demo/src/pages/ProfilePage.jsx`
- `demo/src/components/layout/Header.jsx`
- `demo/src/components/layout/Sidebar.jsx`
- `src/services/auth_service.py`
- `src/core/config.py`
- `.env.example`

## Backend Contracts Used By FE

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/refresh-token`
- `PATCH /api/auth/change-password`
- `POST /api/auth/logout`

## Local Run

Frontend:

```bash
cd demo
npm install
npm run dev
```

Backend:

```bash
python -m uvicorn src.main:app --reload
```

If the frontend shows `502`, check that:

- backend is running on `http://localhost:8000`
- the database and env variables are configured
- the Vite proxy in `demo/vite.config.js` is pointing to the correct backend URL

## Test Guide

See [TEST_AUTH_FLOW.md](./TEST_AUTH_FLOW.md) for mock data and a step-by-step auth flow test plan.

## Short Summary

This FE work focused on making the admin login/logout flow consistent with the backend auth design:

- login returns user identity + access token
- access token is stored locally and sent by Axios
- refresh token lives in cookie
- expired access token is recovered automatically
- failed refresh ends the session cleanly
- logout clears both client session and server cookie
