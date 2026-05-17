import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardExpirationPickers } from '@/components/CardExpirationPickers';
import { StoreCreditLoadSlat } from '@/components/StoreCreditLoadSlat';
import { StateSelectorField } from '@/components/StateSelectorField';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAccount, type AccountPaymentMethod } from '@/context/AccountContext';
import { useThemePreference } from '@/context/ThemePreferenceContext';
import { isCompleteExpiration, parseExpiration } from '@/lib/cardExpiration';
import { clampCardDigits, MAX_CARD_DIGITS } from '@/lib/cardNumberMask';

function Row({
  icon,
  label,
  scheme,
  expanded,
  onPress,
}: {
  icon: ComponentProps<typeof FontAwesome>['name'];
  label: string;
  scheme: 'light' | 'dark';
  expanded?: boolean;
  onPress?: () => void;
}) {
  const c = Colors[scheme];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.9 : 1 },
      ]}>
      <FontAwesome name={icon} size={18} color={c.accent} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, { color: c.text }]}>{label}</Text>
      {onPress ? (
        <FontAwesome name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={c.muted} />
      ) : (
        <FontAwesome name="chevron-right" size={14} color={c.muted} />
      )}
    </Pressable>
  );
}

function maskCardLast4(last4: string): string {
  if (!last4) return '•••• •••• •••• ••••';
  return `•••• •••• •••• ${last4}`;
}

function sanitizeDigits(v: string): string {
  return v.replace(/\D/g, '');
}

function methodLast4(m: AccountPaymentMethod): string {
  const d = sanitizeDigits(m.cardNumber);
  return d.length >= 4 ? d.slice(-4) : '••••';
}

export default function AccountScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { preference: themePreference, setPreference: setThemePreference } = useThemePreference();
  const {
    hydrated,
    profile,
    addresses,
    defaultAddressId,
    paymentMethods,
    defaultPaymentId,
    isSignedIn,
    setProfile,
    setAvatarUri,
    addAddress,
    updateAddress,
    removeAddress,
    setDefaultAddressId,
    addPaymentMethod,
    updatePaymentMethod,
    removePaymentMethod,
    setDefaultPaymentId,
  } = useAccount();
  const [signInOpen, setSignInOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [addressEditingId, setAddressEditingId] = useState<string | null>(null);
  const [paymentEditingId, setPaymentEditingId] = useState<string | null>(null);

  const [email, setEmail] = useState(profile?.email ?? '');
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');

  const [addrLabel, setAddrLabel] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [cardNumber, setCardNumber] = useState('');
  const [expiration, setExpiration] = useState('');
  const [cvv, setCvv] = useState('');

  useEffect(() => {
    setEmail(profile?.email ?? '');
    setFirstName(profile?.firstName ?? '');
    setLastName(profile?.lastName ?? '');
  }, [profile?.email, profile?.firstName, profile?.lastName]);

  const resetAddressForm = useCallback(() => {
    setAddressEditingId(null);
    setAddrLabel('');
    setLine1('');
    setLine2('');
    setCity('');
    setState('');
    setPostalCode('');
  }, []);

  const startNewAddress = useCallback(() => {
    resetAddressForm();
  }, [resetAddressForm]);

  const startEditAddress = useCallback((id: string) => {
    const a = addresses.find((x) => x.id === id);
    if (!a) return;
    setAddressEditingId(id);
    setAddrLabel(a.label);
    setLine1(a.line1);
    setLine2(a.line2);
    setCity(a.city);
    setState(a.state);
    setPostalCode(a.postalCode);
  }, [addresses]);

  const resetPaymentForm = useCallback(() => {
    setPaymentEditingId(null);
    setCardNumber('');
    setExpiration('');
    setCvv('');
  }, []);

  const startNewPayment = useCallback(() => {
    resetPaymentForm();
  }, [resetPaymentForm]);

  const startEditPayment = useCallback((id: string) => {
    const m = paymentMethods.find((x) => x.id === id);
    if (!m) return;
    setPaymentEditingId(id);
    setCardNumber('');
    setExpiration(m.expiration);
    setCvv(m.cvv);
  }, [paymentMethods]);

  const pickAvatar = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to set an avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (!uri) return;
    await setAvatarUri(uri);
  }, [setAvatarUri]);

  const saveAccount = useCallback(async () => {
    const emailTrimmed = email.trim();
    const firstTrimmed = firstName.trim();
    const lastTrimmed = lastName.trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);
    if (!validEmail) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (!firstTrimmed || !lastTrimmed) {
      Alert.alert('Missing name', 'Please enter first and last name.');
      return;
    }
    await setProfile({
      email: emailTrimmed,
      firstName: firstTrimmed,
      lastName: lastTrimmed,
      avatarUri: profile?.avatarUri ?? null,
    });
    setSignInOpen(false);
  }, [email, firstName, lastName, profile?.avatarUri, setProfile]);

  const saveAddress = useCallback(async () => {
    const street = line1.trim();
    if (!street) {
      Alert.alert('Address required', 'Please enter a street address.');
      return;
    }
    const labelTrim = addrLabel.trim() || 'Address';
    const payload = {
      label: labelTrim,
      line1: street,
      line2: line2.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
    };
    if (addressEditingId) {
      await updateAddress(addressEditingId, payload);
    } else {
      await addAddress(payload);
    }
    resetAddressForm();
  }, [line1, line2, city, state, postalCode, addrLabel, addressEditingId, addAddress, updateAddress, resetAddressForm]);

  const confirmRemoveAddress = useCallback(
    (id: string) => {
      Alert.alert('Remove address?', 'This address will be deleted from your saved list.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void removeAddress(id),
        },
      ]);
    },
    [removeAddress]
  );

  const savePayment = useCallback(async () => {
    const pan = clampCardDigits(cardNumber);
    if (pan.length !== MAX_CARD_DIGITS) {
      Alert.alert('Invalid card', `Enter all ${MAX_CARD_DIGITS} digits.`);
      return;
    }
    if (!isCompleteExpiration(expiration)) {
      Alert.alert('Expiration', 'Select expiration month and year.');
      return;
    }
    const { month: expM, year: expY } = parseExpiration(expiration.trim());
    const payload = {
      cardNumber: pan,
      expiration: `${expM}/${expY}`,
      cvv: sanitizeDigits(cvv),
    };
    if (paymentEditingId) {
      await updatePaymentMethod(paymentEditingId, payload);
    } else {
      await addPaymentMethod(payload, { makeDefault: paymentMethods.length === 0 });
    }
    resetPaymentForm();
  }, [
    cardNumber,
    expiration,
    cvv,
    paymentEditingId,
    paymentMethods.length,
    addPaymentMethod,
    updatePaymentMethod,
    resetPaymentForm,
  ]);

  const confirmRemovePayment = useCallback(
    (id: string) => {
      Alert.alert('Remove card?', 'This payment method will be removed from your account.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void removePaymentMethod(id);
            if (paymentEditingId === id) resetPaymentForm();
          },
        },
      ]);
    },
    [removePaymentMethod, paymentEditingId, resetPaymentForm]
  );

  const closeAddressSection = useCallback(() => {
    setAddressOpen(false);
    resetAddressForm();
  }, [resetAddressForm]);

  const closePaymentSection = useCallback(() => {
    setPaymentOpen(false);
    resetPaymentForm();
  }, [resetPaymentForm]);

  const closeSignInSection = useCallback(() => {
    setSignInOpen(false);
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: c.card, borderColor: c.border }]}>
          <Pressable onPress={() => void pickAvatar()} style={[styles.avatar, { backgroundColor: c.banner }]}>
            {profile?.avatarUri ? (
              <Image source={{ uri: profile.avatarUri }} style={styles.avatarImg} />
            ) : (
              <FontAwesome name="user" size={32} color={c.accent} />
            )}
            <View style={[styles.avatarEdit, { backgroundColor: c.accent }]}>
              <FontAwesome name="camera" size={11} color="#fff" />
            </View>
          </Pressable>
          <Text style={[styles.name, { color: c.text }]}>
            {isSignedIn ? `${profile?.firstName} ${profile?.lastName}` : 'DealHub shopper'}
          </Text>
          <Text style={[styles.email, { color: c.muted }]}>
            {isSignedIn ? profile?.email : 'Create your account to save profile details'}
          </Text>
          {!isSignedIn && !signInOpen ? (
            <Pressable onPress={() => setSignInOpen(true)} style={[styles.signIn, { backgroundColor: c.accent }]}>
              <Text style={styles.signInText}>Create account</Text>
            </Pressable>
          ) : null}
          {!isSignedIn && signInOpen ? (
            <View style={[styles.formCard, { backgroundColor: c.background, borderColor: c.border }]}>
              <Text style={[styles.formTitle, { color: c.text }]}>Create account</Text>
              <TextInput
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
                placeholder="Email"
                placeholderTextColor={c.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
                placeholder="First name"
                placeholderTextColor={c.muted}
                autoCorrect={false}
                spellCheck={false}
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
                placeholder="Last name"
                placeholderTextColor={c.muted}
                autoCorrect={false}
                spellCheck={false}
                value={lastName}
                onChangeText={setLastName}
              />
              <View style={styles.heroFormActions}>
                <Pressable
                  style={[styles.saveBtn, { backgroundColor: c.accent, flex: 1 }]}
                  onPress={() => void saveAccount()}>
                  <Text style={styles.saveBtnText}>Save account</Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryOutlineBtn, { borderColor: c.border, flex: 1 }]}
                  onPress={closeSignInSection}>
                  <Text style={[styles.secondaryOutlineBtnText, { color: c.muted }]}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
        <View style={styles.list}>
          <Row icon="cube" label="Your orders" scheme={scheme} onPress={() => router.push('/(tabs)/orders')} />
          <Row
            icon="map-marker"
            label={
              addresses.length === 0
                ? 'Addresses'
                : `${addresses.length} saved address${addresses.length === 1 ? '' : 'es'}`
            }
            scheme={scheme}
            expanded={addressOpen}
            onPress={() => {
              setAddressOpen((v) => {
                const next = !v;
                if (next) startNewAddress();
                return next;
              });
            }}
          />
          {addressOpen ? (
            <View style={[styles.formCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.formTitle, { color: c.text }]}>Saved addresses</Text>
              {addresses.map((a) => (
                <View
                  key={a.id}
                  style={[styles.addressRow, { borderColor: c.border, backgroundColor: c.background }]}>
                  <Pressable style={styles.addressRowMain} onPress={() => startEditAddress(a.id)}>
                    <View style={styles.addressRowText}>
                      <Text style={[styles.addressLabel, { color: c.text }]} numberOfLines={1}>
                        {a.label}
                        {defaultAddressId === a.id ? (
                          <Text style={[styles.defaultBadge, { color: c.accent }]}> · Default</Text>
                        ) : null}
                      </Text>
                      <Text style={[styles.addressSummary, { color: c.muted }]} numberOfLines={2}>
                        {a.line1}
                        {a.city ? `, ${a.city}` : ''}
                      </Text>
                    </View>
                  </Pressable>
                  <View style={styles.addressRowActions}>
                    {defaultAddressId !== a.id ? (
                      <Pressable
                        hitSlop={6}
                        onPress={() => void setDefaultAddressId(a.id)}
                        style={styles.iconHit}>
                        <FontAwesome name="star-o" size={18} color={c.accent} />
                      </Pressable>
                    ) : (
                      <FontAwesome name="star" size={18} color={c.accent} style={styles.iconHit} />
                    )}
                    <Pressable hitSlop={6} onPress={() => confirmRemoveAddress(a.id)} style={styles.iconHit}>
                      <FontAwesome name="trash-o" size={18} color={c.price} />
                    </Pressable>
                  </View>
                </View>
              ))}
              <Text style={[styles.formTitle, { color: c.text, marginTop: 8 }]}>
                {addressEditingId ? 'Edit address' : 'Add address'}
              </Text>
              <TextInput
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                placeholder="Label (e.g. Home, Mom)"
                placeholderTextColor={c.muted}
                value={addrLabel}
                onChangeText={setAddrLabel}
              />
              <TextInput
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                placeholder="Address line 1"
                placeholderTextColor={c.muted}
                value={line1}
                onChangeText={setLine1}
              />
              <TextInput
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                placeholder="Address line 2 (optional)"
                placeholderTextColor={c.muted}
                value={line2}
                onChangeText={setLine2}
              />
              <TextInput
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                placeholder="City"
                placeholderTextColor={c.muted}
                value={city}
                onChangeText={setCity}
              />
              <View style={styles.inline2}>
                <StateSelectorField
                  value={state}
                  onChange={setState}
                  colors={{
                    text: c.text,
                    muted: c.muted,
                    border: c.border,
                    background: c.background,
                    card: c.card,
                  }}
                  containerStyle={styles.inlineInput}
                  triggerStyle={styles.input}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.inlineInput,
                    { color: c.text, borderColor: c.border, backgroundColor: c.background },
                  ]}
                  placeholder="Postal code"
                  placeholderTextColor={c.muted}
                  value={postalCode}
                  onChangeText={setPostalCode}
                />
              </View>
              <View style={styles.addressFormActions}>
                <Pressable style={[styles.saveBtn, { backgroundColor: c.accent, flex: 1 }]} onPress={() => void saveAddress()}>
                  <Text style={styles.saveBtnText}>{addressEditingId ? 'Update address' : 'Save address'}</Text>
                </Pressable>
                {addressEditingId || line1 || addrLabel ? (
                  <Pressable
                    style={[styles.secondaryOutlineBtn, { borderColor: c.border }]}
                    onPress={() => startNewAddress()}>
                    <Text style={[styles.secondaryOutlineBtnText, { color: c.muted }]}>New</Text>
                  </Pressable>
                ) : null}
              </View>
              <Pressable onPress={closeAddressSection} style={styles.sectionDoneBtn} hitSlop={8}>
                <Text style={[styles.sectionDoneText, { color: c.accent }]}>Done</Text>
              </Pressable>
            </View>
          ) : null}
          <Row
            icon="credit-card"
            label={
              paymentMethods.length === 0
                ? 'Payments'
                : `${paymentMethods.length} saved payment method${paymentMethods.length === 1 ? '' : 's'}`
            }
            scheme={scheme}
            expanded={paymentOpen}
            onPress={() => {
              setPaymentOpen((v) => {
                const next = !v;
                if (next) startNewPayment();
                return next;
              });
            }}
          />
          {paymentOpen ? (
            <View style={[styles.formCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.formTitle, { color: c.text }]}>Saved payment methods</Text>
              {paymentMethods.map((m) => (
                <View
                  key={m.id}
                  style={[styles.addressRow, { borderColor: c.border, backgroundColor: c.background }]}>
                  <Pressable style={styles.addressRowMain} onPress={() => startEditPayment(m.id)}>
                    <View style={styles.addressRowText}>
                      <Text style={[styles.addressLabel, { color: c.text }]} numberOfLines={1}>
                        Card
                        {defaultPaymentId === m.id ? (
                          <Text style={[styles.defaultBadge, { color: c.accent }]}> · Default</Text>
                        ) : null}
                      </Text>
                      <Text style={[styles.addressSummary, { color: c.muted }]} numberOfLines={1}>
                        {maskCardLast4(methodLast4(m))} · {m.expiration}
                      </Text>
                    </View>
                  </Pressable>
                  <View style={styles.addressRowActions}>
                    {defaultPaymentId !== m.id ? (
                      <Pressable
                        hitSlop={6}
                        onPress={() => void setDefaultPaymentId(m.id)}
                        style={styles.iconHit}>
                        <FontAwesome name="star-o" size={18} color={c.accent} />
                      </Pressable>
                    ) : (
                      <FontAwesome name="star" size={18} color={c.accent} style={styles.iconHit} />
                    )}
                    <Pressable hitSlop={6} onPress={() => confirmRemovePayment(m.id)} style={styles.iconHit}>
                      <FontAwesome name="trash-o" size={18} color={c.price} />
                    </Pressable>
                  </View>
                </View>
              ))}
              <Text style={[styles.formTitle, { color: c.text, marginTop: 8 }]}>
                {paymentEditingId ? 'Update card' : 'Add card'}
              </Text>
              <TextInput
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                placeholder="Card number (16 digits)"
                placeholderTextColor={c.muted}
                keyboardType="number-pad"
                maxLength={MAX_CARD_DIGITS}
                value={cardNumber}
                onChangeText={(t) => setCardNumber(clampCardDigits(t))}
              />
              <View style={styles.inline2}>
                <CardExpirationPickers
                  value={expiration}
                  onChange={setExpiration}
                  colors={{
                    text: c.text,
                    muted: c.muted,
                    border: c.border,
                    background: c.background,
                    card: c.card,
                  }}
                  style={styles.expirationRow}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.cvvCompact,
                    { color: c.text, borderColor: c.border, backgroundColor: c.background },
                  ]}
                  placeholder="CVV"
                  placeholderTextColor={c.muted}
                  keyboardType="number-pad"
                  secureTextEntry
                  value={cvv}
                  onChangeText={setCvv}
                />
              </View>
              <Text style={[styles.maskHint, { color: c.muted }]}>
                {paymentEditingId
                  ? 'Enter the full card number again to replace this card on file.'
                  : 'Card numbers are stored masked on this device only.'}
              </Text>
              <View style={styles.addressFormActions}>
                <Pressable style={[styles.saveBtn, { backgroundColor: c.accent, flex: 1 }]} onPress={() => void savePayment()}>
                  <Text style={styles.saveBtnText}>{paymentEditingId ? 'Update card' : 'Save card'}</Text>
                </Pressable>
                {paymentEditingId || cardNumber || expiration || cvv ? (
                  <Pressable
                    style={[styles.secondaryOutlineBtn, { borderColor: c.border }]}
                    onPress={() => startNewPayment()}>
                    <Text style={[styles.secondaryOutlineBtnText, { color: c.muted }]}>New</Text>
                  </Pressable>
                ) : null}
              </View>
              <Pressable onPress={closePaymentSection} style={styles.sectionDoneBtn} hitSlop={8}>
                <Text style={[styles.sectionDoneText, { color: c.accent }]}>Done</Text>
              </Pressable>
            </View>
          ) : null}
          <StoreCreditLoadSlat />
        </View>
        {!hydrated ? <Text style={[styles.hydrating, { color: c.muted }]}>Loading account...</Text> : null}
        <View style={styles.list}>
          <View style={[styles.appearanceSlat, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.appearanceSlatTitle, { color: c.text }]}>Appearance</Text>
            <View style={[styles.appearanceSlatDivider, { backgroundColor: c.border }]} />
            <Pressable
              onPress={() => void setThemePreference('light')}
              style={({ pressed }) => [
                styles.appearanceRow,
                {
                  backgroundColor: themePreference === 'light' ? c.banner : 'transparent',
                  borderBottomColor: c.border,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}>
              <FontAwesome name="sun-o" size={18} color={c.accent} style={styles.appearanceRowIcon} />
              <Text style={[styles.appearanceRowLabel, { color: c.text }]}>Light</Text>
              {themePreference === 'light' ? (
                <FontAwesome name="check" size={18} color={c.accent} style={styles.appearanceRowCheck} />
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => void setThemePreference('dark')}
              style={({ pressed }) => [
                styles.appearanceRow,
                {
                  backgroundColor: themePreference === 'dark' ? c.banner : 'transparent',
                  borderBottomColor: c.border,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}>
              <FontAwesome name="moon-o" size={18} color={c.accent} style={styles.appearanceRowIcon} />
              <Text style={[styles.appearanceRowLabel, { color: c.text }]}>Dark</Text>
              {themePreference === 'dark' ? (
                <FontAwesome name="check" size={18} color={c.accent} style={styles.appearanceRowCheck} />
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => void setThemePreference('system')}
              style={({ pressed }) => [
                styles.appearanceRow,
                styles.appearanceRowLast,
                {
                  backgroundColor: themePreference === 'system' ? c.banner : 'transparent',
                  opacity: pressed ? 0.92 : 1,
                },
              ]}>
              <FontAwesome name="mobile" size={18} color={c.accent} style={styles.appearanceRowIcon} />
              <Text style={[styles.appearanceRowLabel, { color: c.text }]}>Use device setting</Text>
              {themePreference === 'system' ? (
                <FontAwesome name="check" size={18} color={c.accent} style={styles.appearanceRowCheck} />
              ) : null}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  hero: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarEdit: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 20, fontWeight: '800' },
  email: { fontSize: 14, marginTop: 4, marginBottom: 16 },
  signIn: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
  },
  signInText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  list: { padding: 16, gap: 10 },
  appearanceSlat: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  appearanceSlatTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  appearanceSlatDivider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  appearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  appearanceRowLast: {
    borderBottomWidth: 0,
  },
  appearanceRowIcon: { width: 28 },
  appearanceRowLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  appearanceRowCheck: { marginLeft: 8 },
  formCard: {
    borderWidth: 1,
    borderRadius: 14,
    width: '100%',
    padding: 16,
    gap: 8,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
  },
  inline2: { flexDirection: 'row', gap: 8 },
  inlineInput: { flex: 1, minWidth: 0 },
  expirationRow: { flex: 1, minWidth: 0 },
  cvvCompact: { width: 80, flexShrink: 0, paddingHorizontal: 10 },
  saveBtn: {
    marginTop: 4,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  maskHint: { fontSize: 12, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowIcon: { width: 28 },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  hydrating: { paddingHorizontal: 16, fontSize: 12, marginTop: 8 },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  addressRowMain: { flex: 1, padding: 12 },
  addressRowText: { flex: 1 },
  addressLabel: { fontSize: 15, fontWeight: '800' },
  defaultBadge: { fontWeight: '700', fontSize: 13 },
  addressSummary: { fontSize: 13, marginTop: 4 },
  addressRowActions: { flexDirection: 'row', alignItems: 'center', paddingRight: 8, gap: 4 },
  iconHit: { padding: 8 },
  addressFormActions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  secondaryOutlineBtn: {
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryOutlineBtnText: { fontSize: 14, fontWeight: '700' },
  heroFormActions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  sectionDoneBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionDoneText: { fontSize: 16, fontWeight: '800' },
});
