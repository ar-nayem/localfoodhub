export type OtpChannel = "EMAIL" | "PHONE";

export interface OtpDelivery {
  channel: OtpChannel;
  /** Normalized email address or phone number. */
  destination: string;
  code: string;
  /** Minutes until the code stops working — providers put this in the message body. */
  expiresInMinutes: number;
}

/**
 * Sending an OTP is one method, deliberately — swapping the console provider for real
 * email (SMTP) or SMS (Twilio, or a local gateway) means implementing this and changing
 * the export in ./provider.ts, nothing else. Same shape as PaymentService and
 * NotificationService elsewhere in this app.
 *
 * Implementations must never return the code to the caller: the only path a code should
 * take out of the server is the channel it was sent on. An API response carrying the code
 * would make the whole flow decorative — anyone could request a code for any account and
 * read it straight back.
 */
export interface OtpDeliveryProvider {
  readonly name: string;
  send(delivery: OtpDelivery): Promise<void>;
}
