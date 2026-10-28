import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Shield, Users, AlertTriangle, FileText, CheckCircle, Ban, RefreshCw } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'logs'>('users');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = () => {
    setIsLoading(true);
    Promise.all([api.getAdminUsers(), api.getAdminReports(), api.getAuditLogs()])
      .then(([usersRes, reportsRes, logsRes]) => {
        setUsers(usersRes || []);
        setReports(reportsRes || []);
        setAuditLogs(logsRes || []);
      })
      .catch((err) => {
        console.error('Failed to load admin data:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleSuspend = async (userId: string, currentSuspended: boolean) => {
    const reason = prompt(
      currentSuspended
        ? 'Enter reason for reactivating this user account:'
        : 'Enter justification for suspending this student user:',
      currentSuspended ? 'Account review completed' : 'Violation of campus marketplace policy',
    );

    if (!reason) return;

    try {
      await api.setAdminUserSuspension(userId, !currentSuspended, reason);
      loadData();
    } catch (err) {
      alert('Failed to update user suspension status');
    }
  };

  const handleModerate = async (listingId: string, action: 'SUSPEND' | 'APPROVE') => {
    const notes = prompt(`Enter resolution notes for listing ${action}:`, 'Reviewed by administrator');
    if (!notes) return;

    try {
      await api.moderateListing(listingId, action, notes);
      loadData();
    } catch (err) {
      alert('Failed to moderate listing');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Moderation Console</h1>
            <p className="text-sm text-gray-500">Oversee university users, moderate reported listings, and inspect audit logs</p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'users'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users & Suspension ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center space-x-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'reports'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Listing Reports ({reports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center space-x-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'logs'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Immutable Audit Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Activity</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="p-4 flex items-center space-x-3">
                    <img
                      src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}`}
                      alt=""
                      className="w-8 h-8 rounded-full border border-gray-200"
                    />
                    <div>
                      <div className="font-bold text-gray-900">{u.fullName}</div>
                      <div className="text-gray-400 text-[11px]">{u.email}</div>
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-gray-800">{u.role}</td>
                  <td className="p-4">
                    {u._count?.listings || 0} Listings, {u._count?.bids || 0} Bids
                  </td>
                  <td className="p-4">
                    {u.isSuspended ? (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase bg-red-100 text-red-700 rounded-full">
                        Suspended
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 rounded-full">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleToggleSuspend(u.id, u.isSuspended)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                        u.isSuspended
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {u.isSuspended ? 'Reactivate' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6">
          {reports.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {reports.map((r) => (
                <div key={r.id} className="py-4 flex items-center justify-between">
                  <div>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-100 text-amber-800 rounded">
                      {r.reason}
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 mt-1">{r.listing?.title}</h4>
                    <p className="text-xs text-gray-500">{r.details || 'No additional notes provided'}</p>
                    <span className="text-[10px] text-gray-400">Reported by {r.reporter?.fullName}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleModerate(r.listingId, 'SUSPEND')}
                      className="px-3 py-1.5 bg-red-600 text-white font-bold text-xs rounded-lg hover:bg-red-700"
                    >
                      Freeze Listing
                    </button>
                    <button
                      onClick={() => handleModerate(r.listingId, 'APPROVE')}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-200"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-10">No pending reports filed</p>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6">
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-gray-50 rounded-xl text-xs font-mono flex items-start justify-between">
                <div>
                  <span className="text-emerald-700 font-bold">[{log.action}]</span>{' '}
                  <span className="text-gray-900 font-semibold">{log.entityType} ({log.entityId})</span>
                  <p className="text-[11px] text-gray-500 mt-1 font-sans">
                    Actor: {log.actor?.fullName || 'System'} • {JSON.stringify(log.payload)}
                  </p>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0 ml-4">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
