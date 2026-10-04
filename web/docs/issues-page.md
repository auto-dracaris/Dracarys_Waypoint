# Dispatcher Issues page

From `web`, run `npm.cmd run dev`, sign in as a dispatcher, and open `/issues` or choose **Issues** in the sidebar. The existing Vite proxy sends `/api` requests to the API at `http://localhost:5000`. For a different deployment, use the existing `VITE_API_URL` setting.

The page uses the existing authenticated endpoints:

- `GET /issues?page=…&limit=200` — loads all pages for complete counts, search, sorting, and local table pagination.
- `GET /issues/:id` — fetches the latest report when Review opens.
- `PATCH /issues/:id/acknowledge` — moves an open report to In progress.
- `PATCH /issues/:id/resolve` with `{ resolutionNote }` — resolves a report with a required note of up to 500 characters.

Open issues counts `open`; All active includes `open` and `acknowledged`. Resolved today uses the resolution timestamp in Asia/Colombo. Resolved shows all resolved reports. The API provides UUIDs rather than `ISS-014` references, so the display uses `ISS-` plus the first eight UUID characters while requests always use the full UUID.

The existing API has no priority or urgency field. Priority and Urgent display a dash with an accessible explanation; no priority is inferred from the report type. API-supplied delivery details and reporter names replace the sample Figma data.

Run `node scripts/check-issues.mjs`, `npm.cmd run lint`, and `npm.cmd run build` for focused checks. The broader `check:ui` currently expects the older `Confirmed Orders` heading while the Orders page renders `Order Manager`; that unrelated assertion is left unchanged. Browser visual and live authenticated API verification are still required.
