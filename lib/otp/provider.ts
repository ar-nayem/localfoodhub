import type { OtpDelivery, OtpDeliveryProvider } from "./OtpDeliveryService";

/**
 * The default provider: writes the code to the server log and nowhere else.
 *
 * This is not a stub that pretends to work — it genuinely delivers the code to the one
 * place the server operator can read it (`pm2 logs localfoodhub`), which is enough to
 * exercise the entire sign-in flow end to end. What it does not do is reach a customer's
 * inbox or handset; that needs real credentials, so it stays an explicit gap rather than
 * a fake success.
 */
export class ConsoleOtpProvider implements OtpDeliveryProvider {
  readonly name = "console";

  async send({ channel, destination, code, expiresInMinutes }: OtpDelivery): Promise<void> {
    console.info(
      `[otp] ${channel} code for ${destination}: ${code} (valid ${expiresInMinutes} min) — ` +
        `console provider: not actually sent to the customer.`
    );
  }
}

/** Swap this for an SMTP/SMS implementation to turn real delivery on. */
export const otpProvider: OtpDeliveryProvider = new ConsoleOtpProvider();

export type { OtpDelivery, OtpDeliveryProvider };
