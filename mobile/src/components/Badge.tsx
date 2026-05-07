import { Chip } from 'react-native-paper';

import { PRIORITY_COLORS, STATUS_COLORS, statusLabel } from '../lib/theme';

interface Props {
  value: string;
  kind?: 'status' | 'priority';
  small?: boolean;
}

export default function Badge({ value, kind = 'status', small = false }: Props) {
  const color =
    kind === 'priority' ? PRIORITY_COLORS[value] ?? '#6b7280' : STATUS_COLORS[value] ?? '#6b7280';
  return (
    <Chip
      compact
      style={{
        backgroundColor: color + '22',
        borderColor: color,
        borderWidth: 1,
        minHeight: small ? 24 : 28,
        height: small ? 24 : 28,
        alignSelf: 'flex-start',
      }}
      textStyle={{ color, fontWeight: '800', fontSize: small ? 10 : 12, marginVertical: 0 }}
    >
      {statusLabel(value)}
    </Chip>
  );
}
