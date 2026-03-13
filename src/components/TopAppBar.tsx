import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationContext';

interface TopAppBarProps {
    onNotificationsPress: () => void;
    onProfilePress: () => void;
    onStatusPress?: () => void;
    profileImage?: string | null;
    notificationCount?: number;
    pendingPayments?: number;
    remindersCount?: number;
    propertyCount?: number;
    unitCount?: number;
    propertyName?: string;
    unitNumber?: string;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
    onNotificationsPress,
    onProfilePress,
    onStatusPress,
    profileImage,
    pendingPayments = 0,
    remindersCount = 0,
    propertyCount = 0,
    unitCount = 0,
    propertyName,
    unitNumber,
}) => {
    const { colors, spacing, typography, borderRadius, isDark, toggleTheme } = useTheme();
    const { user } = useAuth();
    const { notifications, unreadCount, loadNotifications, markAsRead, markAllAsRead } = useNotifications();
    const insets = useSafeAreaInsets();
    const [showNotificationsModal, setShowNotificationsModal] = useState(false);
    const [showNotificationDetails, setShowNotificationDetails] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<any>(null);

    const isManager = user?.role === 'MANAGER';
    const isOwner = user?.role === 'OWNER';

    const handleNotificationsPress = async () => {
        await loadNotifications();
        setShowNotificationsModal(true);
    };

    const getGreeting = (): string => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning,';
        if (hour < 17) return 'Good Afternoon,';
        return 'Good Evening,';
    };

    const getFirstName = (fullName: string | undefined): string => {
        if (!fullName) return 'User';
        return fullName.split(' ')[0];
    };

    const getInitials = (name: string | undefined): string => {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const getStatusText = (): string | null => {
        if (!isManager) return null;
        if (pendingPayments > 0) {
            return `${pendingPayments} Payment${pendingPayments > 1 ? 's' : ''} Pending`;
        }
        if (remindersCount > 0) {
            return `${remindersCount} Reminder${remindersCount > 1 ? 's' : ''} Due`;
        }
        return null;
    };

    const statusText = getStatusText();

    return (
        <View style={{
            backgroundColor: colors.background,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: spacing.md,
            paddingHorizontal: spacing.base,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        }}>
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                {/* Left Section: Greeting & Identity */}
                <View style={{ flex: 1, marginRight: spacing.md }}>
                    <Text style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        fontWeight: '600',
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                    }}>
                        {getGreeting()}
                    </Text>
                    <Text style={{
                        fontSize: 22,
                        fontWeight: '700',
                        color: colors.text,
                        marginTop: 4,
                        letterSpacing: -0.5,
                    }}>
                        {isManager ? user?.name : getFirstName(user?.name)}
                    </Text>

                    {/* Subtext - Role specific */}
                    {(isManager || isOwner) ? (
                        <Text style={{
                            fontSize: 11,
                            color: colors.textTertiary,
                            marginTop: 4,
                            fontWeight: '500',
                        }}>
                            {propertyCount} {propertyCount === 1 ? 'Property' : 'Properties'} · {unitCount} Units
                        </Text>
                    ) : (
                        propertyName && unitNumber && (
                            <Text style={{
                                fontSize: 11,
                                color: colors.textTertiary,
                                marginTop: 4,
                                fontWeight: '500',
                            }}>
                                {unitNumber} – {propertyName}
                            </Text>
                        )
                    )}
                </View>

                {/* Right Section: Actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    {/* Quick Status Indicator - Manager Only */}
                    {isManager && statusText && (
                        <TouchableOpacity
                            onPress={onStatusPress}
                            activeOpacity={0.7}
                            style={{
                                backgroundColor: pendingPayments > 0 ? colors.warning + '15' : colors.info + '15',
                                paddingHorizontal: spacing.sm,
                                paddingVertical: spacing.xs,
                                borderRadius: borderRadius.full,
                                borderWidth: 1,
                                borderColor: pendingPayments > 0 ? colors.warning + '30' : colors.info + '30',
                                marginRight: spacing.xs,
                            }}
                        >
                            <Text style={{
                                fontSize: 11,
                                fontWeight: '600',
                                color: pendingPayments > 0 ? colors.warning : colors.info,
                            }}>
                                {statusText}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Notifications */}
                    <TouchableOpacity
                        onPress={handleNotificationsPress}
                        activeOpacity={0.7}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: colors.surface,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Ionicons name="notifications-outline" size={20} color={colors.text} />
                        {unreadCount > 0 && (
                            <View style={{
                                position: 'absolute',
                                top: 6,
                                right: 6,
                                backgroundColor: colors.error,
                                width: 16,
                                height: 16,
                                borderRadius: 8,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 2,
                                borderColor: colors.background,
                            }}>
                                <Text style={{
                                    fontSize: 9,
                                    fontWeight: '700',
                                    color: '#FFFFFF',
                                }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Theme Toggle */}
                    <TouchableOpacity
                        onPress={toggleTheme}
                        activeOpacity={0.7}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: colors.surface,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Ionicons
                            name={isDark ? "sunny-outline" : "moon-outline"}
                            size={20}
                            color={isDark ? colors.accent : colors.text}
                        />
                    </TouchableOpacity>

                    {/* Profile Avatar */}
                    <TouchableOpacity
                        onPress={onProfilePress}
                        activeOpacity={0.7}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            overflow: 'hidden',
                            borderWidth: 2,
                            borderColor: colors.primary,
                        }}
                    >
                        {profileImage ? (
                            <Image
                                source={{ uri: profileImage }}
                                style={{ width: '100%', height: '100%' }}
                            />
                        ) : (
                            <View style={{
                                flex: 1,
                                backgroundColor: colors.primary + '20',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Text style={{
                                    fontSize: 14,
                                    fontWeight: '700',
                                    color: colors.primary,
                                }}>
                                    {getInitials(user?.name)}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Notifications Modal */}
            <Modal
                visible={showNotificationsModal}
                onClose={() => setShowNotificationsModal(false)}
                title="Notifications"
                size="large"
            >
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
                    {notifications.length === 0 ? (
                        <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
                            <View style={{
                                width: 72,
                                height: 72,
                                borderRadius: 36,
                                backgroundColor: colors.primary + '15',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: spacing.md,
                            }}>
                                <Ionicons name="notifications-off-outline" size={32} color={colors.primary} />
                            </View>
                            <Text style={[typography.h4, { color: colors.text, textAlign: 'center' }]}>No notifications</Text>
                            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
                                You're all caught up!
                            </Text>
                        </View>
                    ) : (
                        <View>
                            {unreadCount > 0 && (
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: spacing.md,
                                    paddingHorizontal: spacing.xs,
                                }}>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                        {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                                    </Text>
                                    <TouchableOpacity onPress={markAllAsRead}>
                                        <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '600' }]}>
                                            Mark all as read
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {notifications.map((notification, index) => (
                                <React.Fragment key={notification.id}>
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={async () => {
                                            if (!notification.read) {
                                                await markAsRead(notification.id);
                                            }
                                            setSelectedNotification(notification);
                                            setShowNotificationsModal(false);
                                            setTimeout(() => setShowNotificationDetails(true), 300);
                                        }}
                                        style={{
                                            flexDirection: 'row',
                                            padding: spacing.md,
                                            backgroundColor: notification.read ? 'transparent' : colors.primary + '08',
                                            borderRadius: borderRadius.md,
                                            marginBottom: spacing.xs,
                                        }}
                                    >
                                        <View style={{
                                            backgroundColor: notification.iconBg,
                                            width: 44,
                                            height: 44,
                                            borderRadius: 22,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: spacing.md,
                                        }}>
                                            <Ionicons name={notification.icon as any} size={22} color={notification.iconColor} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                                <Text style={[typography.body, {
                                                    color: colors.text,
                                                    fontWeight: notification.read ? '500' : '700',
                                                    flex: 1,
                                                }]} numberOfLines={1}>
                                                    {notification.title}
                                                </Text>
                                                {!notification.read && (
                                                    <View style={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: 4,
                                                        backgroundColor: colors.primary,
                                                        marginLeft: spacing.sm,
                                                    }} />
                                                )}
                                            </View>
                                            <Text style={[typography.bodySmall, {
                                                color: colors.textSecondary,
                                                marginBottom: 4,
                                            }]} numberOfLines={2}>
                                                {notification.message}
                                            </Text>
                                            <Text style={{ fontSize: 11, color: colors.textTertiary }}>
                                                {notification.time}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                    {index < notifications.length - 1 && (
                                        <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: spacing.xs }} />
                                    )}
                                </React.Fragment>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </Modal>

            {/* Notification Details Modal */}
            <Modal
                visible={showNotificationDetails}
                onClose={() => {
                    setShowNotificationDetails(false);
                    setSelectedNotification(null);
                }}
                title={selectedNotification?.title || 'Notification'}
                size="medium"
            >
                {selectedNotification && (
                    <View>
                        {/* Icon Header */}
                        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                            <View style={{
                                width: 64,
                                height: 64,
                                borderRadius: 32,
                                backgroundColor: selectedNotification.iconBg,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Ionicons name={selectedNotification.icon} size={32} color={selectedNotification.iconColor} />
                            </View>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                                {selectedNotification.time}
                            </Text>
                        </View>

                        {/* Details based on notification type */}
                        <View style={{
                            backgroundColor: colors.surface,
                            borderRadius: borderRadius.lg,
                            padding: spacing.lg,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}>
                            {selectedNotification.type === 'payment' && selectedNotification.details && (
                                <>
                                    <DetailRow label="Tenant" value={selectedNotification.details.tenantName} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Amount" value={`UGX ${selectedNotification.details.amount.toLocaleString()}`} colors={colors} typography={typography} spacing={spacing} valueColor={colors.success} />
                                    <DetailRow label="Unit" value={selectedNotification.details.unit} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Property" value={selectedNotification.details.property} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Method" value={selectedNotification.details.paymentMethod} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Date" value={selectedNotification.details.date} colors={colors} typography={typography} spacing={spacing} isLast />
                                </>
                            )}

                            {selectedNotification.type === 'tenant_request' && selectedNotification.details && (
                                <>
                                    <DetailRow label="Applicant" value={selectedNotification.details.tenantName} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Phone" value={selectedNotification.details.phone} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Email" value={selectedNotification.details.email} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Unit" value={selectedNotification.details.unit} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Property" value={selectedNotification.details.property} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Requested" value={selectedNotification.details.requestDate} colors={colors} typography={typography} spacing={spacing} isLast />
                                </>
                            )}

                            {selectedNotification.type === 'maintenance' && selectedNotification.details && (
                                <>
                                    <DetailRow label="Issue" value={selectedNotification.details.issue} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Priority" value={selectedNotification.details.priority} colors={colors} typography={typography} spacing={spacing} valueColor={colors.warning} />
                                    <DetailRow label="Unit" value={selectedNotification.details.unit} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Property" value={selectedNotification.details.property} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Reported By" value={selectedNotification.details.reportedBy} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Date" value={selectedNotification.details.reportDate} colors={colors} typography={typography} spacing={spacing} />
                                    <View style={{ marginTop: spacing.md }}>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: 4 }]}>Description</Text>
                                        <Text style={[typography.body, { color: colors.text }]}>{selectedNotification.details.description}</Text>
                                    </View>
                                </>
                            )}

                            {selectedNotification.type === 'reminder' && selectedNotification.details && (
                                <>
                                    <DetailRow label="Overdue Tenants" value={`${selectedNotification.details.overdueCount} tenants`} colors={colors} typography={typography} spacing={spacing} valueColor={colors.error} />
                                    <DetailRow label="Total Amount" value={`UGX ${selectedNotification.details.totalAmount.toLocaleString()}`} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Due Date" value={selectedNotification.details.dueDate} colors={colors} typography={typography} spacing={spacing} />
                                    <View style={{ marginTop: spacing.md }}>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Affected Tenants</Text>
                                        {selectedNotification.details.tenants.map((tenant: string, idx: number) => (
                                            <Text key={idx} style={[typography.body, { color: colors.text, marginBottom: 4 }]}>• {tenant}</Text>
                                        ))}
                                    </View>
                                </>
                            )}

                            {selectedNotification.type === 'rent_due' && selectedNotification.details && (
                                <>
                                    <DetailRow label="Amount Due" value={`UGX ${selectedNotification.details.amount.toLocaleString()}`} colors={colors} typography={typography} spacing={spacing} valueColor={colors.warning} />
                                    <DetailRow label="Due Date" value={selectedNotification.details.dueDate} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Days Remaining" value={`${selectedNotification.details.daysRemaining} days`} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Property" value={selectedNotification.details.property} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Unit" value={selectedNotification.details.unit} colors={colors} typography={typography} spacing={spacing} isLast />
                                </>
                            )}

                            {selectedNotification.type === 'payment_confirmed' && selectedNotification.details && (
                                <>
                                    <DetailRow label="Amount" value={`UGX ${selectedNotification.details.amount.toLocaleString()}`} colors={colors} typography={typography} spacing={spacing} valueColor={colors.success} />
                                    <DetailRow label="Period" value={selectedNotification.details.period} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Payment Date" value={selectedNotification.details.paymentDate} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Method" value={selectedNotification.details.paymentMethod} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Transaction ID" value={selectedNotification.details.transactionId} colors={colors} typography={typography} spacing={spacing} valueColor={colors.primary} isLast />
                                </>
                            )}

                            {selectedNotification.type === 'message' && selectedNotification.details && (
                                <>
                                    <DetailRow label="From" value={selectedNotification.details.from} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Subject" value={selectedNotification.details.subject} colors={colors} typography={typography} spacing={spacing} />
                                    <DetailRow label="Sent" value={selectedNotification.details.sentDate} colors={colors} typography={typography} spacing={spacing} />
                                    <View style={{ marginTop: spacing.md }}>
                                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Message</Text>
                                        <Text style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
                                            {selectedNotification.details.fullMessage}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                )}
            </Modal>
        </View>
    );
};

// Helper component for detail rows
const DetailRow = ({ label, value, colors, typography, spacing, valueColor, isLast }: any) => (
    <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.divider,
    }}>
        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[typography.body, { color: valueColor || colors.text, fontWeight: '500', maxWidth: '60%', textAlign: 'right' }]}>{value}</Text>
    </View>
);

export default TopAppBar;
