export interface MfaStatus {
  enabled: boolean;
  unusedRecoveryCodes: number;
}

export interface MfaSetup {
  secret: string;
  otpAuthUri: string;
  qrCodeDataUri: string;
  expiresAt: string;
}

export interface MfaRecoveryCodes {
  recoveryCodes: string[];
}

export interface MfaProtectedAction {
  password: string;
  code: string;
}
