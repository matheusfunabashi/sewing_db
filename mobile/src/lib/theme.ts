import { MD3LightTheme } from 'react-native-paper';

export const COLORS = {
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  primarySoft: '#ecfeff',
  background: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  textMuted: '#475569',
  border: '#dbe3ea',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#dc2626',
  pending: '#64748b',
  inProduction: '#06b6d4',
  completed: '#10b981',
  delivered: '#0e7490',
  cancelled: '#94a3b8',
  black: '#020617',
};

export const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.pending,
  in_production: COLORS.inProduction,
  completed: COLORS.completed,
  delivered: COLORS.delivered,
  cancelled: COLORS.cancelled,
  open: COLORS.pending,
  in_progress: COLORS.inProduction,
  on_hold: COLORS.warning,
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: '#94a3b8',
  normal: '#475569',
  high: '#f59e0b',
  urgent: '#dc2626',
};

export const STAGES = [
  'order_received',
  'design_confirmed',
  'cutting',
  'sewing',
  'finishing',
  'quality_check',
  'ready_for_delivery',
  'delivered',
] as const;

export type Stage = (typeof STAGES)[number];

export const stageLabel = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export const statusLabel = stageLabel;

export const paperTheme = {
  ...MD3LightTheme,
  roundness: 14,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    onPrimary: '#ffffff',
    primaryContainer: COLORS.primarySoft,
    onPrimaryContainer: COLORS.primaryDark,
    secondary: COLORS.black,
    onSecondary: '#ffffff',
    surface: COLORS.card,
    onSurface: COLORS.text,
    surfaceVariant: '#f1f5f9',
    onSurfaceVariant: COLORS.textMuted,
    background: COLORS.background,
    error: COLORS.danger,
    outline: COLORS.border,
  },
};
