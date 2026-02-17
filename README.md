# Garry's Daily Digest — Newsletter Subscription Page

Production-ready newsletter subscription page (React + Tailwind). Subscribe with name, email, topic tags, and article count; or unsubscribe by email. Data is sent to a Google Sheet via Apps Script.

## Stack

- React (Vite), Tailwind CSS, fetch API. No form libraries.

## Setup

1. **Apps Script**: Create a Google Apps Script project bound to a Sheet, deploy as Web App (Execute as: Me, Anyone). Implement `doPost()` for `action: "subscribe"` and `action: "unsubscribe"`.
2. **Env**: In `src/NewsletterPage.jsx`, set `APPS_SCRIPT_URL` to your deployment URL.
3. **Run**: `npm install && npm run dev`

## Script

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run preview` — preview build

## Sheet columns (13)

A: Subscriber ID, B: First Name, C: Last Name, D: Email, E: Country Code, F: Mobile, G: Tags (JSON), H: Article Mode, I: Total Count, J: Topic Distribution (JSON), K: Status, L: Subscribed At, M: Unsubscribed At.
