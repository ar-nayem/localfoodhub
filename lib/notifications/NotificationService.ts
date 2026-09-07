// Provider-independent notification abstraction (spec Section 67). Real delivery (push /
// SMS / email / WhatsApp) is deferred for this pass — see plan's "explicitly deferred"
// list — but every call site already goes through this interface so wiring a real
// provider later is additive, not a rewrite. Every notification is also persisted via
// `notify()` so the in-app Notifications list (spec Section 20) works today even without
// a push/SMS/email backend.

export interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
}

export interface NotificationProvider {
  send(input: NotificationInput): Promise<void>;
}
