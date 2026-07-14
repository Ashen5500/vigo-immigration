import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Client } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';
import { ChevronLeft, Plus, Trash2, Save } from 'lucide-react';

interface LineItem {
  description: string;
  quantity: string;
  unit_price: string;
}

const EMPTY_ITEM: LineItem = { description: '', quantity: '1', unit_price: '' };

export default function InvoiceNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(searchParams.get('client') ?? '');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }]);
  const [vatRate, setVatRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('clients')
      .select('*, personal_details(first_name, last_name)')
      .order('created_at', { ascending: false })
      .then(r => setClients(r.data ?? []));
  }, []);

  function setItem(i: number, field: keyof LineItem, value: string) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  }

  function addItem() { setItems(prev => [...prev, { ...EMPTY_ITEM }]); }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)); }

  const subtotal = items.reduce((s, it) => s + (parseFloat(it.quantity || '0') * parseFloat(it.unit_price || '0')), 0);
  const vatAmount = subtotal * (parseFloat(vatRate || '0') / 100);
  const total = subtotal + vatAmount;

  async function handleSave() {
    if (!clientId) { setError('Please select a client.'); return; }
    if (items.every(it => !it.description)) { setError('Add at least one line item.'); return; }
    setSaving(true);
    setError('');

    const { data: invoice, error: invErr } = await supabase.from('invoices').insert({
      client_id: clientId,
      issue_date: issueDate,
      due_date: dueDate || null,
      status,
      subtotal,
      vat_rate: parseFloat(vatRate),
      vat_amount: vatAmount,
      total,
      notes: notes || null,
      created_by: user?.id,
    }).select().single();

    if (invErr || !invoice) { setError(invErr?.message ?? 'Failed to create invoice.'); setSaving(false); return; }

    const validItems = items.filter(it => it.description && parseFloat(it.unit_price || '0') > 0);
    if (validItems.length > 0) {
      await supabase.from('invoice_items').insert(
        validItems.map(it => ({
          invoice_id: invoice.id,
          description: it.description,
          quantity: parseFloat(it.quantity),
          unit_price: parseFloat(it.unit_price),
        }))
      );
    }

    navigate(`/invoices/${invoice.id}`);
  }

  const inp = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/invoices')} className="text-slate-400 hover:text-slate-600">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Invoice</h1>
          <p className="text-slate-500 text-sm">Invoice number will be auto-assigned</p>
        </div>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Invoice Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Client *</label>
                <select className={inp} value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="">Select a client...</option>
                  {clients.map(c => {
                    const pd = (c as any).personal_details;
                    const name = pd ? `${pd.first_name} ${pd.last_name}` : 'Unknown';
                    return <option key={c.id} value={c.id}>{name} ({c.reg_no})</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Issue Date</label>
                <input type="date" className={inp} value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Due Date</label>
                <input type="date" className={inp} value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
                <select className={inp} value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">VAT Rate (%)</label>
                <input type="number" min="0" max="100" step="0.5" className={inp} value={vatRate} onChange={e => setVatRate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Line Items</h2>
              <button onClick={addItem} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 pb-1">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-3 text-right">Unit Price (LKR)</div>
                <div className="col-span-1" />
              </div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <input className={inp} placeholder="Service description" value={item.description} onChange={e => setItem(i, 'description', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min="0" step="0.5" className={inp + ' text-center'} value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <input type="number" min="0" step="0.01" className={inp + ' text-right'} placeholder="0.00" value={item.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes / Payment Terms</label>
            <textarea className={inp + ' resize-none'} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, bank details, notes..." />
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-6">
            <h2 className="font-semibold text-slate-800 mb-4">Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>VAT ({vatRate}%)</span>
                <span>{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-200 pt-3">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2.5 rounded-lg transition-colors mt-6"
            >
              {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> : <Save className="w-4 h-4" />}
              Create Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
