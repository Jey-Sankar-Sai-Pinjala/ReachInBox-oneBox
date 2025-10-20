import React, { useState, useEffect } from 'react';
import './styles/index.css';
import EmailList from './components/EmailList';
import FilterBar from './components/FilterBar';
import SearchBar from './components/SearchBar';
import EmailStats from './components/EmailStats';
import Pagination from './components/Pagination';
import { EmailDocument } from './api/emailApi';

const App: React.FC = () => {
  const [emails, setEmails] = useState<EmailDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    query: '',
    account: '',
    folder: '',
    category: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalResults: 0,
    pageSize: 20
  });
  const [suggestedReply, setSuggestedReply] = useState<{
    emailId: string;
    reply: string;
    loading: boolean;
  } | null>(null);

  const fetchEmails = async (page: number = pagination.currentPage) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: pagination.pageSize.toString(),
        ...(filters.query && { q: filters.query }),
        ...(filters.account && { account: filters.account }),
        ...(filters.folder && { folder: filters.folder }),
        ...(filters.category && { category: filters.category })
      });

      const response = await fetch(`http://localhost:3001/api/emails/search?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }
      
      const data = await response.json();
      setEmails(data.data.hits || []);
      
      // Update pagination info from response
      if (data.meta?.query?.pagination) {
        setPagination(prev => ({
          ...prev,
          currentPage: data.meta.query.pagination.page,
          totalPages: data.meta.query.pagination.totalPages,
          totalResults: data.meta.query.pagination.totalResults
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleSearch = async (searchQuery: string) => {
    setFilters(prev => ({ ...prev, query: searchQuery }));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page on search
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        page: '1',
        size: pagination.pageSize.toString(),
        ...(filters.account && { account: filters.account }),
        ...(filters.folder && { folder: filters.folder }),
        ...(filters.category && { category: filters.category })
      });
      
      const response = await fetch(`http://localhost:3001/api/emails/search?${params}`);
      const data = await response.json();
      setEmails(data.data.hits || []);
      
      // Update pagination info from response
      if (data.meta?.query?.pagination) {
        setPagination(prev => ({
          ...prev,
          currentPage: data.meta.query.pagination.page,
          totalPages: data.meta.query.pagination.totalPages,
          totalResults: data.meta.query.pagination.totalResults
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
    fetchEmails(page);
  };

  const handleSuggestReply = async (emailId: string) => {
    setSuggestedReply({ emailId, reply: '', loading: true });
    
    try {
      const response = await fetch(`http://localhost:3001/api/emails/${emailId}/suggest-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get reply suggestion');
      }
      
      const data = await response.json();
      setSuggestedReply({
        emailId,
        reply: data.data.suggestedReply,
        loading: false
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get reply suggestion');
      setSuggestedReply(null);
    }
  };

  const closeSuggestedReply = () => {
    setSuggestedReply(null);
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ReachInbox Onebox</h1>
              <p className="text-sm text-gray-600">AI-powered email management</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => fetchEmails()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Filters</h2>
              <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onApplyFilters={() => {
                  setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page on filter
                  handleSearch(filters.query);
                }}
              />
            </div>
            
            <div className="mt-6">
              <EmailStats />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <SearchBar
                  onSearch={handleSearch}
                  loading={loading}
                />
              </div>
              
              <div className="p-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}
                
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {emails.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No emails found</p>
                        </div>
                      ) : (
                        emails.map((email) => (
                          <div key={email.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
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
                                <button 
                                  onClick={() => handleSuggestReply(email.id)}
                                  className="text-green-600 hover:text-green-800 text-sm"
                                >
                                  Suggest Reply
                                </button>
                              </div>
                              <span className="text-xs text-gray-500">
                                {email.hasAttachments && `📎 ${email.attachmentCount} attachment(s)`}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Pagination */}
                    {emails.length > 0 && (
                      <Pagination
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        totalResults={pagination.totalResults}
                        pageSize={pagination.pageSize}
                        onPageChange={handlePageChange}
                        loading={loading}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Suggested Reply Modal */}
      {suggestedReply && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">AI Suggested Reply</h3>
                <button
                  onClick={closeSuggestedReply}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {suggestedReply.loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <span className="ml-3 text-gray-600">Generating AI reply...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Suggested Reply:</h4>
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {suggestedReply.reply}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={closeSuggestedReply}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(suggestedReply.reply);
                        alert('Reply copied to clipboard!');
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Copy Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

