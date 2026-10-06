import { useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { get, patch, type Page } from '../lib/api';
import { Button, Loading, PageHead, Pagination, Problem, StatusPill, errText, fmtTime, slug, toast, useLoad } from './ui';
import type { Enquiry } from './types';

export function EnquiriesPage() {
  const [filter, setFilter] = useState<'Open' | 'Handled' | 'All'>('Open'); const [type, setType] = useState(''); const [page, setPage] = useState(1);
  const pageSize = 15;
  const { data, error, loading, reload } = useLoad(() => get<Page<Enquiry>>('/enquiries', { handled: filter === 'All' ? undefined : filter === 'Handled', type, page, page_size: pageSize }), [filter, type, page]);
  const [busy, setBusy] = useState(0);
  const toggle = async (e: Enquiry) => { setBusy(e.id); try { await patch(`/enquiries/${e.id}`, { handled: !e.handled }); toast(e.handled ? 'Returned to the open queue.' : 'Marked as handled.'); reload(); } catch (x) { toast(errText(x)); } finally { setBusy(0); } };
  const rows = data?.items ?? [];
  return <>
    <PageHead title="Enquiries" description="Messages and call-back requests from the website. Mark each one when it has been dealt with."/>
    <div className="ad-toolbar">{(['Open', 'Handled', 'All'] as const).map(f => <Button className={filter === f ? '' : 'soft'} key={f} onClick={() => { setFilter(f); setPage(1); }} data-testid={`tab-enquiries-${slug(f)}`}>{f}</Button>)}
      <select className="ad-select" value={type} onChange={e => { setType(e.target.value); setPage(1); }} aria-label="Filter by type" data-testid="select-enquiry-type"><option value="">All types</option><option value="contact">Messages</option><option value="callback">Call-backs</option></select>
      <span className="ad-demo-pill">{data?.total ?? 0} {filter === 'All' ? 'in total' : filter.toLowerCase()}</span></div>
    {error && <Problem text={error} retry={reload}/>}
    <section className="ad-card"><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>From</th><th>Type</th><th>Contact</th><th>Message</th><th>Received</th><th>State</th><th>Action</th></tr></thead>
      <tbody>{rows.map(e => <tr key={e.id} data-testid={`row-enquiry-${e.id}`}><td data-label="From"><strong>{e.name}</strong><small>#{e.id}</small></td><td data-label="Type">{e.type === 'callback' ? 'Call-back' : 'Message'}</td><td data-label="Contact">{e.mobile ?? '—'}<small>{e.email ?? ''}</small></td><td data-label="Message">{e.message || '—'}</td><td data-label="Received">{fmtTime(e.created_at)}</td><td data-label="State"><StatusPill value={e.handled ? 'Handled' : 'Pending'}/></td><td data-label="Action"><Button className={e.handled ? 'soft compact' : 'compact'} disabled={busy === e.id} onClick={() => void toggle(e)} data-testid={`button-handle-enquiry-${e.id}`}>{e.handled ? 'Reopen' : 'Mark handled'}</Button></td></tr>)}</tbody></table>
      {loading && !rows.length && <Loading what="Loading enquiries"/>}{!loading && !rows.length && !error && <div className="ad-empty"><MessageSquareText size={22}/><strong>Nothing here</strong><p>{filter === 'Open' ? 'All enquiries have been handled.' : 'No enquiries match.'}</p></div>}</div>
      <Pagination page={page} pageSize={pageSize} total={data?.total ?? 0} onPage={setPage} noun="enquiries"/></section>
  </>;
}
