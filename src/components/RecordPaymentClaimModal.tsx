import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Modal } from './Modal';
import { PaymentDisclaimerModal } from './PaymentDisclaimerModal';
import { apiPost } from '../utils/apiClient';
import { formatFullCurrency } from '../utils/currencyFormatter';
import { useTheme } from '../theme/ThemeContext';

interface RecordPaymentClaimModalProps {
  visible: boolean;
  onClose: () => void;
  leaseId: string;
  monthlyRent: number;
  propertyName?: string;
  unitNumber?: string;
  tenantId?: string;
  onClaimRecorded?: () => void;
}

const PaymentMethod = {
  CASH: 'CASH',
  MTN: 'MTN',
  AIRTEL: 'AIRTEL',
  BANK_TRANSFER: 'BANK_TRANSFER'
} as const;

type PaymentMethodType = typeof PaymentMethod[keyof typeof PaymentMethod];

interface PaymentMethodOption {
  key: PaymentMethodType;
  label: string;
  icon: string;
  description: string;
}

const paymentMethods: PaymentMethodOption[] = [
  {
    key: PaymentMethod.CASH,
    label: 'Cash',
    icon: 'cash-outline',
    description: 'Physical cash payment'
  },
  {
    key: PaymentMethod.MTN,
    label: 'MTN Mobile Money',
    icon: 'phone-portrait-outline',
    description: 'MTN MoMo payment'
  },
  {
    key: PaymentMethod.AIRTEL,
    label: 'Airtel Money',
    icon: 'phone-portrait-outline',
    description: 'Airtel Money payment'
  },
  {
    key: PaymentMethod.BANK_TRANSFER,
    label: 'Bank Transfer',
    icon: 'card-outline',
    description: 'Direct bank transfer'
  }
];

export const RecordPaymentClaimModal: React.FC<RecordPaymentClaimModalProps> = ({
  visible,
  onClose,
  leaseId,
  monthlyRent,
  propertyName,
  unitNumber,
  tenantId,
  onClaimRecorded
}) => {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [referenceText, setReferenceText] = useState('');
  const [claimedPaidAt, setClaimedPaidAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setAmount('');
      setSelectedMethod(null);
      setReferenceText('');
      setClaimedPaidAt(new Date());
      setShowDatePicker(false);
    }
  }, [visible]);

  const formatAmountInput = (text: string) => {
    // Remove non-digits
    const cleaned = text.replace(/[^0-9]/g, '');
    if (!cleaned) return '';

    // Format with commas
    const number = parseInt(cleaned, 10);
    return number.toLocaleString();
  };

  const getAmountValue = () => {
    const cleaned = amount.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  const getMonthsPaid = () => {
    const amountValue = getAmountValue();
    if (!amountValue || !monthlyRent) return 0;
    return Math.floor(amountValue / monthlyRent);
  };

  const isValidAmount = () => {
    const amountValue = getAmountValue();
    if (amountValue <= 0) return false;

    const months = amountValue / monthlyRent;
    return months === Math.floor(months) && months >= 1 && months <= 5;
  };

  const getAmountError = () => {
    const amountValue = getAmountValue();
    if (!amountValue) return 'Amount is required';

    if (amountValue % monthlyRent !== 0) {
      return 'Amount must be exact multiples of monthly rent';
    }

    const months = amountValue / monthlyRent;
    if (months < 1) return 'Minimum 1 month of rent required';
    if (months > 5) return 'Maximum 5 months of rent allowed';

    return null;
  };

  const getQuickAmountOptions = () => {
    const options = [];
    for (let months = 1; months <= 5; months++) {
      const value = monthlyRent * months;
      options.push({
        months,
        amount: value,
        label: `${months} month${months > 1 ? 's' : ''}`
      });
    }
    return options;
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toLocaleString());
  };

  const handleSubmit = async () => {
    if (!isValidAmount() || !selectedMethod) return;

    // Show disclaimer if not accepted yet
    if (!disclaimerAccepted) {
      setShowDisclaimer(true);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        leaseId,
        amount: getAmountValue(),
        claimedPaidAt: claimedPaidAt.toISOString(),
        method: selectedMethod,
        referenceText: referenceText.trim() || undefined
      };

      const response = await apiPost('/tenant/payment-claims', payload);

      if (response.status === 201 && response.json?.success) {
        Alert.alert(
          'Payment Claim Submitted',
          'Your payment claim has been submitted for manager verification. You will be notified once it is reviewed.',
          [{ text: 'OK', onPress: onClose }]
        );
        onClaimRecorded?.();
      } else {
        Alert.alert('Error', response.json?.message || 'Failed to submit payment claim');
      }
    } catch (error) {
      console.error('Submit payment claim error:', error);
      Alert.alert('Error', 'Failed to submit payment claim. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisclaimerAccept = () => {
    setDisclaimerAccepted(true);
    setShowDisclaimer(false);
    // Automatically proceed with submission after accepting disclaimer
    handleSubmit();
  };

  const handleDisclaimerDecline = () => {
    setShowDisclaimer(false);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setClaimedPaidAt(selectedDate);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Record Payment Claim"
      size="large"
    >
      <View>
        {/* Lease Information */}
        {(propertyName || unitNumber) && (
          <View style={[styles.section, styles.leaseInfo]}>
            <Text style={styles.sectionTitle}>Lease Information</Text>
            {propertyName && (
              <View style={styles.infoRow}>
                <Ionicons name="business-outline" size={16} color="#666" />
                <Text style={styles.infoText}>Property: {propertyName}</Text>
              </View>
            )}
            {unitNumber && (
              <View style={styles.infoRow}>
                <Ionicons name="home-outline" size={16} color="#666" />
                <Text style={styles.infoText}>Unit: {unitNumber}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={16} color="#666" />
              <Text style={styles.infoText}>Monthly Rent: {formatFullCurrency(monthlyRent)}</Text>
            </View>
          </View>
        )}

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Amount Paid</Text>
          <TextInput
            style={[
              styles.amountInput,
              !isValidAmount() && amount ? styles.inputError : null
            ]}
            value={amount}
            onChangeText={(text) => setAmount(formatAmountInput(text))}
            placeholder="Enter amount"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
          {amount && (
            <Text style={styles.amountHelp}>
              {isValidAmount()
                ? `${getMonthsPaid()} month${getMonthsPaid() > 1 ? 's' : ''} of rent`
                : getAmountError()
              }
            </Text>
          )}
        </View>

        {/* Quick Amount Buttons */}
        <View style={styles.section}>
          <Text style={styles.label}>Quick Select</Text>
          <View style={styles.quickAmounts}>
            {getQuickAmountOptions().map((option) => (
              <TouchableOpacity
                key={option.months}
                style={[
                  styles.quickAmountButton,
                  getAmountValue() === option.amount && styles.quickAmountSelected
                ]}
                onPress={() => handleQuickAmount(option.amount)}
              >
                <Text style={[
                  styles.quickAmountText,
                  getAmountValue() === option.amount && styles.quickAmountTextSelected
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.quickAmountAmount,
                  getAmountValue() === option.amount && styles.quickAmountTextSelected
                ]}>
                  {formatFullCurrency(option.amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.label}>Payment Method</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.key}
              style={[
                styles.methodOption,
                selectedMethod === method.key && styles.methodSelected
              ]}
              onPress={() => setSelectedMethod(method.key)}
            >
              <View style={styles.methodContent}>
                <Ionicons
                  name={method.icon as any}
                  size={24}
                  color={selectedMethod === method.key ? '#007AFF' : '#666'}
                />
                <View style={styles.methodText}>
                  <Text style={[
                    styles.methodLabel,
                    selectedMethod === method.key && styles.methodLabelSelected
                  ]}>
                    {method.label}
                  </Text>
                  <Text style={styles.methodDescription}>{method.description}</Text>
                </View>
              </View>
              {selectedMethod === method.key && (
                <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Date Paid</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <Text style={styles.dateText}>
              {claimedPaidAt.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reference/Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Reference/Notes (Optional)</Text>
          <TextInput
            style={styles.referenceInput}
            value={referenceText}
            onChangeText={setReferenceText}
            placeholder="e.g., Transaction ID, receipt number, or any notes"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.infoBoxText}>
            By submitting this claim, you confirm that you have made the payment. The property manager will verify and approve your payment.
          </Text>
        </View>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isValidAmount() || !selectedMethod || loading) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!isValidAmount() || !selectedMethod || loading}
          >
            <Text style={[
              styles.submitButtonText,
              (!isValidAmount() || !selectedMethod || loading) && styles.submitButtonTextDisabled
            ]}>
              {loading ? 'Submitting...' : 'Submit Payment Claim'}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={claimedPaidAt}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>

      {/* Payment Disclaimer Modal */}
      <PaymentDisclaimerModal
        visible={showDisclaimer}
        onAccept={handleDisclaimerAccept}
        onDecline={handleDisclaimerDecline}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  amountHelp: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  quickAmountSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  quickAmountTextSelected: {
    color: '#007AFF',
  },
  quickAmountAmount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  methodOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  methodSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodText: {
    marginLeft: 12,
    flex: 1,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  methodLabelSelected: {
    color: '#007AFF',
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  referenceInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  infoBoxText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: '#999',
  },
  leaseInfo: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
});
