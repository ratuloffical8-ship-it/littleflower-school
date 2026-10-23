// server/src/services/notifications.ts

/**
 * ⚠️ STUB: SMS / EMAIL NOTIFICATIONS ARE NOT IMPLEMENTED IN VERSION 1.
 *
 * This file only defines the interface so a future phase can plug in a real SMS gateway
 * or email provider without touching the routes. Nothing is sent today: every call returns
 * { sent: false }. Do NOT tell parents or staff that they will receive SMS/email messages.
 *
 * To implement later: create a class that implements NotificationService, then call
 * registerNotificationService(new YourProvider()) once at startup (src/index.ts).
 */

export interface SmsMessage {
  /** Recipient mobile number in a normalised format */
  to: string;
  text: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface NotificationResult {
  sent: boolean;
  provider: string;
  reason?: string;
}

export interface NotificationService {
  sendSms(message: SmsMessage): Promise<NotificationResult>;
  sendEmail(message: EmailMessage): Promise<NotificationResult>;
}

/** Default implementation: does nothing. Logs no recipient data. */
class NoopNotificationService implements NotificationService {
  sendSms(): Promise<NotificationResult> {
    return Promise.resolve({ sent: false, provider: 'none', reason: 'not_implemented_in_v1' });
  }

  sendEmail(): Promise<NotificationResult> {
    return Promise.resolve({ sent: false, provider: 'none', reason: 'not_implemented_in_v1' });
  }
}

let activeService: NotificationService = new NoopNotificationService();

export function registerNotificationService(service: NotificationService): void {
  activeService = service;
}

export const notifications: NotificationService = {
  sendSms: (message) => activeService.sendSms(message),
  sendEmail: (message) => activeService.sendEmail(message),
};
