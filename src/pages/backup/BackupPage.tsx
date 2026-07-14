import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Backup } from '../../lib/types';
import { formatDate } from '../../lib/utils';
import { Database, Download, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function BackupPage() {
  const { user, profile } = useAuth();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from('backups').select('*').order('created_at', { ascending: false });
    setBackups(data ?? []);
    setLoading(false);
  }

  async function createBackup() {
    setCreating(true);
    const { data: tables } = await supabase.rpc('pg_catalog.pg_tables' as any);

    const tables_to_backup = ['clients', 'personal_details', 'passport_details', 'company_details', 'work_details', 'remarks', 'documents', 'invoices', 'invoice_items', 'email_logs'];
    const backupData: Record<string, any[]> = {};

    for (const table of tables_to_backup) {
      const { data } = await (supabase.from(table as any) as any).select('*');
      backupData[table] = data ?? [];
    }

    const json = JSON.stringify(backupData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const fileName = `vigo-backup-${new Date().toISOString().split('T')[0]}.json`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    const { data: backup } = await supabase.from('backups').insert({
      type: 'manual',
      file_name: fileName,
      status: 'completed',
      triggered_by: user?.id,
    }).select().single();

    if (backup) setBackups(prev => [backup, ...prev]);
    setCreating(false);
  }

  const statusIcon = (s: string) => {
    if (s === 'completed') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (s === 'failed') return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Backup & Data</h1>
        <p className="text-slate-500 text-sm mt-0.5">Download a full JSON export of all client data</p>
      </div>

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6 flex gap-4">
        <Database className="w-8 h-8 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-blue-900 mb-1">About Backups</h3>
          <p className="text-sm text-blue-700">Backups export all client records, invoices, remarks, and email logs as a JSON file downloaded to your computer. Store copies in a secure location. For automated monthly backups, a scheduled task can be configured on the server.</p>
        </div>
      </div>

      {/* Create backup */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">Manual Backup</h2>
            <p className="text-sm text-slate-500 mt-0.5">Download all data as a JSON file now</p>
          </div>
          <button
            onClick={createBackup}
            disabled={creating}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {creating ? 'Exporting...' : 'Create Backup'}
          </button>
        </div>
      </div>

      {/* Backup log */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Backup History</h2>
        </div>
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading...</div>
        ) : backups.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No backups yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-left font-medium text-slate-600">Date</th>
                <th className="px-5 py-3 text-left font-medium text-slate-600">File</th>
                <th className="px-5 py-3 text-left font-medium text-slate-600">Type</th>
                <th className="px-5 py-3 text-left font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {backups.map(b => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5 text-slate-700">{new Date(b.created_at).toLocaleString('en-IE')}</td>
                  <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">{b.file_name ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.type === 'scheduled' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{b.type}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {statusIcon(b.status)}
                      <span className="text-slate-700 capitalize">{b.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
