export interface EmailDocument {
  id: string;
  accountId: string;
  folder: string;
  subject: string;
  body: string;
  from: string;
  to: string[];
  date: string;
  aiCategory: string;
  indexedAt: string;
  messageId: string;
  threadId?: string;
  hasAttachments: boolean;
  attachmentCount: number;
}

export interface EmailSearchResult {
  hits: EmailDocument[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface EmailSearchQuery {
  query?: string;
  account?: string;
  folder?: string;
  category?: string;
  from?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}

const API_BASE_URL = 'http://localhost:3001';

export const searchEmails = async (query: EmailSearchQuery): Promise<EmailSearchResult> => {
  const params = new URLSearchParams();
  
  if (query.query) params.append('q', query.query);
  if (query.account) params.append('account', query.account);
  if (query.folder) params.append('folder', query.folder);
  if (query.category) params.append('category', query.category);
  if (query.from) params.append('from', query.from);
  if (query.dateFrom) params.append('dateFrom', query.dateFrom);
  if (query.dateTo) params.append('dateTo', query.dateTo);
  if (query.page) params.append('page', query.page.toString());
  if (query.size) params.append('size', query.size.toString());

  const response = await fetch(`${API_BASE_URL}/api/emails?${params}`);
  
  if (!response.ok) {
    throw new Error('Failed to search emails');
  }
  
  const data = await response.json();
  return data.data;
};

export const getEmailById = async (id: string): Promise<EmailDocument> => {
  const response = await fetch(`${API_BASE_URL}/api/emails/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to get email');
  }
  
  const data = await response.json();
  return data.data;
};

export const updateEmailCategory = async (id: string, category: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/emails/${id}/category`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ category })
  });
  
  if (!response.ok) {
    throw new Error('Failed to update email category');
  }
};

export const suggestReply = async (id: string): Promise<{ suggestedReply: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/emails/${id}/suggest-reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to get reply suggestion');
  }
  
  const data = await response.json();
  return data.data;
};

export const getEmailStats = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/emails/stats`);
  
  if (!response.ok) {
    throw new Error('Failed to get email stats');
  }
  
  const data = await response.json();
  return data.data;
};

