export interface EmailRequest {
  to: string;
  subject: string;
  message: string;
}

export interface EmailEvent {
  type: 'GENERIC' | 'PASSWORD_RESET_REQUESTED' | 'PASSWORD_RESET_CONFIRMED';
  status: 'QUEUED' | 'SENT_TO_SMTP_SINK' | 'FAILED';
  recipientMasked: string;
  createdAt: string;
  updatedAt: string;
  failureReason: string | null;
}
