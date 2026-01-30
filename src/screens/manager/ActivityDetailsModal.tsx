import React from 'react';
import { View, Text } from 'react-native';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { useTheme } from '../../theme/ThemeContext';
import { Activity } from '../../types/types';
import { Ionicons } from '@expo/vector-icons';

interface ActivityDetailsModalProps {
    visible: boolean;
    onClose: () => void;
    activity: any | null;  // Using any to allow flexible activity data
    onViewReceipt?: () => void;
    onViewTenant?: () => void;
    onTrackMaintenance?: () => void;
}

export const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({
    visible,
    onClose,
    activity,
    onViewReceipt,
    onViewTenant,
    onTrackMaintenance,
}) => {
    const { colors, spacing, typography } = useTheme();

    if (!activity) return null;

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'payment':
                return 'cash';
            case 'tenant_added':
                return 'person-add';
            case 'maintenance':
                return 'hammer';
            case 'vacancy':
                return 'home-outline';
            default:
                return 'information-circle';
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case 'payment':
                return colors.success;
            case 'tenant_added':
                return colors.primary;
            case 'maintenance':
                return colors.warning;
            case 'vacancy':
                return colors.error;
            default:
                return colors.textSecondary;
        }
    };

    return (
        <Modal visible={visible} onClose={onClose} title="Activity Details" size="medium">
            <View>
                {/* Activity Icon */}
                <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                    <View
                        style={{
                            backgroundColor: getActivityColor(activity.type) + '20',
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: spacing.md,
                        }}
                    >
                        <Ionicons name={getActivityIcon(activity.type)} size={40} color={getActivityColor(activity.type)} />
                    </View>
                    <Text style={[typography.h3, { color: colors.text, textAlign: 'center' }]}>
                        {activity.title}
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }]}>
                        {new Date(activity.timestamp).toLocaleString()}
                    </Text>
                </View>

                {/* Activity Details */}
                <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: 12, marginBottom: spacing.lg }}>
                    <Text style={[typography.h4, { color: colors.text, marginBottom: spacing.md }]}>
                        Details
                    </Text>
                    <View style={{ gap: spacing.md }}>
                        <InfoRow label="Type" value={activity.type.replace('_', ' ').toUpperCase()} colors={colors} typography={typography} />
                        <InfoRow label="Description" value={activity.description} colors={colors} typography={typography} />
                        {activity.amount && (
                            <InfoRow label="Amount" value={`UGX ${activity.amount.toLocaleString()}`} colors={colors} typography={typography} />
                        )}
                        {activity.propertyName && (
                            <InfoRow label="Property" value={activity.propertyName} colors={colors} typography={typography} />
                        )}
                        {activity.tenantName && (
                            <InfoRow label="Tenant" value={activity.tenantName} colors={colors} typography={typography} />
                        )}
                    </View>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    {activity.type === 'payment' && onViewReceipt && (
                        <Button
                            title="View Receipt"
                            onPress={() => {
                                onClose();
                                setTimeout(() => onViewReceipt(), 300);
                            }}
                            variant="outline"
                            size="medium"
                            style={{ flex: 1 }}
                            icon={<Ionicons name="receipt-outline" size={16} color={colors.primary} />}
                        />
                    )}
                    {activity.type === 'tenant_added' && onViewTenant && (
                        <Button
                            title="View Tenant"
                            onPress={() => {
                                onClose();
                                setTimeout(() => onViewTenant(), 300);
                            }}
                            variant="outline"
                            size="medium"
                            style={{ flex: 1 }}
                            icon={<Ionicons name="person-outline" size={16} color={colors.primary} />}
                        />
                    )}
                    {activity.type === 'maintenance' && onTrackMaintenance && (
                        <Button
                            title="Track Status"
                            onPress={() => {
                                onClose();
                                setTimeout(() => onTrackMaintenance(), 300);
                            }}
                            variant="outline"
                            size="medium"
                            style={{ flex: 1 }}
                            icon={<Ionicons name="hammer-outline" size={16} color={colors.primary} />}
                        />
                    )}
                    <Button
                        title="Close"
                        onPress={onClose}
                        variant="primary"
                        size="medium"
                        style={{ flex: 1 }}
                    />
                </View>
            </View>
        </Modal>
    );
};

const InfoRow = ({ label, value, colors, typography }: any) => (
    <View>
        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[typography.body, { color: colors.text, marginTop: 4, fontWeight: '600' }]}>{value}</Text>
    </View>
);
