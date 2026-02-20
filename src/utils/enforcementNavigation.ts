import { CommonActions } from '@react-navigation/native';
import { EnforcementInfo } from './apiClient';

/**
 * Navigate the manager to the Billing screen when an enforcement 402 is received.
 *
 * Strategy (ordered by reliability):
 *  1. Navigate to ManagerTabs → Billing tab (works from any nested stack screen)
 *  2. Direct navigate to "Billing" (works when already inside ManagerTabs)
 *  3. Direct navigate to "ManagerBilling" (stack-level fallback)
 *  4. CommonActions.navigate dispatch (last-resort, works from any navigator depth)
 *
 * All attempts pass the same params so the Billing screen can render the
 * enforcement banner regardless of which path succeeded.
 */
export const handleEnforcement = async (
  navigation: any,
  enforcement?: EnforcementInfo,
  options?: { blockedFeature?: string },
): Promise<boolean> => {
  if (!enforcement) return false;

  const blockedFeature = options?.blockedFeature;
  const bannerMessage =
    enforcement.action === 'ACCEPT_TERMS'
      ? 'You must accept terms before using this feature.'
      : 'You must pay before using this feature.';

  const params = {
    enforcementBanner: bannerMessage,
    blockedFeature,
    enforcement: {
      action: enforcement.action,
      message: enforcement.message,
      graceUntil: enforcement.graceUntil,
    },
  };

  if (__DEV__) {
    console.log('[Enforcement] TRIGGERED — action:', enforcement.action,
      '| feature:', blockedFeature,
      '| message:', enforcement.message);
  }

  // ── Attempt 1: ManagerTabs → Billing tab (most reliable from nested screens) ──
  try {
    const root = navigation.getParent?.() ?? navigation;
    root.navigate('ManagerTabs', { screen: 'Billing', params });
    if (__DEV__) console.log('[Enforcement] Attempt 1 dispatched: ManagerTabs → Billing');
    return true;
  } catch (e) {
    if (__DEV__) console.log('[Enforcement] Attempt 1 failed:', (e as Error).message);
  }

  // ── Attempt 2: Direct navigate to "Billing" ──
  try {
    navigation.navigate('Billing', params);
    if (__DEV__) console.log('[Enforcement] Attempt 2 dispatched: navigate("Billing")');
    return true;
  } catch (e) {
    if (__DEV__) console.log('[Enforcement] Attempt 2 failed:', (e as Error).message);
  }

  // ── Attempt 3: Direct navigate to "ManagerBilling" (stack screen) ──
  try {
    navigation.navigate('ManagerBilling', params);
    if (__DEV__) console.log('[Enforcement] Attempt 3 dispatched: navigate("ManagerBilling")');
    return true;
  } catch (e) {
    if (__DEV__) console.log('[Enforcement] Attempt 3 failed:', (e as Error).message);
  }

  // ── Attempt 4: CommonActions dispatch (works from any depth) ──
  try {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'ManagerTabs',
        params: { screen: 'Billing', params },
      }),
    );
    if (__DEV__) console.log('[Enforcement] Attempt 4 dispatched: CommonActions.navigate');
    return true;
  } catch (e) {
    if (__DEV__) console.log('[Enforcement] Attempt 4 failed:', (e as Error).message);
  }

  if (__DEV__) {
    console.log('[Enforcement] ALL ATTEMPTS FAILED — could not navigate to Billing');
  }

  return false;
};
