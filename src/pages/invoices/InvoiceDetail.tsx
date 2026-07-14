import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Invoice, InvoiceItem } from '../../lib/types';
import { INVOICE_STATUS_COLORS, INVOICE_STATUSES, formatDate, formatCurrency } from '../../lib/utils';
import { ChevronLeft, Printer, Edit2, Save, X, Trash2, Plus } from 'lucide-react';

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [inv, its] = await Promise.all([
        supabase.from('invoices').select('*, clients(reg_no, personal_details(first_name, last_name), company_details(company_name, employer_address))').eq('id', id!).maybeSingle(),
        supabase.from('invoice_items').select('*').eq('invoice_id', id!).order('created_at'),
      ]);
      setInvoice(inv.data);
      setItems(its.data ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  function startEdit() {
    setEditStatus(invoice?.status ?? '');
    setEditNotes(invoice?.notes ?? '');
    setEditDueDate(invoice?.due_date ?? '');
    setEditing(true);
  }

  async function saveEdit() {
    if (!id) return;
    setSaving(true);
    const { data } = await supabase.from('invoices').update({ status: editStatus, notes: editNotes, due_date: editDueDate || null, updated_at: new Date().toISOString() }).eq('id', id).select('*, clients(reg_no, personal_details(first_name, last_name), company_details(company_name, employer_address))').single();
    setInvoice(data);
    setSaving(false);
    setEditing(false);
  }

  function printInvoice() {
    window.print();
  }

  if (loading) return <div className="p-6 text-slate-400 text-sm">Loading...</div>;
  if (!invoice) return <div className="p-6 text-slate-400 text-sm">Invoice not found.</div>;

  const client = (invoice as any).clients;
  const pd = client?.personal_details;
  const company = client?.company_details;
  const clientName = pd ? `${pd.first_name} ${pd.last_name}` : '—';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <button onClick={() => navigate('/invoices')} className="text-slate-400 hover:text-slate-600">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 flex-1">Invoice {invoice.invoice_no}</h1>
        <button onClick={printInvoice} className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
          <Printer className="w-4 h-4" /> Print
        </button>
        {!editing ? (
          <button onClick={startEdit} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Edit2 className="w-4 h-4" /> Edit
          </button>
        ) : (
          <>
            <button onClick={() => setEditing(false)} className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button onClick={saveEdit} disabled={saving} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </>
        )}
      </div>

      {/* Invoice document */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 print:border-0 print:rounded-none print:p-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Vigo Immigration</h1>
            <p className="text-slate-500 text-sm mt-1">Immigration & Visa Services</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">INVOICE</p>
            <p className="font-mono text-sm text-slate-600 mt-1">{invoice.invoice_no}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Bill to */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Bill To</p>
            <p className="font-semibold text-slate-800">{clientName}</p>
            {company?.company_name && <p className="text-sm text-slate-600">{company.company_name}</p>}
            {company?.employer_address && <p className="text-sm text-slate-500">{company.employer_address}</p>}
            <p className="text-xs text-slate-400 mt-1 font-mono">{client?.reg_no}</p>
          </div>
          {/* Dates */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Issue Date</span>
              <span className="font-medium text-slate-800">{formatDate(invoice.issue_date)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Due Date</span>
              {editing ? (
                <input type="date" className="border border-slate-200 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} />
              ) : (
                <span className="font-medium text-slate-800">{formatDate(invoice.due_date)}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Status</span>
              {editing ? (
                <select className="border border-slate-200 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                  {INVOICE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${INVOICE_STATUS_COLORS[invoice.status]}`}>{invoice.status}</span>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="bg-slate-50 border-y border-slate-200">
              <th className="px-4 py-3 text-left font-medium text-slate-600">Description</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600">Qty</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Unit Price</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-slate-800">{item.description}</td>
                <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(Number(item.unit_price))}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(Number(item.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(invoice.subtotal))}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>VAT ({invoice.vat_rate}%)</span>
              <span>{formatCurrency(Number(invoice.vat_amount))}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-200 pt-2">
              <span>Total</span>
              <span>{formatCurrency(Number(invoice.total))}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {(editing || invoice.notes) && (
          <div className="border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Notes</p>
            {editing ? (
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-700" rows={3} value={editNotes} onChange={e => setEditNotes(e.target.value)} />
            ) : (
              <p className="text-sm text-slate-600 whitespace-pre-line">{invoice.notes}</p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>
    </div>
  );
}
