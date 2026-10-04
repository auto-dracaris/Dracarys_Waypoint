# Notifications

Tells people when something they care about changes: a trip is assigned, an
order is deferred, an issue is raised. Each notification is delivered two ways:

1. **In-app list.** Stored on the server, one row per recipient. Every role
   reads its own list with `GET /api/notifications`. This is the source of
   truth.
2. **Phone push.** The same title and text sent through Firebase Cloud
   Messaging (FCM) to every handset the user has registered. A push is only a
   nudge to open the app or refresh the list.

Contents:

- [Who is notified, and when](#who-is-notified-and-when)
- [API](#api)
- [Mobile setup, step by step](#mobile-setup-step-by-step)
- [Server setup](#server-setup)
- [How it works inside](#how-it-works-inside)
- [Adding a new notification](#adding-a-new-notification)
- [Limits and known issues](#limits-and-known-issues)

## Who is notified, and when

### Driver

| `type` | When | Severity | `data` |
|---|---|---|---|
| `trip_assigned` | The dispatcher publishes the plan and the trip has this driver | info | `tripId`, `date` |
| `trip_ready` | The loader marks the trip loaded | info | `tripId` |
| `route_changed` | The dispatcher reorders the trip's stops | error | `tripId` |
| `issue_acknowledged` | The dispatcher acknowledges an issue this driver reported | info | `issueId`, `tripId?`, `orderId?` |
| `issue_resolved` | The dispatcher resolves it; the text carries their note | success | `issueId`, `tripId?`, `orderId?` |

### Loader

| `type` | When | Severity | `data` |
|---|---|---|---|
| `trips_to_load` | A plan is published for the loader's depot (one summary per loader) | info | `date` |
| `issue_acknowledged` | The dispatcher acknowledges an issue this loader reported | info | `issueId`, `tripId?`, `orderId?` |
| `issue_resolved` | The dispatcher resolves it | success | `issueId`, `tripId?`, `orderId?` |

### Store manager

| `type` | When | Severity | `data` |
|---|---|---|---|
| `order_scheduled` | A plan is published with the outlet's order on a trip | success | `orderId`, `date` |
| `order_deferred` | A plan is published with the order deferred, or the dispatcher defers it by hand. The text gives the reason and the new date | warning | `orderId`, `date?` |
| `order_out_for_delivery` | The driver starts the trip carrying the outlet's orders | info | `orderId` |
| `delivery_recorded` | The driver completes the outlet's stop. The text lists delivered and ordered cases per order | success if all delivered, warning if short, error if nothing was delivered | `orderId` |
| `issue_acknowledged` | The dispatcher acknowledges an issue this store manager reported | info | `issueId`, `tripId?`, `orderId?` |
| `issue_resolved` | The dispatcher resolves it | success | `issueId`, `tripId?`, `orderId?` |

### Dispatcher

| `type` | When | Severity | `data` |
|---|---|---|---|
| `issue_reported` | A driver, loader or store manager reports an issue | error for a vehicle breakdown or temperature breach, otherwise warning | `issueId`, `tripId?`, `orderId?` |
| `delivery_problem` | A stop is completed with at least one order short or not delivered | warning | `tripId`, `orderId` |
| `plan_draft_ready` | The automatic 16:00 run has drafted a depot's plan (skipped when the day has no orders) | info | `depot`, `date` |
| `plan_run_failed` | The automatic 16:00 run failed for a depot | error | `depot`, `date` |

### Rules that apply to all of them

- Only **active** users are notified. Store managers are matched by their
  outlet, loaders by their depot; all active dispatchers get dispatcher
  notifications.
- A trip with no driver assigned notifies nobody for the driver types.
- A notification is written once, when the state really changes. A repeated
  request (an offline retry of start, complete, or an issue with the same
  `clientId`) does not notify again.
- `orderId` in `data` is the order reference (`ORD0000012`). When a
  notification covers several orders, it is the first one.
- Start codes and delivery codes are not notifications; they still go by SMS.

## API

All routes need `Authorization: Bearer <access token>` and work for every
role. A caller only ever reaches their own notifications and devices.

| Method & path | Body | Result |
|---|---|---|
| `GET /api/notifications?page=&limit=&unread=true` | | `{ items, meta, unreadCount }`, newest first. `unread=true` leaves out read items. `unreadCount` is always the total unread |
| `POST /api/notifications/:id/read` | | The notification, now `read: true`. Safe to repeat. `404` if the id is not the caller's, `400` if it is not a UUID |
| `POST /api/notifications/read-all` | | Marks everything read |
| `POST /api/devices` | `{ "token": "<FCM token>", "platform": "android" \| "ios" }` | Registers the handset for the caller. Safe to repeat; a token moves to whoever registered it last |
| `DELETE /api/devices/:token` | | Removes the handset. URL-encode the token |

A notification:

```json
{
  "id": "8e4c717f-c79f-4169-8c3f-8786b4611ee0",
  "type": "route_changed",
  "severity": "error",
  "title": "Trip 1 stop order changed",
  "body": "Road closure on Kandy Road. Review the new sequence before you continue.",
  "data": { "tripId": "5b0e2f0a-..." },
  "read": false,
  "createdAt": "2026-10-05T03:12:00.000Z"
}
```

- `severity` is `error | warning | info | success`; use it for the card's
  colour.
- Every value in `data` is a string.
- Show an unknown `type` with its `title` and `body` and no action, so new
  types do not break older app versions.

A push message carries:

```json
{
  "notification": { "title": "Trip 1 stop order changed", "body": "Road closure on Kandy Road. ..." },
  "data": { "type": "route_changed", "tripId": "5b0e2f0a-..." }
}
```

It does not carry the notification's `id`. On a push, refetch the list.

## Mobile setup, step by step

These steps are for the Flutter driver app (`mobile/driver_app`). The app must
already sign in against the real API, because registering a device needs an
access token.

### 1. Create the Firebase project

1. Open the Firebase console and create a project (or use the team's).
2. Add an **Android app** with package name `com.dracarys.driver_app`.
3. Add an **iOS app** with bundle id `com.dracarys.driverApp`.

### 2. Connect the Flutter app to Firebase

From `mobile/driver_app`:

```bash
dart pub global activate flutterfire_cli
flutterfire configure        # pick the project, tick android and ios
flutter pub add firebase_core firebase_messaging
```

`flutterfire configure` writes `lib/firebase_options.dart` and
`android/app/google-services.json`, and adds the Google Services Gradle plugin.

### 3. Android

Add the notification permission (needed from Android 13) to
`android/app/src/main/AndroidManifest.xml`, next to the existing `INTERNET`
permission:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

### 4. iOS

1. In the Apple Developer account, create an **APNs authentication key** and
   upload it in Firebase console → Project settings → Cloud Messaging.
2. In Xcode, open `ios/Runner.xcworkspace` → Runner target → Signing &
   Capabilities, and add **Push Notifications** and **Background Modes** with
   **Remote notifications** ticked.

Push does not work on the iOS simulator before iOS 16; test on a real device.

### 5. Initialise Firebase at startup

In `lib/main.dart`, before `runApp`:

```dart
WidgetsFlutterBinding.ensureInitialized();
await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
```

### 6. After sign-in: ask permission and register the token

```dart
final messaging = FirebaseMessaging.instance;

await messaging.requestPermission();          // shows the system prompt once

final token = await messaging.getToken();
if (token != null) {
  await api.post('/devices', {
    'token': token,
    'platform': Platform.isIOS ? 'ios' : 'android',
  });
}

// Firebase replaces the token from time to time.
messaging.onTokenRefresh.listen((token) {
  api.post('/devices', {
    'token': token,
    'platform': Platform.isIOS ? 'ios' : 'android',
  });
});
```

Run this after every sign-in, and at app start when a session is restored. It
is safe to repeat.

### 7. At sign-out: remove the token

Do this **before** calling `POST /auth/logout`, while the access token still
works:

```dart
final token = await FirebaseMessaging.instance.getToken();
if (token != null) {
  await api.delete('/devices/${Uri.encodeComponent(token)}');
}
```

Otherwise the handset keeps receiving the previous user's pushes.

### 8. React to pushes

```dart
// App open and on screen: the system shows nothing, so update the UI yourself.
FirebaseMessaging.onMessage.listen((message) {
  refreshNotifications();                     // refetch GET /notifications
  showInAppBanner(message.notification?.title, message.notification?.body);
});

// User tapped a push while the app was in the background.
FirebaseMessaging.onMessageOpenedApp.listen(openFromPush);

// User tapped a push that launched the app from closed.
final initial = await FirebaseMessaging.instance.getInitialMessage();
if (initial != null) openFromPush(initial);
```

When the app is in the background or closed, the system tray shows the push by
itself; no code is needed for that.

Where a tap should lead (`message.data['type']`):

| `type` | Open |
|---|---|
| `trip_assigned`, `trip_ready` | The trip, `data['tripId']` |
| `route_changed` | The route update screen for `data['tripId']` (it must be acknowledged) |
| `issue_acknowledged`, `issue_resolved` | The issue, `data['issueId']` |
| anything else | The notifications screen |

### 9. Feed the notifications screen

Replace `MockNotificationsRepository` with one that calls
`GET /notifications`. Map `type` to the card's icon and `severity` to its
colours. Call `POST /notifications/:id/read` when a card is opened, and use
`unreadCount` for the badge. Refresh when the app opens, on pull-to-refresh and
on every push.

### 10. Test it

1. Sign in on a real device and confirm a row appears in `user_devices`.
2. In the Firebase console → Messaging → *Send test message*, paste the token.
   The push should arrive. This proves the app side.
3. With the server key set (next section), trigger a real case: reorder a
   trip's stops as the dispatcher, and the trip's driver should get
   `route_changed` both as a push and in the list.

## Server setup

1. Firebase console → Project settings → Service accounts → **Generate new
   private key**. Save the JSON file on the server, outside git.
2. Set its path in `api/.env`:

   ```
   FIREBASE_SERVICE_ACCOUNT=/absolute/path/to/firebase-service-account.json
   NOTIFICATION_QUEUE=notification_queue
   ```

3. Restart the API.

Without `FIREBASE_SERVICE_ACCOUNT` the API runs normally and notifications are
still stored and listed; each push is only written to the log as
`[PUSH DEV] ...`.

RabbitMQ must be running (the `rabbitmq` service in `docker-compose.yml`). The
`notifications` and `user_devices` tables are created by the schema sync.

## How it works inside

```
service (planning, orders, trips, issues)
   └─ notificationsService.notify([...])     not awaited, never throws
        ├─ resolve recipients (ids, or dispatchers / loaders / store managers)
        ├─ insert one `notifications` row per recipient
        └─ publish one job to `notification_queue`
                 └─ NotificationsConsumer
                      ├─ load the recipients' device tokens
                      ├─ send through FCM (PushService)
                      └─ delete tokens FCM reports as gone
```

- The request that caused the notification does not wait for any of this.
- A push that fails is logged and dropped; the stored row is still there for
  the app to list.

| File | Role |
|---|---|
| `notification.catalog.ts` | All wording: one builder per type |
| `notifications.service.ts` | `notify`, `push`, list, read, devices |
| `notifications.controller.ts` | The five routes |
| `notifications.consumer.ts` | Reads the queue and sends pushes |
| `push.service.ts` | The Firebase client |
| `src/database/entities/notification.entity.ts`, `user-device.entity.ts` | The two tables |

## Adding a new notification

1. Add a member to `NotificationType` (`src/common/enums/`).
2. Add a builder to `notice` in `notification.catalog.ts` that returns the
   type, severity, title, body and `data`.
3. In the service where the change happens, after its write is saved and only
   on the branch where the state really changes:

   ```ts
   void this.notificationsService.notify([
     { to: { userIds: [trip.driverId] }, ...notice.tripReady(trip) },
   ]);
   ```

   `to` takes `userIds`, `dispatchers: true`, `loadersOfDepot: <depotId>` or
   `storeManagersOfOutlets: [<outletId>]`, in any combination.
4. Import `NotificationsModule` in that feature's module if it is not there
   yet.
5. Add the type to the tables in this file and in
   `mobile/driver_app/API_README.md`.

## Limits and known issues

- **The driver app's updates screen is not wired yet**; it still shows fixture
  data. The web app is wired: the dispatcher's panel and the store manager's
  bell read this API (`web/src/features/notifications/`).
- **The web app polls.** It refetches every minute and when the panel opens, so
  a new notification can show up to a minute late.
- **No web or browser push, and no SMS.** Dispatchers and store managers on the
  web see notifications only in the list.
- **`createdAt` in responses comes from the `sent_at` column**, which has a
  time zone. The inherited `created_at` has none and reads back 5 h 30 min
  early, as it does on every table; do not use it for display.
- **No per-user mute settings.**
- **Nothing is deleted.** Old notifications stay in the table.
- **Not covered:** late departure, an unacknowledged route change, a cancelled
  trip. The first two need a timed check; nothing in the API cancels a trip
  yet.
- **One push call reaches at most 500 handsets.** No notification targets that
  many today.
