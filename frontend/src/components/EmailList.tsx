import React from 'react';
import { EmailDocument } from '../api/emailApi';

interface EmailListProps {
  emails: EmailDocument[];
  loading: boolean;
  onEmailClick: (email: EmailDocument) => void;
}

const EmailList: React.FC<EmailListProps> = ({ emails, loading, onEmailClick }) => {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Interested': 'bg-green-100 text-green-800',
      'Meeting Booked': 'bg-blue-100 text-blue-800',
      'Not Interested': 'bg-red-100 text-red-800',
      'Spam': 'bg-gray-100 text-gray-800',
      'Out of Office': 'bg-yellow-100 text-yellow-800',
      'Uncategorized': 'bg-gray-100 text-gray-600'
    };
    return colors[category] || colors['Uncategorized'];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No emails found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {emails.map((email) => (
        <div
          key={email.id}
          className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onEmailClick(email)}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-900">{email.subject}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(email.aiCategory)}`}>
              {email.aiCategory}
            </span>
          </div>
          
          <div className="text-sm text-gray-600 mb-2">
            <p><strong>From:</strong> {email.from}</p>
            <p><strong>Date:</strong> {new Date(email.date).toLocaleString()}</p>
            <p><strong>Account:</strong> {email.accountId}</p>
          </div>
          
          <p className="text-gray-700 text-sm mb-3">
            {email.body.substring(0, 200)}{email.body.length > 200 ? '...' : ''}
          </p>
          
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <button className="text-blue-600 hover:text-blue-800 text-sm">
                View Details
              </button>
              <button className="text-green-600 hover:text-green-800 text-sm">
                Suggest Reply
              </button>
            </div>
            <span className="text-xs text-gray-500">
              {email.hasAttachments && `📎 ${email.attachmentCount} attachment(s)`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmailList;

