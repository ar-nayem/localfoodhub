import type { OtpDelivery, OtpDeliveryProvider } from "./OtpDeliveryService";
import { SmtpOtpProvider } from "./SmtpOtpProvider";

/**
 * Writes the code to the server log and nowhere else.
 *
 * Not a stub that pretends to work — it genuinely delivers the code to the one place the
 * server operator can read it (`pm2 logs localfoodhub`), which is enough to exercise the
 * whole sign-in flow. What it does not do is reach a customer's inbox or handset, so it
 * says so on every line rather than looking like a successful send.
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

/**
 * Routes each channel to whatever is actually configured for it, so email can go live
 * without waiting on an SMS gateway. Anything with no real transport falls back to the
 * console rather than failing sign-in — a code the operator can still read beats a dead
 * end, and the log line makes the gap obvious.
 */
class ChannelRoutingProvider implements OtpDeliveryProvider {
  readonly name: string;
  private console = new ConsoleOtpProvider();
  private smtp: SmtpOtpProvider | null;

  constructor() {
    this.smtp = process.env.SMTP_HOST ? new SmtpOtpProvider() : null;
    this.name = this.smtp ? "smtp+console" : "console";
  }

  async send(delivery: OtpDelivery): Promise<void> {
    if (delivery.channel === "EMAIL" && this.smtp) {
      await this.smtp.send(delivery);
      return;
    }
    await this.console.send(delivery);
  }
}

/** Add an SMS implementation to ChannelRoutingProvider to turn phone codes on. */
export const otpProvider: OtpDeliveryProvider = new ChannelRoutingProvider();

export type { OtpDelivery, OtpDeliveryProvider };
