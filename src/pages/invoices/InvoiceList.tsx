import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Invoice } from '../../lib/types';
import { INVOICE_STATUS_COLORS, INVOICE_STATUSES, formatDate, formatCurrency } from '../../lib/utils';
import { Plus, Search, FileText, X } from 'lucide-react';

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('invoices')
        .select('*, clients(personal_details(first_name, last_name), reg_no)')
        .order('created_at', { ascending: false });
      setInvoices(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = invoices.filter(inv => {
    const client = (inv as any).clients;
    const pd = client?.personal_details;
    const name = pd ? `${pd.first_name} ${pd.last_name}` : '';
    const matchSearch = !search || inv.invoice_no.toLowerCase().includes(search.toLowerCase()) || name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totals = {
    total: filtered.reduce((s, i) => s + Number(i.total), 0),
    paid: filtered.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.total), 0),
    outstanding: filtered.filter(i => ['Sent', 'Overdue'].includes(i.status)).reduce((s, i) => s + Number(i.total), 0),
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/invoices/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Invoice
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Invoiced</p>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(totals.total)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Collected (Paid)</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(totals.paid)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Outstanding</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(totals.outstanding)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice no. or client..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700">
          <option value="">All Statuses</option>
          {INVOICE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); }} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm px-2">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No invoices found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Invoice No.</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Client</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Issue Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Due Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(inv => {
                  const client = (inv as any).clients;
                  const pd = client?.personal_details;
                  const name = pd ? `${pd.first_name} ${pd.last_name}` : '—';
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">{inv.invoice_no}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-800">{name}</p>
                        <p className="text-xs text-slate-400">{client?.reg_no}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{formatDate(inv.issue_date)}</td>
                      <td className="px-4 py-3.5 text-slate-600">{formatDate(inv.due_date)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${INVOICE_STATUS_COLORS[inv.status]}`}>{inv.status}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-800">{formatCurrency(Number(inv.total))}</td>
                      <td className="px-4 py-3.5">
                        <Link to={`/invoices/${inv.id}`} className="text-blue-600 hover:text-blue-700 text-xs font-medium">View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
