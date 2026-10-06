import type { DocumentApi, Role, Status } from '../lib/api';

export type Brief = { id: number; name: string };
export type LoanBrief = { id: number; name: string; slug: string };
export type LeadItem = {
  id: number; app_number: string; name: string; mobile: string; email: string; city: string; loan_type: LoanBrief; amount: number;
  status: Status; source: 'web' | 'walk-in' | 'phone'; assignee: Brief | null; mobile_confirmed: boolean; created_at: string; updated_at: string;
};
export type Followup = { id: number; due_at: string; note: string | null; done: boolean; done_at: string | null; user_id: number | null; overdue: boolean };
export type LeadFull = LeadItem & {
  income: number; existing_emi: number; consent: boolean; consent_text_version: string | null; consent_at: string | null; has_account: boolean;
  documents: DocumentApi[]; notes: { id: number; note: string; author: string | null; created_at: string }[];
  history: { id: number; old_status: Status | null; new_status: Status; reason: string | null; changed_by: string | null; created_at: string }[];
  followups: Followup[]; allowed_transitions: { status: Status; reason_required: boolean; reopen: boolean }[];
};
export type TeamUser = { id: number; name: string; role: Role };
export type Enquiry = { id: number; type: 'contact' | 'callback'; name: string; mobile: string | null; email: string | null; message: string | null; handled: boolean; handled_at: string | null; created_at: string };
export type UserAdmin = { id: number; name: string; email: string; mobile: string | null; role: Role; is_active: boolean; email_verified: boolean; locked_until: string | null; created_at: string; open_leads: number };
export type Audit = { id: number; user_id: number | null; user_name: string | null; action: string; entity: string; entity_id: string | null; ip: string | null; details: Record<string, unknown> | null; created_at: string };
export const SOURCE_LABEL: Record<string, string> = { web: 'Web', 'walk-in': 'Walk-in', phone: 'Phone' };
export const CLOSED: Status[] = ['Disbursed', 'Rejected', 'Not Reachable / Closed'];
