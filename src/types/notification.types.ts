export enum NotificationType {
  APPROVAL_REQUESTED = 'APPROVAL_REQUESTED',
  APPROVAL_GRANTED = 'APPROVAL_GRANTED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  BUDGET_ALERT_80 = 'BUDGET_ALERT_80',
  BUDGET_ALERT_100 = 'BUDGET_ALERT_100',
  AGREEMENT_EXPIRING = 'AGREEMENT_EXPIRING',
  // `Z57` / `T-317` (backend migration 1816000000000) — `K-2.2.7a`
  // `FINANCE_REVIEW` kademesi (%90). Backend `NotificationType` ile birebir.
  BUDGET_FINANCE_REVIEW = 'BUDGET_FINANCE_REVIEW',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
  SMS = 'SMS',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  READ = 'READ',
}

export interface Notification {
  id: string;
  tenantId: string;
  type: NotificationType;
  recipientId: string;
  recipientEmail: string;
  recipientName?: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  status: NotificationStatus;
  subject: string;
  body: string;
  metadata?: {
    agreementId?: string;
    agreementName?: string;
    budgetEnvelopeId?: string;
    budgetEnvelopeName?: string;
    approverId?: string;
    approverName?: string;
    requesterId?: string;
    requesterName?: string;
    amount?: number;
    [key: string]: any;
  };
  sentAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
