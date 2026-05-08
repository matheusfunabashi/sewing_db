import { StyleProp, ViewStyle } from 'react-native';
import { Button } from 'react-native-paper';

import { COLORS } from '../lib/theme';

interface Props {
  title:     string;
  onPress:   () => void;
  loading?:  boolean;
  disabled?: boolean;
  variant?:  'primary' | 'secondary' | 'danger';
  style?:    StyleProp<ViewStyle>;
}

export default function PrimaryButton({
  title, onPress, loading = false, disabled = false, variant = 'primary', style,
}: Props) {
  const bg =
    variant === 'primary'   ? COLORS.primary :
    variant === 'danger'    ? COLORS.danger  :
                              COLORS.dark;
  return (
    <Button
      onPress={onPress}
      mode="contained"
      buttonColor={bg}
      textColor="#fff"
      loading={loading}
      disabled={disabled || loading}
      style={[{ borderRadius: 16, marginTop: 2 }, style]}
      contentStyle={{ minHeight: 52 }}
      labelStyle={{ fontWeight: '800', fontSize: 15 }}
    >
      {title}
    </Button>
  );
}
