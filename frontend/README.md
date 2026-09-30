# Student Task Management System

A simple, responsive frontend prototype for organising academic tasks. It uses plain HTML, CSS, and JavaScript with sample data stored in the browser.

## Run the prototype

Open `index.html` in a browser. The entry page sends signed-out visitors to login and signed-in demo users to the dashboard. No build step or package installation is needed.

## Screens

- `login.html` and `register.html` provide mock account flows.
- `dashboard.html` shows task statistics, filters, and the task list.
- The dashboard task form is shared for creating and editing tasks.

## Mock data and storage

Profiles, the current demo session, and tasks are stored in localStorage. The mock login accepts any non-empty email and password; registration checks required fields and matching passwords. Passwords are not stored. Each task includes an ID, title, description, due date, status, and user ID. Sample tasks are added the first time a user's dashboard is opened.

This is frontend-only and does not provide real authentication, secure storage, or server-side persistence. Browser storage can be cleared at any time.

## Next integration stage

Replace the mock account handlers in `script.js` with Firebase Authentication. Replace the task storage helpers with Cloud Firestore reads and writes scoped to the authenticated user ID. A Node.js backend can be added separately if server-side APIs are needed; no backend code is included here.