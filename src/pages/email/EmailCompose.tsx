import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Client } from '../../lib/types';
import { Send, Mail, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function EmailCompose() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('clients').select('*, personal_details(first_name, last_name, email)').order('created_at', { ascending: false }).then(r => {
      const all = r.data ?? [];
      setClients(all);
      const preSelected = searchParams.get('clients');
      if (preSelected) {
        setSelectedClients(new Set(preSelected.split(',')));
      }
    });
    supabase.from('email_logs').select('*, clients(personal_details(first_name, last_name))').order('sent_at', { ascending: false }).limit(20).then(r => setLogs(r.data ?? []));
  }, []);

  function toggleClient(id: string) {
    setSelectedClients(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSend() {
    if (selectedClients.size === 0) { setError('Select at least one recipient.'); return; }
    if (!subject.trim()) { setError('Subject is required.'); return; }
    if (!body.trim()) { setError('Message body is required.'); return; }
    setSending(true);
    setError('');

    const targets = clients.filter(c => selectedClients.has(c.id));
    const logs = targets.map(c => {
      const pd = (c as any).personal_details;
      return {
        client_id: c.id,
        to_email: pd?.email ?? '',
        subject: subject.replace('{{first_name}}', pd?.first_name ?? '').replace('{{reg_no}}', c.reg_no),
        body: body.replace('{{first_name}}', pd?.first_name ?? '').replace('{{reg_no}}', c.reg_no),
        status: pd?.email ? 'sent' : 'failed',
        sent_by: user?.id,
      };
    });

    await supabase.from('email_logs').insert(logs);
    setSuccess(`Email logged for ${targets.length} recipient${targets.length > 1 ? 's' : ''}. (Configure SendGrid/SMTP to deliver actual emails.)`);
    setSending(false);
    setSubject('');
    setBody('');
    setSelectedClients(new Set());
    supabase.from('email_logs').select('*, clients(personal_details(first_name, last_name))').order('sent_at', { ascending: false }).limit(20).then(r => setLogs(r.data ?? []));
  }

  const selectedList = clients.filter(c => selectedClients.has(c.id));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Email</h1>
        <p className="text-slate-500 text-sm mt-0.5">Compose and log emails to clients</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Compose */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Compose Email</h2>

            {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
            {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">{success}</div>}

            {/* Recipients */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Recipients</label>
              <div className="border border-slate-200 rounded-lg p-3 min-h-[44px]">
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedList.map(c => {
                    const pd = (c as any).personal_details;
                    const name = pd ? `${pd.first_name} ${pd.last_name}` : c.reg_no;
                    return (
                      <span key={c.id} className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        {name}
                        <button onClick={() => toggleClient(c.id)} className="hover:text-blue-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <button
                  onClick={() => setShowClientPicker(v => !v)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {showClientPicker ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {selectedClients.size === 0 ? 'Select recipients...' : 'Add more...'}
                </button>
                {showClientPicker && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50">
                    {clients.map(c => {
                      const pd = (c as any).personal_details;
                      const name = pd ? `${pd.first_name} ${pd.last_name}` : 'Unknown';
                      return (
                        <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={selectedClients.has(c.id)} onChange={() => toggleClient(c.id)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                          <div>
                            <p className="text-sm font-medium text-slate-800">{name}</p>
                            <p className="text-xs text-slate-400">{pd?.email ?? 'No email'} · {c.reg_no}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Subject</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Use {{first_name}} or {{reg_no}} for personalization"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Message</label>
              <textarea
                rows={8}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-700"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Dear {{first_name}},..."
              />
              <p className="text-xs text-slate-400 mt-1">Variables: <code className="bg-slate-100 px-1 rounded">{'{{first_name}}'}</code> <code className="bg-slate-100 px-1 rounded">{'{{reg_no}}'}</code></p>
            </div>

            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {sending ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> : <Send className="w-4 h-4" />}
              Send to {selectedClients.size} recipient{selectedClients.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>

        {/* Log */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-500" /> Recent Emails
          </h2>
          {logs.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No emails sent yet.</p>}
          <div className="space-y-3">
            {logs.map(log => {
              const cpd = (log as any).clients?.personal_details;
              const cname = cpd ? `${cpd.first_name} ${cpd.last_name}` : log.to_email;
              return (
                <div key={log.id} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800 truncate">{log.subject}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${log.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{log.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{cname} · {new Date(log.sent_at).toLocaleString('en-IE')}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
