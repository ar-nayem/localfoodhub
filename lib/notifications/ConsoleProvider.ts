import { prisma } from "../prisma";
import type { NotificationInput, NotificationProvider } from "./NotificationService";

// TODO(real delivery): implement NotificationProvider against push/SMS/email/WhatsApp and
// swap the export below. This provider always persists to the Notification table (so the
// in-app list works now) and additionally console.logs — a clearly-labeled stand-in for
// actual delivery, not a pretend-connected integration.
class ConsoleNotificationProvider implements NotificationProvider {
  async send(input: NotificationInput): Promise<void> {
    await prisma.notification.create({ data: input });
    // eslint-disable-next-line no-console
    console.log(`[notify:${input.type}] -> user ${input.userId}: ${input.title}`);
  }
}

export const notificationService: NotificationProvider = new ConsoleNotificationProvider();
