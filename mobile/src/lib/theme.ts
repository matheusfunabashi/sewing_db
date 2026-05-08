import { MD3LightTheme } from 'react-native-paper';

export const COLORS = {
  // Core brand — warm peach/pink from the Dribbble design
  primary:     '#E8956D',   // peach-orange (buttons, active states)
  primaryDark: '#C4703D',
  primarySoft: '#FDF0E8',

  // Gradient stops (used in LinearGradient)
  gradStart:   '#F9C89E',   // warm peach
  gradMid:     '#F5A8C0',   // rose pink
  gradEnd:     '#EFC0D0',   // soft pink

  // Surfaces
  background:  '#FBF6F0',   // warm off-white
  card:        '#FFFFFF',
  cardWarm:    '#FEF3EC',   // peach-tinted card

  // Dark nav / pill
  dark:        '#1E1208',   // near-black warm
  darkMuted:   '#7A5A48',

  // Text
  text:        '#1A0E06',
  textMuted:   '#9A7060',
  textLight:   '#C4A898',

  // Borders
  border:      '#EDE0D8',
  borderWarm:  '#F0CDB8',

  // Semantic
  success:   '#4CAF7D',
  warning:   '#E8A030',
  danger:    '#D04040',

  // Status colours
  pending:      '#A09080',
  inProduction: '#E8956D',
  completed:    '#4CAF7D',
  delivered:    '#2E8B6A',
  cancelled:    '#B0A0A0',
};

export const STATUS_COLORS: Record<string, string> = {
  pending:       COLORS.pending,
  in_production: COLORS.inProduction,
  completed:     COLORS.completed,
  delivered:     COLORS.delivered,
  cancelled:     COLORS.cancelled,
  open:          COLORS.pending,
  in_progress:   COLORS.inProduction,
  on_hold:       COLORS.warning,
};

export const PRIORITY_COLORS: Record<string, string> = {
  low:    '#B0A898',
  normal: '#7A9080',
  high:   '#E8A030',
  urgent: '#D04040',
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
  roundness: 16,
  colors: {
    ...MD3LightTheme.colors,
    primary:              COLORS.primary,
    onPrimary:            '#ffffff',
    primaryContainer:     COLORS.primarySoft,
    onPrimaryContainer:   COLORS.primaryDark,
    secondary:            COLORS.dark,
    onSecondary:          '#ffffff',
    surface:              COLORS.card,
    onSurface:            COLORS.text,
    surfaceVariant:       COLORS.cardWarm,
    onSurfaceVariant:     COLORS.textMuted,
    background:           COLORS.background,
    error:                COLORS.danger,
    outline:              COLORS.border,
  },
};
