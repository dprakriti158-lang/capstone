# Student Task Management System

A university capstone interim prototype for managing academic tasks. The existing plain HTML, CSS, and JavaScript interface uses Firebase Authentication for accounts, an Express API for protected requests, and Cloud Firestore for task storage.

## Technology Stack

- Frontend: HTML, CSS, and vanilla JavaScript modules
- Backend: Node.js 22 or newer and Express.js
- Authentication: Firebase Authentication
- Database: Cloud Firestore via the Firebase Admin SDK
- Development tools: npm and nodemon

## Backend Setup

Install Node.js 22 or newer, then install the backend dependencies:

```sh
cd backend
npm install
cp .env.example .env
```

The `.env` file is local and ignored by Git. Set `FIREBASE_PROJECT_ID` to your Firebase project ID, and set `GOOGLE_APPLICATION_CREDENTIALS` to the path of a service account JSON file with Firestore access. For local development, put the downloaded key at `backend/serviceAccountKey.json`; never commit it. You can also use Google Application Default Credentials where available.

Set `FRONTEND_ORIGIN` to the origin serving the frontend, such as `http://localhost:5500`. Multiple origins can be comma-separated.

## Firebase Setup

1. Create or select a Firebase project and enable Email/Password under Authentication sign-in providers.
2. Create a Cloud Firestore database.
3. Register a Web App in Firebase project settings and copy its web configuration values into `frontend/firebase-config.js`.
4. Create a service account with access to Firestore and download its private key for local backend use. Keep it out of source control.
5. In `frontend/firebase-config.js`, set `API_BASE_URL` to the backend URL if it is not `http://localhost:3000`.

The web app configuration is public client configuration; the service account key is private and must only be used by the backend.

## Start the Applications

Start the backend from `backend/`:

```sh
npm start
```

For automatic restart during development:

```sh
npm run dev
```

Serve `frontend/` using a local static HTTP server, for example from the repository root:

```sh
npx serve frontend -l 5500
```

Open the URL printed by the static server. The frontend uses JavaScript modules and should not be opened directly with a `file://` URL.

## API Endpoints

All task endpoints require `Authorization: Bearer <Firebase_ID_TOKEN>`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Confirm the backend is running |
| GET | `/api/health/database` | Confirm Firestore is reachable |
| POST | `/api/auth/profile` | Save the authenticated user's name and email |
| POST | `/api/tasks` | Create a task (status defaults to `Pending`) |
| GET | `/api/tasks` | List the authenticated user's tasks |
| GET | `/api/tasks/:taskId` | Get one of the authenticated user's tasks |
| PUT | `/api/tasks/:taskId` | Update a task |
| DELETE | `/api/tasks/:taskId` | Delete a task |
| PATCH | `/api/tasks/:taskId/complete` | Mark a task `Completed` |

Tasks are stored at `users/{userId}/tasks/{taskId}` with `title`, `description`, `dueDate`, `status`, and `createdAt`. The user profile is stored at `users/{userId}`.

## Frontend Connection

Registration and login use Firebase Authentication in the existing JavaScript. The browser obtains a Firebase ID token and sends it as a Bearer token with API requests. The backend verifies the token and uses its UID for every Firestore task operation; a client-supplied user ID is never used to select task ownership.

## Security Notes

- Never put Firebase Admin credentials in frontend code or commit private keys or `.env` files.
- The Firebase web configuration is intended for the browser; configure Firebase Authentication and Firestore security rules for any direct client access.
- This API verifies Firebase ID tokens and scopes task queries to the verified UID.
- CORS is configured for the local frontend origin; set `FRONTEND_ORIGIN` appropriately for deployment and use HTTPS in production.

## Testing Checklist

1. Start the Node.js backend and confirm `GET /api/health` responds.
2. Serve and open the frontend.
3. Register a new user and log in.
4. Create a task and confirm it appears in Firestore under that user's `tasks` subcollection.
5. Refresh the dashboard and confirm the task is retrieved.
6. Edit the task, mark it completed, then delete it.
7. Confirm the task is updated and then removed from Firestore.
8. Send a task API request without an Authorization header and confirm it receives HTTP 401.