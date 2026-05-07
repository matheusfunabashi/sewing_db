import Constants from 'expo-constants';

/**
 * The Django API base URL.
 *
 * Set it in `mobile/app.json` under `expo.extra.apiUrl`. When running on
 * a real phone via Expo Go you MUST use the LAN IP printed by `expo start`
 * (for example `http://192.168.1.10:8000/api`) rather than `localhost`,
 * because the phone cannot reach your computer's localhost.
 */
const API_URL: string =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:8000/api';

type Query = Record<string, string | number | boolean | undefined>;

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '' && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  query?: Query
): Promise<T> {
  const res = await fetch(buildUrl(path, query), {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get:    <T>(path: string, query?: Query) => request<T>(path, { method: 'GET' }, query),
  post:   <T>(path: string, body?: unknown) =>
            request<T>(path, { method: 'POST',  body: JSON.stringify(body ?? {}) }),
  patch:  <T>(path: string, body?: unknown) =>
            request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  put:    <T>(path: string, body?: unknown) =>
            request<T>(path, { method: 'PUT',   body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export const API_BASE_URL = API_URL;

// ----- Types ----------------------------------------------------------
export interface Customer {
  id: number;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  preferences?: string | null;
  created_at?: string;
}

export interface Measurement {
  id: number;
  order_item: number;
  label: string;
  value_cm: string;
  notes?: string | null;
}

export interface Ticket {
  id: number;
  order_item: number;
  code: string;
  fabric?: string | null;
  color?: string | null;
  design_notes?: string | null;
  status: string;
  stage: string;
  priority: string;
  deadline?: string | null;
  assigned_employee?: number | null;
  assigned_employee_name?: string | null;
  history?: StatusHistory[];
}

export interface StatusHistory {
  id: number;
  ticket: number;
  from_stage?: string | null;
  to_stage: string;
  changed_at: string;
  note?: string | null;
}

export interface OrderItem {
  id: number;
  order: number;
  garment_type: string;
  description?: string | null;
  quantity: number;
  unit_price: string;
  measurements: Measurement[];
  tickets: Ticket[];
}

export interface Order {
  id: number;
  customer: number;
  customer_name: string;
  order_date: string;
  due_date?: string | null;
  status: string;
  priority: string;
  total_amount: string;
  notes?: string | null;
  is_overdue?: boolean;
  items: OrderItem[];
  delivery?: Delivery | null;
}

export interface Delivery {
  id: number;
  order: number;
  delivered: boolean;
  delivery_date?: string | null;
  address?: string | null;
  observations?: string | null;
}

export interface Employee {
  id: number;
  full_name: string;
  role?: string | null;
  is_active: boolean;
}

export interface Paged<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Dashboard {
  orders: {
    pending: number;
    in_production: number;
    completed: number;
    delivered: number;
    overdue: number;
    total: number;
  };
  tickets_by_stage: { stage: string; total: number }[];
  customers: number;
  active_employees: number;
}
