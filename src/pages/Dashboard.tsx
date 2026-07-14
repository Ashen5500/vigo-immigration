import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Client } from '../lib/types';
import { formatDate, STATUS_COLORS } from '../lib/utils';
import {
  Users, FileText, TrendingUp, AlertTriangle,
  Plus, Clock, CheckCircle, ArrowRight
} from 'lucide-react';

interface Stats {
  total: number;
  active: number;
  approved: number;
  expiringPassports: number;
  pendingInvoices: number;
  newThisMonth: number;
}

interface StatCard {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, approved: 0, expiringPassports: 0, pendingInvoices: 0, newThisMonth: 0 });
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [clientsRes, passportRes, invoiceRes] = await Promise.all([
        supabase.from('clients').select('*, personal_details(first_name, last_name), categories!clients_category_id_fkey(name)'),
        supabase.from('passport_details').select('expiry_date').lt('expiry_date', new Date(Date.now() + 90 * 86400000).toISOString()),
        supabase.from('invoices').select('id').in('status', ['Draft', 'Sent', 'Overdue']),
      ]);

      const clients: Client[] = clientsRes.data ?? [];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      setStats({
        total: clients.length,
        active: clients.filter(c => ['New', 'In Progress', 'Pending Documents', 'Submitted'].includes(c.status)).length,
        approved: clients.filter(c => c.status === 'Approved').length,
        expiringPassports: passportRes.data?.length ?? 0,
        pendingInvoices: invoiceRes.data?.length ?? 0,
        newThisMonth: clients.filter(c => c.created_at >= monthStart).length,
      });

      setRecentClients(clients.slice(0, 8));
      setLoading(false);
    }
    load();
  }, []);

  const cards: StatCard[] = [
    { label: 'Total Clients', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Cases', value: stats.active, icon: TrendingUp, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Expiring Passports', value: stats.expiringPassports, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Pending Invoices', value: stats.pendingInvoices, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'New This Month', value: stats.newThisMonth, icon: Clock, color: 'text-slate-600', bg: 'bg-slate-100' },
  ];

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link
          to="/clients/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Client
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Clients */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Recent Clients</h2>
            <Link to="/clients" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentClients.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-10">No clients yet.</p>
            )}
            {recentClients.map(client => {
              const pd = client.personal_details as any;
              const name = pd ? `${pd.first_name} ${pd.last_name}` : 'Unnamed Client';
              return (
                <Link
                  key={client.id}
                  to={`/clients/${client.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 text-slate-600 font-semibold text-sm">
                    {name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{name}</p>
                    <p className="text-xs text-slate-400">{client.reg_no} · {(client as any).categories?.name ?? '—'}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[client.status]}`}>
                    {client.status}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link to="/clients/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors text-sm font-medium">
                <Users className="w-4 h-4" /> Register New Client
              </Link>
              <Link to="/invoices/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors text-sm font-medium">
                <FileText className="w-4 h-4" /> Create Invoice
              </Link>
              <Link to="/email" className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" /> Compose Email
              </Link>
            </div>
          </div>

          {stats.expiringPassports > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <h3 className="font-semibold text-red-800 text-sm">Attention Required</h3>
              </div>
              <p className="text-red-700 text-sm">
                {stats.expiringPassports} passport{stats.expiringPassports > 1 ? 's' : ''} expiring within 90 days.
              </p>
              <Link to="/clients?filter=expiring" className="text-red-700 text-sm font-medium hover:underline mt-2 inline-block">
                Review clients →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-48 mb-2" />
      <div className="h-4 bg-slate-100 rounded w-64 mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 h-28" />
        ))}
      </div>
    </div>
  );
}
