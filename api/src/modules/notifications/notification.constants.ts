export const NOTIFICATION_CLIENT = 'NOTIFICATION_CLIENT';
export const NOTIFICATION_PUSH_PATTERN = 'notification.push';

/** One push, to every handset of some users. FCM takes string values only. */
export interface PushMessage {
  userIds: number[];
  title: string;
  body: string;
  data: Record<string, string>;
}

/** The pushes that follow one `NotificationsService.notify` call. */
export interface PushJob {
  messages: PushMessage[];
}
