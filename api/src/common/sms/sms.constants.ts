export const SMS_CLIENT = 'SMS_CLIENT';
export const SMS_SEND_PATTERN = 'sms.send';

/** Message published to the SMS queue; `recipient` is already normalized. */
export interface SmsJob {
  recipient: string;
  message: string;
}
