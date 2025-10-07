# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Google Sign-In + Firebase Setup (Client + Server)

Follow these steps to enable Google sign-in end-to-end:

1. Firebase Console (same project for client and server)
   - Authentication → Sign-in method → Google → Enable.
   - Authentication → Settings → Authorized domains → add:
     - `localhost`
     - `localhost:5173`

2. Server `.env` (create `IeltsCoach/server/.env` and restart server)

```
PORT=5000

# Firebase Admin (Service Account) — must match the client project
FIREBASE_PROJECT_ID=ielts-coach-351d1
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ielts-coach-351d1.iam.gserviceaccount.com
# Preserve line breaks using \n
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Web API key (used for email/password login)
FIREBASE_WEB_API_KEY=YOUR_FIREBASE_WEB_API_KEY

# JWT config for tokens issued by the server
JWT_SECRET=please_change_me
JWT_EXPIRES_IN=7d
```

3. Client `.env` (create `IeltsCoach/client/.env` and restart Vite)

```
# Use only if not running through Vite dev proxy
VITE_API_BASE_URL=http://localhost:5000

# Google OAuth 2.0 Web client ID for the same Firebase project
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID
```

4. Health check (server)
   - Visit `http://localhost:5000/health`
   - Ensure all booleans are `true`:
     - `env.jwtSecret`
     - `env.firebaseWebApiKey`
     - `env.firebaseAdmin.projectId`, `clientEmail`, `privateKey`

5. Test flows
   - Client login: email/password login should succeed
   - Google login/register: use the "Continue with Google" button
   - If it fails, check server logs for lines starting with:
     - `[GoogleAuth] Token iss:`
     - `[GoogleAuth] Token aud:`
     - `[GoogleAuth] Verification failed:`
   - Mismatch errors usually indicate client/server using different Firebase projects or the wrong OAuth client ID.
