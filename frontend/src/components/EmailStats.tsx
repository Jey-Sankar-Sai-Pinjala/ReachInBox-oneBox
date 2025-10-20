import React, { useState, useEffect } from 'react';

interface EmailStats {
  totalEmails: number;
  byCategory: Record<string, number>;
  byAccount: Record<string, number>;
  recentActivity: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
}

const EmailStats: React.FC = () => {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/emails/stats');
      const data = await response.json();
      setStats(data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Unable to load stats</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Email Statistics</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Total Emails</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalEmails}</p>
        </div>

        <div>
          <h3 className="font-medium text-gray-700 mb-2">By Category</h3>
          <div className="space-y-1">
            {Object.entries(stats.byCategory).map(([category, count]) => (
              <div key={category} className="flex justify-between text-sm">
                <span className="text-gray-600">{category}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-medium text-gray-700 mb-2">Recent Activity</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Last 24h</span>
              <span className="font-medium">{stats.recentActivity.last24Hours}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last 7 days</span>
              <span className="font-medium">{stats.recentActivity.last7Days}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last 30 days</span>
              <span className="font-medium">{stats.recentActivity.last30Days}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailStats;

