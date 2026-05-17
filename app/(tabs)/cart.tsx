import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardExpirationPickers } from '@/components/CardExpirationPickers';
import { SelectField } from '@/components/SelectField';
import { StateSelectorField } from '@/components/StateSelectorField';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { isCompleteExpiration, parseExpiration } from '@/lib/cardExpiration';
import { clampCardDigits, MAX_CARD_DIGITS } from '@/lib/cardNumberMask';
import { useAccount } from '@/context/AccountContext';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrdersContext';
import { useWallet } from '@/context/WalletContext';
import { getProductImageCaption, getProductImageUrl } from '@/data/products';
import type { ShippingOptionId } from '@/data/shippingOptions';
import { SHIPPING_OPTIONS, shippingOptionById } from '@/data/shippingOptions';

function sanitizeDigits(v: string): string {
  return v.replace(/\D/g, '');
}

function cardEndingDigits(cardNumber: string): string {
  const d = sanitizeDigits(cardNumber);
  return d.length >= 4 ? d.slice(-4) : '••••';
}

export default function CartScreen() {
  const router = useRouter();
  const { startReview } = useLocalSearchParams<{ startReview?: string }>();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { linesWithProduct, subtotal, removeLine, clearCart } = useCart();
  const { addOrder } = useOrders();
  const { storeCredit, deductStoreCredit } = useWallet();
  const {
    hydrated: accountHydrated,
    hasAddress,
    addresses,
    defaultAddressId,
    addAddress,
    hasPaymentMethod,
    payment,
    paymentMethods,
    defaultPaymentId,
    addPaymentMethod,
    setDefaultPaymentId,
  } = useAccount();
  const [applyStoreCredit, setApplyStoreCredit] = useState(false);
  const appliedCredit = applyStoreCredit ? Math.min(storeCredit, subtotal) : 0;
  const totalDue = Math.max(0, subtotal - appliedCredit);

  const [checkoutAddressOpen, setCheckoutAddressOpen] = useState(false);
  const [addrLabel, setAddrLabel] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateField, setStateField] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payCard, setPayCard] = useState('');
  const [payExp, setPayExp] = useState('');
  const [payCvv, setPayCvv] = useState('');
  const [reviewCheckoutOpen, setReviewCheckoutOpen] = useState(false);
  const [checkoutAddressId, setCheckoutAddressId] = useState<string | null>(null);
  const [selectedShippingId, setSelectedShippingId] = useState<ShippingOptionId>('standard');
  const [reviewPaySelection, setReviewPaySelection] = useState<string>('');
  const [reviewNewCardNumber, setReviewNewCardNumber] = useState('');
  const [reviewNewExp, setReviewNewExp] = useState('');
  const [reviewNewCvv, setReviewNewCvv] = useState('');
  const [reviewShipSelection, setReviewShipSelection] = useState<string>('');
  const [reviewShipAddrLabel, setReviewShipAddrLabel] = useState('');
  const [reviewShipLine1, setReviewShipLine1] = useState('');
  const [reviewShipLine2, setReviewShipLine2] = useState('');
  const [reviewShipCity, setReviewShipCity] = useState('');
  const [reviewShipState, setReviewShipState] = useState('');
  const [reviewShipPostal, setReviewShipPostal] = useState('');

  const resetCheckoutAddressForm = useCallback(() => {
    setAddrLabel('');
    setLine1('');
    setLine2('');
    setCity('');
    setStateField('');
    setPostalCode('');
  }, []);

  useEffect(() => {
    if (!paymentModalOpen) return;
    setPayCard('');
    setPayExp(payment?.expiration ?? '');
    setPayCvv(payment?.cvv ?? '');
  }, [paymentModalOpen, payment?.cardNumber, payment?.expiration, payment?.cvv]);

  useEffect(() => {
    if (!reviewCheckoutOpen) return;
    setSelectedShippingId('standard');
    const defPay = defaultPaymentId ?? paymentMethods[0]?.id ?? null;
    setReviewPaySelection(defPay && paymentMethods.some((m) => m.id === defPay) ? defPay : '__new__');
    setReviewNewCardNumber('');
    setReviewNewExp('');
    setReviewNewCvv('');

    const prefShip =
      (checkoutAddressId && addresses.some((a) => a.id === checkoutAddressId) ? checkoutAddressId : null) ??
      (defaultAddressId && addresses.some((a) => a.id === defaultAddressId) ? defaultAddressId : null) ??
      addresses[0]?.id ??
      null;
    setReviewShipSelection(prefShip ?? '__new__');
    setReviewShipAddrLabel('');
    setReviewShipLine1('');
    setReviewShipLine2('');
    setReviewShipCity('');
    setReviewShipState('');
    setReviewShipPostal('');
  }, [reviewCheckoutOpen]);

  const paymentSelectItems = useMemo(() => {
    const saved = paymentMethods.map((m) => ({
      value: m.id,
      label: `Card ending ${cardEndingDigits(m.cardNumber)} · ${m.expiration}`,
    }));
    return [...saved, { value: '__new__', label: 'Enter new card…' }];
  }, [paymentMethods]);

  const shipSelectItems = useMemo(() => {
    const saved = addresses.map((a) => ({
      value: a.id,
      label: `${a.label}${defaultAddressId === a.id ? ' · Default' : ''} — ${[a.line1, a.city].filter(Boolean).join(', ')}`.slice(
        0,
        72
      ),
    }));
    return [...saved, { value: '__new__', label: 'Enter new address…' }];
  }, [addresses, defaultAddressId]);

  useEffect(() => {
    if (startReview !== '1' || !accountHydrated) return;
    if (!hasAddress || !hasPaymentMethod) {
      router.setParams({ startReview: undefined });
      return;
    }
    if (linesWithProduct.length === 0) return;

    const addrId =
      defaultAddressId && addresses.some((a) => a.id === defaultAddressId)
        ? defaultAddressId
        : addresses[0]?.id ?? null;
    if (!addrId) {
      router.setParams({ startReview: undefined });
      return;
    }

    setCheckoutAddressId(addrId);
    setReviewCheckoutOpen(true);
    router.setParams({ startReview: undefined });
  }, [
    startReview,
    accountHydrated,
    hasAddress,
    hasPaymentMethod,
    linesWithProduct.length,
    defaultAddressId,
    addresses,
    router,
  ]);

  const merchandiseAfterCredit = Math.max(0, subtotal - appliedCredit);

  /** Opens review; ship-to is chosen inside review (dropdown + optional new address). */
  const proceedToReviewStep = useCallback(() => {
    if (addresses.length === 0) return;
    const preferred =
      (defaultAddressId && addresses.some((a) => a.id === defaultAddressId) ? defaultAddressId : null) ??
      addresses[0]?.id ??
      null;
    setCheckoutAddressId(preferred);
    setReviewCheckoutOpen(true);
  }, [addresses, defaultAddressId]);

  const savePaymentFromCheckout = useCallback(async () => {
    const pan = clampCardDigits(payCard);
    if (pan.length !== MAX_CARD_DIGITS) {
      Alert.alert('Invalid card', `Enter all ${MAX_CARD_DIGITS} digits.`);
      return;
    }
    if (!isCompleteExpiration(payExp)) {
      Alert.alert('Expiration', 'Select expiration month and year.');
      return;
    }
    const { month: expM, year: expY } = parseExpiration(payExp.trim());
    await addPaymentMethod(
      {
        cardNumber: pan,
        expiration: `${expM}/${expY}`,
        cvv: sanitizeDigits(payCvv),
      },
      { makeDefault: true }
    );
    setPaymentModalOpen(false);
    proceedToReviewStep();
  }, [payCard, payExp, payCvv, addPaymentMethod, proceedToReviewStep]);

  const placeOrder = useCallback(async () => {
    if (reviewShipSelection === '__new__') {
      if (!reviewShipLine1.trim()) {
        Alert.alert('Address required', 'Please enter a street address for shipping.');
        return;
      }
    } else if (!addresses.some((a) => a.id === reviewShipSelection)) {
      Alert.alert('Address', 'Select a shipping address.');
      return;
    }

    if (reviewPaySelection === '__new__') {
      const pan = clampCardDigits(reviewNewCardNumber);
      if (pan.length !== MAX_CARD_DIGITS) {
        Alert.alert('Invalid card', `Enter all ${MAX_CARD_DIGITS} digits.`);
        return;
      }
      if (!isCompleteExpiration(reviewNewExp)) {
        Alert.alert('Expiration', 'Select expiration month and year.');
        return;
      }
    }

    let addr: { label: string; line1: string; line2: string; city: string; state: string; postalCode: string } | null =
      null;
    if (reviewShipSelection === '__new__') {
      const label = reviewShipAddrLabel.trim() || 'Home';
      const street = reviewShipLine1.trim();
      await addAddress({
        label,
        line1: street,
        line2: reviewShipLine2.trim(),
        city: reviewShipCity.trim(),
        state: reviewShipState.trim(),
        postalCode: reviewShipPostal.trim(),
      });
      addr = {
        label,
        line1: street,
        line2: reviewShipLine2.trim(),
        city: reviewShipCity.trim(),
        state: reviewShipState.trim(),
        postalCode: reviewShipPostal.trim(),
      };
    } else {
      const found = addresses.find((a) => a.id === reviewShipSelection);
      if (found) {
        addr = {
          label: found.label,
          line1: found.line1,
          line2: found.line2,
          city: found.city,
          state: found.state,
          postalCode: found.postalCode,
        };
      }
    }

    const shipOpt = shippingOptionById(selectedShippingId);
    const orderTotal = merchandiseAfterCredit + shipOpt.fee;
    if (appliedCredit > 0) await deductStoreCredit(appliedCredit);
    setReviewCheckoutOpen(false);

    const parts: string[] = [];
    if (addr) {
      parts.push(
        `Shipping to: ${addr.label}\n${addr.line1}${addr.city ? `, ${addr.city}` : ''}${addr.state ? ` ${addr.state}` : ''} ${addr.postalCode}`.trim()
      );
    }
    parts.push(
      `Delivery: ${shipOpt.title}${shipOpt.fee > 0 ? ` — $${shipOpt.fee.toFixed(2)}` : ' — Free'}`
    );
    if (appliedCredit > 0) parts.push(`Store credit: −$${appliedCredit.toFixed(2)}`);

    if (reviewPaySelection === '__new__') {
      const pan = clampCardDigits(reviewNewCardNumber);
      const { month: expM, year: expY } = parseExpiration(reviewNewExp.trim());
      await addPaymentMethod(
        {
          cardNumber: pan,
          expiration: `${expM}/${expY}`,
          cvv: sanitizeDigits(reviewNewCvv),
        },
        { makeDefault: false }
      );
      parts.push(`Payment: Card ending ${pan.slice(-4)}`);
    } else {
      const m = paymentMethods.find((x) => x.id === reviewPaySelection);
      if (m) {
        parts.push(`Payment: Card ending ${cardEndingDigits(m.cardNumber)}`);
      }
      if (reviewPaySelection && reviewPaySelection !== '__new__') {
        await setDefaultPaymentId(reviewPaySelection);
      }
    }

    parts.push(`Total: $${orderTotal.toFixed(2)}`);
    const noteLines = parts.slice(0, -1);
    await addOrder({
      lines: linesWithProduct.map(({ line, product }) => ({
        productId: line.productId,
        title: product.title,
        quantity: 1,
        unitPrice: product.price,
      })),
      subtotal,
      shippingTitle: shipOpt.title,
      shippingFee: shipOpt.fee,
      shippingOptionId: selectedShippingId,
      storeCreditApplied: appliedCredit,
      total: orderTotal,
      noteLines,
    });
    clearCart();
    Alert.alert('Order placed', parts.join('\n\n'));
  }, [
    linesWithProduct,
    subtotal,
    reviewShipSelection,
    reviewShipAddrLabel,
    reviewShipLine1,
    reviewShipLine2,
    reviewShipCity,
    reviewShipState,
    reviewShipPostal,
    reviewPaySelection,
    reviewNewCardNumber,
    reviewNewExp,
    reviewNewCvv,
    addresses,
    selectedShippingId,
    merchandiseAfterCredit,
    appliedCredit,
    deductStoreCredit,
    paymentMethods,
    addPaymentMethod,
    addAddress,
    setDefaultPaymentId,
    addOrder,
    clearCart,
  ]);

  const onProceedToCheckout = useCallback(() => {
    if (!hasAddress) {
      resetCheckoutAddressForm();
      setCheckoutAddressOpen(true);
      return;
    }
    if (!hasPaymentMethod) {
      setPaymentModalOpen(true);
      return;
    }
    proceedToReviewStep();
  }, [hasAddress, hasPaymentMethod, resetCheckoutAddressForm, proceedToReviewStep]);

  const saveAddressFromCheckout = useCallback(async () => {
    const street = line1.trim();
    if (!street) {
      Alert.alert('Address required', 'Please enter a street address to continue.');
      return;
    }
    const label = addrLabel.trim() || 'Home';
    await addAddress({
      label,
      line1: street,
      line2: line2.trim(),
      city: city.trim(),
      state: stateField.trim(),
      postalCode: postalCode.trim(),
    });
    setCheckoutAddressOpen(false);
  }, [line1, line2, city, stateField, postalCode, addrLabel, addAddress]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: 16 }]}>
        <Text style={[styles.title, { color: c.text }]}>Cart</Text>
        {linesWithProduct.length > 0 ? (
          <Text style={[styles.sub, { color: c.muted }]}>{`${linesWithProduct.length} item(s)`}</Text>
        ) : null}
      </View>
      <ScrollView
        contentContainerStyle={
          linesWithProduct.length === 0 ? styles.scrollEmpty : { paddingBottom: 120 }
        }
        showsVerticalScrollIndicator={false}>
        {linesWithProduct.length === 0 ? (
          <View style={styles.emptyWrap}>
            <FontAwesome name="shopping-basket" size={48} color={c.muted} style={styles.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>Nothing in your cart yet</Text>
            <Text style={[styles.emptySub, { color: c.muted }]}>
              Browse deals and tap add to cart when you find something you like.
            </Text>
            <Pressable
              onPress={() => router.push('/')}
              style={[styles.shopBtn, { backgroundColor: c.accent }]}>
              <Text style={styles.shopBtnText}>Start shopping</Text>
              <FontAwesome name="arrow-right" size={14} color="#fff" style={styles.shopBtnIcon} />
            </Pressable>
          </View>
        ) : (
          linesWithProduct.map(({ line, product }) => (
          <View
            key={line.productId}
            style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
            <Image
              source={{ uri: getProductImageUrl(product) }}
              style={styles.thumb}
              accessibilityLabel={getProductImageCaption(product)}
            />
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={2}>
                {product.title}
              </Text>
              <Text style={[styles.rowPrice, { color: c.price }]}>${product.price.toFixed(2)}</Text>
              <Pressable onPress={() => removeLine(line.productId)} style={styles.remove}>
                <Text style={{ color: c.muted, fontSize: 13 }}>Remove</Text>
              </Pressable>
            </View>
          </View>
          ))
        )}
      </ScrollView>
      {linesWithProduct.length > 0 ? (
        <View style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.border }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: c.muted }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: c.text }]}>${subtotal.toFixed(2)}</Text>
          </View>
          {storeCredit > 0 ? (
            <View style={[styles.creditOptIn, { borderColor: c.border, backgroundColor: c.background }]}>
              <View style={styles.creditOptInText}>
                <Text style={[styles.creditOptInTitle, { color: c.text }]}>Apply store credit</Text>
                <Text style={[styles.creditOptInSub, { color: c.muted }]}>
                  Use up to ${Math.min(storeCredit, subtotal).toFixed(2)} on this order
                </Text>
              </View>
              <Switch
                value={applyStoreCredit}
                onValueChange={setApplyStoreCredit}
                trackColor={{ false: c.border, true: c.accent }}
                thumbColor="#fff"
                ios_backgroundColor={c.border}
              />
            </View>
          ) : null}
          {applyStoreCredit && appliedCredit > 0 ? (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: c.muted }]}>Store credit</Text>
              <Text style={[styles.creditValue, { color: c.price }]}>
                −${appliedCredit.toFixed(2)}
              </Text>
            </View>
          ) : null}
          <View style={[styles.totalRow, styles.dueRow]}>
            <Text style={[styles.dueLabel, { color: c.text }]}>Total due</Text>
            <Text style={[styles.dueValue, { color: c.text }]}>${totalDue.toFixed(2)}</Text>
          </View>
          <Text style={[styles.footerShippingHint, { color: c.muted }]}>
            Shipping is added on the next step before you place your order.
          </Text>
          <Pressable
            style={[styles.checkout, { backgroundColor: c.accent }]}
            onPress={onProceedToCheckout}>
            <Text style={styles.checkoutText}>Proceed to checkout</Text>
          </Pressable>
        </View>
      ) : null}
      <Modal
        visible={checkoutAddressOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCheckoutAddressOpen(false)}>
        <View style={styles.checkoutModalRoot}>
          <Pressable style={styles.checkoutModalBackdrop} onPress={() => setCheckoutAddressOpen(false)} />
          <View style={[styles.checkoutModalSheet, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.checkoutModalTitle, { color: c.text }]}>Shipping address</Text>
            <Text style={[styles.checkoutModalSub, { color: c.muted }]}>
              Save your shipping address here. When you are ready, close this sheet and tap Proceed to checkout to
              place the order.
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextInput
                style={[styles.checkoutInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                placeholder="Label (e.g. Home, Mom)"
                placeholderTextColor={c.muted}
                value={addrLabel}
                onChangeText={setAddrLabel}
              />
              <TextInput
                style={[styles.checkoutInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                placeholder="Address line 1"
                placeholderTextColor={c.muted}
                value={line1}
                onChangeText={setLine1}
              />
              <TextInput
                style={[styles.checkoutInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                placeholder="Address line 2 (optional)"
                placeholderTextColor={c.muted}
                value={line2}
                onChangeText={setLine2}
              />
              <TextInput
                style={[styles.checkoutInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                placeholder="City"
                placeholderTextColor={c.muted}
                value={city}
                onChangeText={setCity}
              />
              <View style={styles.checkoutRow2}>
                <StateSelectorField
                  value={stateField}
                  onChange={setStateField}
                  colors={{
                    text: c.text,
                    muted: c.muted,
                    border: c.border,
                    background: c.background,
                    card: c.card,
                  }}
                  containerStyle={styles.checkoutInputHalf}
                  triggerStyle={styles.checkoutInput}
                />
                <TextInput
                  style={[
                    styles.checkoutInput,
                    styles.checkoutInputHalf,
                    { color: c.text, borderColor: c.border, backgroundColor: c.background },
                  ]}
                  placeholder="Postal code"
                  placeholderTextColor={c.muted}
                  value={postalCode}
                  onChangeText={setPostalCode}
                />
              </View>
            </ScrollView>
            <Pressable
              style={[styles.checkoutModalPrimary, { backgroundColor: c.accent }]}
              onPress={() => void saveAddressFromCheckout()}>
              <Text style={styles.checkoutModalPrimaryText}>Save address</Text>
            </Pressable>
            <Pressable onPress={() => setCheckoutAddressOpen(false)} style={styles.checkoutModalCancel}>
              <Text style={[styles.checkoutModalCancelText, { color: c.muted }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={paymentModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPaymentModalOpen(false)}>
        <View style={styles.checkoutModalRoot}>
          <Pressable style={styles.checkoutModalBackdrop} onPress={() => setPaymentModalOpen(false)} />
          <View style={[styles.checkoutModalSheet, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.checkoutModalTitle, { color: c.text }]}>Payment method</Text>
            <Text style={[styles.checkoutModalSub, { color: c.muted }]}>
              Enter your card details. CVV is hidden while typing. Only a masked identifier is saved.
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextInput
                style={[styles.checkoutInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                placeholder="Card number (16 digits)"
                placeholderTextColor={c.muted}
                keyboardType="number-pad"
                maxLength={MAX_CARD_DIGITS}
                value={payCard}
                onChangeText={(t) => setPayCard(clampCardDigits(t))}
              />
              <View style={styles.checkoutRow2}>
                <CardExpirationPickers
                  value={payExp}
                  onChange={setPayExp}
                  colors={{
                    text: c.text,
                    muted: c.muted,
                    border: c.border,
                    background: c.background,
                    card: c.card,
                  }}
                  style={styles.checkoutExpirationRow}
                  triggerHeight={44}
                />
                <TextInput
                  style={[
                    styles.checkoutInput,
                    styles.checkoutCvvCompact,
                    { color: c.text, borderColor: c.border, backgroundColor: c.background },
                  ]}
                  placeholder="CVV"
                  placeholderTextColor={c.muted}
                  keyboardType="number-pad"
                  secureTextEntry
                  value={payCvv}
                  onChangeText={setPayCvv}
                />
              </View>
            </ScrollView>
            <Pressable
              style={[styles.checkoutModalPrimary, { backgroundColor: c.accent }]}
              onPress={() => void savePaymentFromCheckout()}>
              <Text style={styles.checkoutModalPrimaryText}>Save payment</Text>
            </Pressable>
            <Pressable onPress={() => setPaymentModalOpen(false)} style={styles.checkoutModalCancel}>
              <Text style={[styles.checkoutModalCancelText, { color: c.muted }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={reviewCheckoutOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setReviewCheckoutOpen(false)}>
        <View style={styles.checkoutModalRoot}>
          <Pressable style={styles.checkoutModalBackdrop} onPress={() => setReviewCheckoutOpen(false)} />
          <View style={[styles.checkoutModalSheet, styles.reviewSheet, { backgroundColor: c.card, borderColor: c.border }]}>
            <ScrollView
              style={styles.reviewScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.reviewScrollContent}>
              <Text style={[styles.reviewSectionTitle, { color: c.text }]}>Ship to</Text>
              <SelectField
                value={reviewShipSelection}
                onChange={setReviewShipSelection}
                items={shipSelectItems}
                placeholder="Select address"
                sheetTitle="Ship to"
                colors={{
                  text: c.text,
                  muted: c.muted,
                  border: c.border,
                  background: c.background,
                  card: c.card,
                }}
                triggerStyle={[
                  styles.checkoutInput,
                  { marginBottom: reviewShipSelection === '__new__' ? 10 : 12 },
                ]}
                triggerHeight={44}
              />
              {reviewShipSelection === '__new__' ? (
                <>
                  <TextInput
                    style={[styles.checkoutInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                    placeholder="Label (e.g. Home, Mom)"
                    placeholderTextColor={c.muted}
                    value={reviewShipAddrLabel}
                    onChangeText={setReviewShipAddrLabel}
                  />
                  <TextInput
                    style={[styles.checkoutInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                    placeholder="Address line 1"
                    placeholderTextColor={c.muted}
                    value={reviewShipLine1}
                    onChangeText={setReviewShipLine1}
                  />
                  <TextInput
                    style={[styles.checkoutInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                    placeholder="Address line 2 (optional)"
                    placeholderTextColor={c.muted}
                    value={reviewShipLine2}
                    onChangeText={setReviewShipLine2}
                  />
                  <TextInput
                    style={[styles.checkoutInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                    placeholder="City"
                    placeholderTextColor={c.muted}
                    value={reviewShipCity}
                    onChangeText={setReviewShipCity}
                  />
                  <View style={styles.checkoutRow2}>
                    <StateSelectorField
                      value={reviewShipState}
                      onChange={setReviewShipState}
                      colors={{
                        text: c.text,
                        muted: c.muted,
                        border: c.border,
                        background: c.background,
                        card: c.card,
                      }}
                      containerStyle={styles.checkoutInputHalf}
                      triggerStyle={styles.checkoutInput}
                    />
                    <TextInput
                      style={[
                        styles.checkoutInput,
                        styles.checkoutInputHalf,
                        { color: c.text, borderColor: c.border, backgroundColor: c.background },
                      ]}
                      placeholder="Postal code"
                      placeholderTextColor={c.muted}
                      value={reviewShipPostal}
                      onChangeText={setReviewShipPostal}
                    />
                  </View>
                </>
              ) : null}
              <Text style={[styles.reviewSectionTitle, { color: c.text }]}>Payment</Text>
              <SelectField
                value={reviewPaySelection}
                onChange={setReviewPaySelection}
                items={paymentSelectItems}
                placeholder="Select payment"
                sheetTitle="Payment method"
                colors={{
                  text: c.text,
                  muted: c.muted,
                  border: c.border,
                  background: c.background,
                  card: c.card,
                }}
                triggerStyle={[styles.checkoutInput, { marginBottom: reviewPaySelection === '__new__' ? 10 : 12 }]}
                triggerHeight={44}
              />
              {reviewPaySelection === '__new__' ? (
                <>
                  <TextInput
                    style={[
                      styles.checkoutInput,
                      { color: c.text, borderColor: c.border, backgroundColor: c.background },
                    ]}
                    placeholder="Card number (16 digits)"
                    placeholderTextColor={c.muted}
                    keyboardType="number-pad"
                    maxLength={MAX_CARD_DIGITS}
                    value={reviewNewCardNumber}
                    onChangeText={(t) => setReviewNewCardNumber(clampCardDigits(t))}
                  />
                  <View style={styles.checkoutRow2}>
                    <CardExpirationPickers
                      value={reviewNewExp}
                      onChange={setReviewNewExp}
                      colors={{
                        text: c.text,
                        muted: c.muted,
                        border: c.border,
                        background: c.background,
                        card: c.card,
                      }}
                      style={styles.checkoutExpirationRow}
                      triggerHeight={44}
                    />
                    <TextInput
                      style={[
                        styles.checkoutInput,
                        styles.checkoutCvvCompact,
                        { color: c.text, borderColor: c.border, backgroundColor: c.background },
                      ]}
                      placeholder="CVV"
                      placeholderTextColor={c.muted}
                      keyboardType="number-pad"
                      secureTextEntry
                      value={reviewNewCvv}
                      onChangeText={setReviewNewCvv}
                    />
                  </View>
                </>
              ) : null}
              <Text style={[styles.reviewSectionTitle, { color: c.text }]}>Delivery speed</Text>
              {SHIPPING_OPTIONS.map((opt) => {
                const selected = selectedShippingId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setSelectedShippingId(opt.id)}
                    style={[
                      styles.shippingOptionRow,
                      {
                        borderColor: selected ? c.accent : c.border,
                        backgroundColor: c.background,
                        borderWidth: selected ? 2 : 1,
                      },
                    ]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.shippingOptionTitle, { color: c.text }]}>{opt.title}</Text>
                      <Text style={[styles.shippingOptionDesc, { color: c.muted }]}>{opt.description}</Text>
                    </View>
                    <Text style={[styles.shippingOptionFee, { color: opt.fee > 0 ? c.text : c.accent }]}>
                      {opt.fee > 0 ? `$${opt.fee.toFixed(2)}` : 'Free'}
                    </Text>
                  </Pressable>
                );
              })}
              <View style={[styles.reviewTotals, { borderTopColor: c.border }]}>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: c.muted }]}>Subtotal</Text>
                  <Text style={[styles.totalValue, { color: c.text }]}>${subtotal.toFixed(2)}</Text>
                </View>
                {applyStoreCredit && appliedCredit > 0 ? (
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: c.muted }]}>Store credit</Text>
                    <Text style={[styles.creditValue, { color: c.price }]}>−${appliedCredit.toFixed(2)}</Text>
                  </View>
                ) : null}
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: c.muted }]}>Shipping</Text>
                  <Text style={[styles.totalValue, { color: c.text }]}>
                    {shippingOptionById(selectedShippingId).fee > 0
                      ? `$${shippingOptionById(selectedShippingId).fee.toFixed(2)}`
                      : 'Free'}
                  </Text>
                </View>
                <View style={[styles.totalRow, styles.dueRow]}>
                  <Text style={[styles.dueLabel, { color: c.text }]}>Order total</Text>
                  <Text style={[styles.dueValue, { color: c.text }]}>
                    $
                    {(
                      merchandiseAfterCredit + shippingOptionById(selectedShippingId).fee
                    ).toFixed(2)}
                  </Text>
                </View>
              </View>
            </ScrollView>
            <Pressable
              style={[styles.checkoutModalPrimary, { backgroundColor: c.accent }]}
              onPress={() => void placeOrder()}>
              <Text style={styles.checkoutModalPrimaryText}>Place order</Text>
            </Pressable>
            <Pressable onPress={() => setReviewCheckoutOpen(false)} style={styles.checkoutModalCancel}>
              <Text style={[styles.checkoutModalCancelText, { color: c.muted }]}>Back</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollEmpty: { flexGrow: 1, paddingBottom: 48, paddingHorizontal: 24 },
  emptyWrap: {
    flex: 1,
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
  },
  emptyIcon: { marginBottom: 16, opacity: 0.85 },
  emptyTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  emptySub: { fontSize: 15, marginTop: 10, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  shopBtn: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    height: 50,
    borderRadius: 12,
  },
  shopBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  shopBtnIcon: { marginLeft: 2 },
  header: { paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800' },
  sub: { fontSize: 14, marginTop: 4 },
  row: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumb: { width: 100, height: 100, backgroundColor: '#E5E7EB' },
  rowBody: { flex: 1, padding: 12, justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  rowPrice: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  remove: { alignSelf: 'flex-start' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalLabel: { fontSize: 15 },
  totalValue: { fontSize: 18, fontWeight: '800' },
  creditOptIn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 12,
  },
  creditOptInText: { flex: 1 },
  creditOptInTitle: { fontSize: 15, fontWeight: '800' },
  creditOptInSub: { fontSize: 13, marginTop: 4 },
  creditValue: { fontSize: 16, fontWeight: '800' },
  dueRow: { marginTop: 4, marginBottom: 4 },
  dueLabel: { fontSize: 16, fontWeight: '700' },
  dueValue: { fontSize: 20, fontWeight: '900' },
  footerShippingHint: { fontSize: 12, marginBottom: 10, lineHeight: 16 },
  checkout: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  checkoutModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  checkoutModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  checkoutModalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: '72%',
  },
  reviewSheet: {
    height: '94%',
    maxHeight: '94%',
    paddingTop: 12,
    paddingBottom: 16,
  },
  reviewScroll: {
    flex: 1,
  },
  reviewScrollContent: {
    paddingBottom: 8,
  },
  reviewSectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  shippingOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  shippingOptionTitle: { fontSize: 16, fontWeight: '800' },
  shippingOptionDesc: { fontSize: 13, marginTop: 4 },
  shippingOptionFee: { fontSize: 16, fontWeight: '900', marginLeft: 8 },
  reviewTotals: { marginTop: 8, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  checkoutModalTitle: { fontSize: 20, fontWeight: '800' },
  checkoutModalSub: { fontSize: 14, marginTop: 8, marginBottom: 14, lineHeight: 20 },
  checkoutInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 15,
    marginBottom: 10,
  },
  checkoutRow2: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  checkoutInputHalf: { flex: 1 },
  checkoutExpirationRow: { flex: 1, minWidth: 0 },
  checkoutCvvCompact: { width: 84, flexShrink: 0, paddingHorizontal: 10, marginBottom: 10 },
  checkoutModalPrimary: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  checkoutModalPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  checkoutModalCancel: { alignItems: 'center', paddingVertical: 14 },
  checkoutModalCancelText: { fontSize: 15, fontWeight: '700' },
});
