import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';

import { COLORS } from '../lib/theme';

interface Props {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function Card({ onPress, children, style }: Props) {
  return (
    <PaperCard
      mode="outlined"
      onPress={onPress}
      style={[
        {
          backgroundColor: COLORS.card,
          borderRadius: 16,
          marginBottom: 12,
          borderColor: COLORS.border,
          borderWidth: 1,
        },
        style,
      ]}
      contentStyle={{ padding: 16 }}
    >
      {children}
    </PaperCard>
  );
}
