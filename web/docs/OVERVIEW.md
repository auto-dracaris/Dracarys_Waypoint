# Dispatcher Overview preview

Run `npm install` and `npm run dev` from `web`, then open the local URL printed by Vite.

Implemented routes:

- `/`: Delivery Overview, route filters, searchable route picker, selected vehicle panel, planning summary and date selector.
- `/trips/VEH021`: Trip Details within Overview, with expandable recorded/remaining stops. Replace the ID with any of the 15 mock vehicle IDs.
- `/trips/VEH021?stop=5`: Opens and highlights the requested stop.
- `/notifications`: Seven notification cards, category filters, mark all read, and trip links. Escape or Close returns to the originating trip when opened there.

Mock data is centralized in `src/features/overview/mockData.ts`. Route counts are derived from the 15 records (3 errors, 8 success, 4 info). Planning totals are 114 confirmed, 102 allocated, 12 needing decisions, and 0 deferred. These are illustrative data, with no backend calls or actual tracking. Date changes update the selected planning date; the sample plan is reused for every date.

Filters and search survive in-app navigation. Notification read state lasts for the browser tab session. Reset demo clears read state and returns to the initial view. Ctrl/Cmd+K focuses route search.

Orders, Planning, Vehicles, Outlets, Team, and loading exception review are scheduled for later. Their actions display an explicit message rather than navigating to an unfinished screen.

The existing illustrative map remains a placeholder for a future map library. Map layout work was deferred at the user's request.

Figma source: https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=539-8260

Overview: 1052:44599; Trip Details: 1052:44376; Notifications: 1052:45008. Exported images and SVG assets are local under `src/assets/figma`.
