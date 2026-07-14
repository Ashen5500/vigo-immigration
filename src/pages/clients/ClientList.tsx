import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Client, Category, StaffProfile } from '../../lib/types';
import { STATUS_COLORS, CLIENT_STATUSES, formatDate } from '../../lib/utils';
import { Plus, Search, Filter, X, Mail, Download } from 'lucide-react';

export default function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchParams] = useSearchParams();

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(r => setCategories(r.data ?? []));
    supabase.from('staff_profiles').select('*').then(r => setStaff(r.data ?? []));
  }, []);

  const loadClients = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('clients')
      .select('*, personal_details(*), categories!clients_category_id_fkey(name), staff_profiles!clients_assigned_to_staff_fkey(full_name)')
      .order('created_at', { ascending: false });

    if (statusFilter) q = q.eq('status', statusFilter);
    if (categoryFilter) q = q.eq('category_id', categoryFilter);

    const { data } = await q;
    let result = data ?? [];

    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(c => {
        const pd = c.personal_details as any;
        return (
          c.reg_no.toLowerCase().includes(s) ||
          (pd && `${pd.first_name} ${pd.last_name}`.toLowerCase().includes(s)) ||
          (pd?.email ?? '').toLowerCase().includes(s)
        );
      });
    }

    setClients(result);
    setLoading(false);
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => { loadClients(); }, [loadClients]);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === clients.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(clients.map(c => c.id)));
    }
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
  }

  const hasFilters = search || statusFilter || categoryFilter;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 text-sm mt-0.5">{clients.length} record{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          to="/clients/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Client
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, reg no., email..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
        >
          <option value="">All Statuses</option>
          {CLIENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm px-2">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
        {selected.size > 0 && (
          <Link
            to={`/email?clients=${Array.from(selected).join(',')}`}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors ml-auto"
          >
            <Mail className="w-4 h-4" /> Email {selected.size} selected
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading...</div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-400 text-sm">No clients found.</p>
            {hasFilters && <button onClick={clearFilters} className="text-blue-600 text-sm mt-2 hover:underline">Clear filters</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === clients.length && clients.length > 0}
                      onChange={toggleAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Reg No.</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Client Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Assigned To</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map(client => {
                  const pd = client.personal_details as any;
                  const name = pd ? `${pd.first_name} ${pd.last_name}` : '—';
                  const sp = client.staff_profiles as any;
                  return (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selected.has(client.id)}
                          onChange={() => toggleSelect(client.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">{client.reg_no}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link to={`/clients/${client.id}`} className="font-medium text-slate-800 hover:text-blue-600 transition-colors">
                          {name}
                        </Link>
                        {pd?.email && <p className="text-xs text-slate-400 mt-0.5">{pd.email}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{(client as any).categories?.name ?? '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[client.status]}`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{sp?.full_name ?? '—'}</td>
                      <td className="px-4 py-3.5 text-slate-500">{formatDate(client.case_date)}</td>
                      <td className="px-4 py-3.5">
                        <Link to={`/clients/${client.id}`} className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                          View
                        </Link>
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
