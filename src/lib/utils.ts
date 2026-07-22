import { ClientStatus, InvoiceStatus } from './types';

export const STATUS_COLORS: Record<ClientStatus, string> = {
  'New': 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  'Pending Documents': 'bg-orange-100 text-orange-700',
  'Submitted': 'bg-purple-100 text-purple-700',
  'Approved': 'bg-green-100 text-green-700',
  'Rejected': 'bg-red-100 text-red-700',
  'Closed': 'bg-gray-100 text-gray-600',
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  'Draft': 'bg-gray-100 text-gray-600',
  'Sent': 'bg-blue-100 text-blue-700',
  'Paid': 'bg-green-100 text-green-700',
  'Overdue': 'bg-red-100 text-red-700',
  'Cancelled': 'bg-gray-100 text-gray-500',
};

export const CLIENT_STATUSES: ClientStatus[] = [
  'New', 'In Progress', 'Pending Documents', 'Submitted', 'Approved', 'Rejected', 'Closed',
];

export const INVOICE_STATUSES: InvoiceStatus[] = [
  'Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled',
];

export const DOCUMENT_TYPES = [
  'CV', 'Passport Scan', 'Work Permit', 'Visa Copy', 'Proof of Address',
  'Employment Contract', 'Bank Statement', 'Photo', 'Other',
];

export function formatDate(date?: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'LKR' }).format(amount);
}

export function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function calculateAge(iso?: string | null): string {
  if (!iso) return '';
  const dob = new Date(iso);
  if (isNaN(dob.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? String(age) : '';
}
