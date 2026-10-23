# [Ritul Singh Rawat] — Student Portfolio

A single-page, production-ready personal portfolio for a Computer Science student: semantic HTML, CSS design tokens, a searchable project grid, and a floating AI chatbot. The chatbot calls a Vercel serverless function so the API key never appears in client code or GitHub.

**Live URL:** `[your-vercel-url]` <!-- TODO: Replace after deploying -->

> **Profile photo:** add `assets/profile.jpg` when you have one. If the file is missing, the hero shows an emoji fallback automatically.

## Features

- Sticky header with logo `&lt;[Your Full Name]/&gt;`, in-page nav, theme toggle, and GitHub link
- Mobile hamburger menu; smooth scroll and active-section highlighting
- Dark theme by default, light theme via `[data-theme="light"]`, persisted in `localStorage` (`theme`)
- About (education timeline + career objectives), skills pills, five coursework projects, contact + footer
- Project search (title, description, tag, technologies) combined with category chips (AND)
- Floating “Ask AI” chatbot with starter prompts, keyboard support, and `textContent`-only rendering
- Accessible structure: skip link, semantic landmarks, alt text, `aria-label`s, visible `:focus-visible`, contrast-minded tokens

## Tech stack

- **Client:** HTML5, CSS3, vanilla JavaScript. No React, no Tailwind, no front-end npm packages, no build step
- **Chat backend:** Vercel Node.js serverless function at `api/chat.js` (Gemini `generateContent`)
- **Hosting:** Vercel, typically imported from GitHub

## Directory tree

```
portfolio-project/
  index.html
  css/style.css
  js/main.js
  js/chatbot.js
  data/projects.js
  api/chat.js
  assets/profile.jpg          (optional; not required in the repo)
  assets/icons/               (GitHub, external-link, sun, moon, chat, send, close)
  .gitignore
  .env.example
  package.json                ("type": "module" so api/chat.js can use export default)
  vercel.json                 (optional; sets /api/chat maxDuration)
  README.md
```

Placeholders to replace (search for `TODO`):

- `FULL_NAME` → `[Your Full Name]`
- `GITHUB_USERNAME` → `[your-username]`
- `LINKEDIN_URL` → `[your-linkedin-url]`
- `EMAIL` → `[your-email]`
- `UNIVERSITY` / `DEGREE` / `GRADUATION_YEAR` → `[fill in]`
- Per-project GitHub and live-demo URLs live **only** in `data/projects.js`

## Local setup

1. Open the `portfolio-project` folder (or set it as the Vercel root).
2. Copy environment variables:

   ```bash
   copy .env.example .env.local
   ```

   macOS/Linux: `cp .env.example .env.local`

3. In `.env.local` set:

   ```
   CHATBOT_API_KEY=your_key_here
   ```

   Optional:

   ```
   CHATBOT_MODEL=gemini-2.5-flash
   ```

   Never commit `.env.local`. Never put the key in HTML or JS client files.

4. Static browsing: open `index.html` in a browser. Search, theme, and forms work without a backend.

5. To test `/api/chat` locally, use Vercel:

   ```bash
   npx vercel dev
   ```

   Open the URL printed in the terminal (the chatbot `fetch`es `/api/chat`).

## Deployment

1. Push this project to GitHub (confirm `.env.local` is ignored).
2. In Vercel: **Add New → Project** and import the repo. If the repo parent contains this folder, set the **Root Directory** to `portfolio-project`.
3. **Settings → Environment Variables**: add `CHATBOT_API_KEY` (required) and optionally `CHATBOT_MODEL`.
4. Deploy. After changing env vars, **Redeploy** so the function picks them up.
5. Confirm `POST /api/chat` works from the live site and that GET returns 405.

Vercel maps `api/chat.js` to `/api/chat` automatically. `vercel.json` only raises the function `maxDuration` to 10 seconds.

## Troubleshooting

The chatbot calls relative `POST /api/chat`. That route exists only when Vercel serves the site.

- **Opened as a file (`file://`)** — the browser cannot reach `/api/chat`. Use your deployed Vercel URL, or run `npx vercel dev` in `portfolio-project/` and open `http://localhost:3000`.
- **404** — the serverless function is not running (wrong folder, or a static-only preview). Root must contain `api/chat.js`.
- **405** — a non-POST hit `/api/chat` (the function only allows POST).
- **500 “Assistant is not configured yet.”** — `CHATBOT_API_KEY` is missing. Copy `.env.example` to `.env.local`, set the key, restart `vercel dev`. On Vercel, add the env var and **Redeploy**.
- **429** — Gemini rate limit; wait and retry.
- **Network “could not reach”** — `fetch` itself threw (offline, blocked request, or no server). Check DevTools → Console (URL, status, raw body) and Network → `chat`.

## Testing checklist

- [ ] Search `Python` returns projects 1–3
- [ ] Search `Quiz` returns only the Interactive Quiz Application
- [ ] Chips **All / Python / Web Apps / AI / Cursor** filter correctly and combine with search
- [ ] Nonsense search shows “No projects found matching your search.”
- [ ] Result count updates (`aria-live="polite"`)
- [ ] “Live App ↗” appears only on projects with a non-null `liveUrl`
- [ ] Theme toggle persists across reload; no flash of the wrong theme
- [ ] Hero CTAs scroll to projects / open the chatbot
- [ ] Chat: Enter sends, empty and &gt;500-char messages are blocked, Esc closes and returns focus to the launcher
- [ ] Chat shows a friendly error if the key is missing or the network fails (no raw upstream errors)
- [ ] External links use `target="_blank"` and `rel="noopener noreferrer"`
- [ ] Layout works at ~375px (1 column), tablet (2 columns), desktop (3 project columns)
- [ ] Keyboard: Tab through nav, chips, form, and chat; focus rings are visible

## Security

- `.gitignore` includes `.env`, `.env.local`, `node_modules`, and `.vercel`
- The Gemini key is read only as `process.env.CHATBOT_API_KEY` inside `api/chat.js`
- User and model text is inserted with `textContent` only (no `innerHTML` for untrusted strings)
- The function never forwards upstream error bodies or the API key to the client
