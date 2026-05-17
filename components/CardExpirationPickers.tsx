import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { SelectField, type SelectFieldColors } from '@/components/SelectField';
import {
  cardExpMonthItems,
  cardExpYearItems,
  encodeExpiration,
  parseExpiration,
} from '@/lib/cardExpiration';

type Props = {
  value: string;
  onChange: (mmYy: string) => void;
  colors: SelectFieldColors;
  style?: StyleProp<ViewStyle>;
  triggerStyle?: StyleProp<ViewStyle>;
  triggerHeight?: number;
};

export function CardExpirationPickers({
  value,
  onChange,
  colors,
  style,
  triggerStyle,
  triggerHeight,
}: Props) {
  const { month, year } = useMemo(() => parseExpiration(value), [value]);
  const yearItems = useMemo(() => cardExpYearItems(), []);
  const monthItems = useMemo(() => cardExpMonthItems(year), [year]);

  const expColors = colors;

  return (
    <View style={[styles.row, style]}>
      <SelectField
        value={month}
        onChange={(m) => {
          const months = cardExpMonthItems(year);
          let nextM = m;
          if (year && !months.some((x) => x.value === nextM)) {
            nextM = months[0]?.value ?? m;
          }
          onChange(encodeExpiration(nextM, year));
        }}
        items={monthItems}
        placeholder="Exp Month"
        sheetTitle="Expiration month"
        colors={expColors}
        containerStyle={styles.selectGrow}
        triggerStyle={triggerStyle}
        triggerHeight={triggerHeight}
      />
      <SelectField
        value={year}
        onChange={(y) => {
          let nextM = month;
          const months = cardExpMonthItems(y);
          if (!months.some((x) => x.value === nextM)) {
            nextM = months[0]?.value ?? '';
          }
          onChange(encodeExpiration(nextM, y));
        }}
        items={yearItems}
        placeholder="Exp Year"
        sheetTitle="Expiration year"
        colors={expColors}
        containerStyle={styles.selectGrow}
        triggerStyle={triggerStyle}
        triggerHeight={triggerHeight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', gap: 8 },
  selectGrow: { flex: 1, minWidth: 0 },
});
