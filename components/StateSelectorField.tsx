import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { formatStateTriggerLabel, US_STATES_AND_TERRITORIES } from '@/data/usStatesAndTerritories';

type ColorSet = {
  text: string;
  muted: string;
  border: string;
  background: string;
  card: string;
};

type Props = {
  value: string;
  onChange: (stateCode: string) => void;
  colors: ColorSet;
  containerStyle?: StyleProp<ViewStyle>;
  triggerStyle?: StyleProp<ViewStyle>;
};

export function StateSelectorField({ value, onChange, colors, containerStyle, triggerStyle }: Props) {
  const wrapRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const label = useMemo(() => formatStateTriggerLabel(value), [value]);

  const close = useCallback(() => {
    setOpen(false);
    setAnchor(null);
  }, []);

  const openSheet = useCallback(() => {
    wrapRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  }, []);

  const winH = Dimensions.get('window').height;
  const sheetMaxHeight = anchor
    ? Math.min(winH * 0.55, Math.max(120, winH - (anchor.y + anchor.height) - 16))
    : undefined;
  const listMaxHeight = sheetMaxHeight != null ? Math.max(80, sheetMaxHeight - 96) : undefined;

  return (
    <>
      <View ref={wrapRef} collapsable={false} style={[styles.triggerWrap, containerStyle]}>
        <Pressable
          onPress={openSheet}
          style={[
            styles.trigger,
            { width: '100%', borderColor: colors.border, backgroundColor: colors.background },
            triggerStyle,
          ]}>
          <Text style={[styles.triggerText, { color: value ? colors.text : colors.muted }]} numberOfLines={1}>
            {value ? label : 'Select state'}
          </Text>
          <FontAwesome name="chevron-down" size={14} color={colors.muted} />
        </Pressable>
      </View>
      <Modal visible={open} animationType="fade" transparent onRequestClose={close}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={close} />
          {anchor ? (
            <View
              style={[
                styles.sheetAnchored,
                {
                  top: anchor.y + anchor.height - 1,
                  left: anchor.x,
                  width: anchor.width,
                  maxHeight: sheetMaxHeight,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Select state</Text>
              <FlatList
                data={US_STATES_AND_TERRITORIES}
                keyExtractor={(item) => item.code}
                keyboardShouldPersistTaps="handled"
                style={[styles.list, listMaxHeight != null ? { maxHeight: listMaxHeight } : null]}
                nestedScrollEnabled
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      onChange(item.code);
                      close();
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      { borderBottomColor: colors.border, backgroundColor: pressed ? colors.background : 'transparent' },
                    ]}>
                    <Text style={[styles.rowPrimary, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.rowCode, { color: colors.muted }]}>{item.code}</Text>
                  </Pressable>
                )}
              />
              <Pressable onPress={close} style={styles.cancelWrap}>
                <Text style={[styles.cancel, { color: colors.muted }]}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerWrap: { alignSelf: 'stretch' },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  triggerText: { flex: 1, fontSize: 14, fontWeight: '600' },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetAnchored: {
    position: 'absolute',
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingTop: 10,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', paddingHorizontal: 16, marginBottom: 8 },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowPrimary: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 12 },
  rowCode: { fontSize: 14, fontWeight: '700' },
  cancelWrap: { alignItems: 'center', paddingVertical: 14 },
  cancel: { fontSize: 16, fontWeight: '700' },
});
