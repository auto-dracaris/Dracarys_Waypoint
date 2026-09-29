import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatPhoneNumber } from '../utils/phone.util';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendSms(recipient: string, message: string): Promise<boolean> {
    const formattedRecipient = formatPhoneNumber(recipient);
    const apiUrl = this.configService.get<string>(
      'SMS_API_URL',
      'https://dashboard.smsapi.lk/api/v3/sms/send',
    );
    const apiKey = this.configService.get<string>('SMS_API_KEY', '');
    const senderId = this.configService.get<string>(
      'SMS_SENDER_ID',
      'SMSAPI Demo',
    );

    // If no API key configured or running in development/test, log the message
    if (!apiKey) {
      this.logger.warn(
        `[SMS DEV] SMS_API_KEY not set. Mock sending SMS to ${formattedRecipient}: "${message}"`,
      );
      return true;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          recipient: formattedRecipient,
          sender_id: senderId,
          type: 'plain',
          message,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `Failed to send SMS to ${formattedRecipient}: HTTP ${response.status} - ${errorBody}`,
        );
        return false;
      }

      this.logger.log(`SMS successfully dispatched to ${formattedRecipient}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Error sending SMS to ${formattedRecipient}: ${error?.message || error}`,
        error?.stack,
      );
      return false;
    }
  }
}
