import { useEffect, useState } from 'react';
import { watchAll } from '../backend';

export const toDate = (ts) => (ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null);

export const fmtDate = (ts) => {
  const d = toDate(ts);
  return d ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
};

export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export const formatAddress = (a) => (a ? [a.line1, a.city, a.state, a.pincode].filter(Boolean).join(', ') : '—');

// Live collection, newest first. Admin rules allow reading everything.
export function useCollection(name) {
  const [state, setState] = useState({ docs: [], loading: true, error: null });
  useEffect(() => watchAll(
    name,
    (docs) => {
      docs.sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
      setState({ docs, loading: false, error: null });
    },
    (error) => setState({ docs: [], loading: false, error: error.message }),
  ), [name]);
  return state;
}
