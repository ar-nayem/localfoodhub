import nodemailer, { type Transporter } from "nodemailer";
import { brand } from "@/lib/brand";
import type { OtpDelivery, OtpDeliveryProvider } from "./OtpDeliveryService";

/**
 * Email delivery over plain SMTP — deliberately not tied to one vendor, because every
 * realistic free option (Brevo, Gmail app passwords, Resend, Mailgun) speaks SMTP. Moving
 * between them is an env-var change, not a code change.
 *
 * SMS is a different transport entirely and this provider cannot do it: a PHONE code falls
 * through to the console (see ./provider.ts) rather than being silently dropped, so it's
 * obvious that channel still needs a gateway wired up.
 */
export class SmtpOtpProvider implements OtpDeliveryProvider {
  readonly name = "smtp";
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    const port = Number(process.env.SMTP_PORT || 587);
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // 465 is implicit TLS; 587 starts plaintext and upgrades via STARTTLS.
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
    return this.transporter;
  }

  async send({ channel, destination, code, expiresInMinutes }: OtpDelivery): Promise<void> {
    if (channel !== "EMAIL") {
      throw new Error("SmtpOtpProvider only sends email; a PHONE code needs an SMS gateway");
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "";
    await this.getTransporter().sendMail({
      from: from.includes("<") ? from : `${brand.name} <${from}>`,
      to: destination,
      subject: `${code} is your ${brand.name} sign-in code`,
      text:
        `Your ${brand.name} sign-in code is ${code}.\n\n` +
        `It expires in ${expiresInMinutes} minutes. If you didn't ask to sign in, ignore this email.`,
      html:
        `<p>Your ${brand.name} sign-in code is:</p>` +
        `<p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>` +
        `<p style="color:#666">It expires in ${expiresInMinutes} minutes. ` +
        `If you didn't ask to sign in, you can ignore this email.</p>`,
    });
  }
}
