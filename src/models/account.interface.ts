export interface Account {
  id: string;
  email: string;
  host: string;
  port: number;
  ssl: boolean;
  connected: boolean;
  lastSync?: Date;
  totalEmails?: number;
  folders: string[];
}

export interface AccountStatus {
  id: string;
  email: string;
  connected: boolean;
  lastSync: Date | null;
  totalEmails: number;
  newEmails: number;
  error?: string;
}

export interface IMAPConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
  tlsOptions?: {
    rejectUnauthorized: boolean;
  };
}

