import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import type { PushMessage } from './notification.constants';

// What FCM answers for a token whose app was uninstalled or re-registered.
const GONE = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/** Sends pushes to handsets through Firebase Cloud Messaging. */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  // undefined until first use; null when Firebase is not configured.
  private messaging?: Messaging | null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Sends one message to some handsets and returns the tokens FCM no longer
   * knows, for the caller to forget.
   */
  async send(
    tokens: string[],
    message: Omit<PushMessage, 'userIds'>,
  ): Promise<string[]> {
    const messaging = this.client();
    // Without a Firebase key (development), log the push instead.
    if (!messaging) {
      this.logger.warn(
        `[PUSH DEV] FIREBASE_SERVICE_ACCOUNT not set. Mock push to ${tokens.length} device(s): "${message.title}"`,
      );
      return [];
    }

    // ponytail: FCM takes at most 500 tokens a call. No notice reaches that
    // many handsets today; send in chunks if one ever does.
    const { responses } = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: message.title, body: message.body },
      data: message.data,
    });
    return responses.flatMap((response, i) =>
      !response.success && GONE.has(response.error?.code ?? '')
        ? [tokens[i]]
        : [],
    );
  }

  /**
   * The Firebase project, read when it is first needed rather than at
   * startup, so the API runs without one; only pushes are unavailable.
   */
  private client(): Messaging | null {
    if (this.messaging === undefined) {
      const keyFile = this.configService.get<string>(
        'FIREBASE_SERVICE_ACCOUNT',
      );
      this.messaging = keyFile
        ? getMessaging(initializeApp({ credential: cert(keyFile) }))
        : null;
    }
    return this.messaging;
  }
}
