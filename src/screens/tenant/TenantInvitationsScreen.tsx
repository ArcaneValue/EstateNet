import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { apiGet, apiPost } from '../../utils/apiClient';

interface TenantInvitation {
    id: string;
    tenantId: string;
    propertyId: string;
    unitId: string;
    rentAmount: number;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
    createdAt: string;
    property: {
        name: string;
        location: string;
    };
    unit: {
        unitNumber: string;
    };
}

export const TenantInvitationsScreen: React.FC = () => {
    const { colors, spacing, typography, borderRadius } = useTheme();

    const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const loadInvitations = async () => {
        setLoading(true);
        setError(null);

        try {
            const { status, json } = await apiGet('/tenants/invitations');

            if (status === 200 && json?.success && Array.isArray(json.data)) {
                setInvitations(json.data);
            } else {
                setInvitations([]);
                setError('Failed to load invitations');
            }
        } catch (error) {
            console.error('Failed to load invitations:', error);
            setError('Failed to load invitations');
            setInvitations([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvitations();
    }, []);

    const handleAccept = async (invitationId: string) => {
        setProcessingId(invitationId);

        try {
            const { status, json } = await apiPost(`/tenants/invitations/${invitationId}/accept`);

            if (status === 200 && json?.success) {
                Alert.alert(
                    'Success!',
                    'Invitation accepted successfully! Your lease has been created.',
                    [{ text: 'OK', onPress: () => loadInvitations() }]
                );
            } else {
                Alert.alert('Error', json?.message || 'Failed to accept invitation');
            }
        } catch (error) {
            console.error('Accept invitation error:', error);
            Alert.alert('Error', 'Failed to accept invitation');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDecline = async (invitationId: string) => {
        Alert.alert(
            'Decline Invitation',
            'Are you sure you want to decline this invitation?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessingId(invitationId);

                        try {
                            const { status, json } = await apiPost(`/tenants/invitations/${invitationId}/decline`);

                            if (status === 200 && json?.success) {
                                Alert.alert(
                                    'Declined',
                                    'Invitation declined successfully.',
                                    [{ text: 'OK', onPress: () => loadInvitations() }]
                                );
                            } else {
                                Alert.alert('Error', json?.message || 'Failed to decline invitation');
                            }
                        } catch (error) {
                            console.error('Decline invitation error:', error);
                            Alert.alert('Error', 'Failed to decline invitation');
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    const renderInvitationCard = ({ item }: { item: TenantInvitation }) => {
        const isProcessing = processingId === item.id;
        const canAct = item.status === 'PENDING';

        return (
            <View
                style={{
                    backgroundColor: colors.surface,
                    borderRadius: borderRadius.lg,
                    padding: spacing.lg,
                    marginBottom: spacing.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                }}
            >
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                    <View style={{ flex: 1 }}>
                        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.xs }]}>
                            {item.property.name}
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                            {item.property.location}
                        </Text>
                    </View>
                    <View
                        style={{
                            paddingHorizontal: spacing.sm,
                            paddingVertical: spacing.xs,
                            borderRadius: borderRadius.sm,
                            backgroundColor: canAct ? colors.warning + '20' :
                                item.status === 'ACCEPTED' ? colors.success + '20' :
                                    item.status === 'DECLINED' ? colors.error + '20' : colors.textSecondary + '20',
                        }}
                    >
                        <Text
                            style={[
                                typography.caption,
                                {
                                    color: canAct ? colors.warning :
                                        item.status === 'ACCEPTED' ? colors.success :
                                            item.status === 'DECLINED' ? colors.error : colors.textSecondary,
                                    fontWeight: '600',
                                }
                            ]}
                        >
                            {item.status}
                        </Text>
                    </View>
                </View>

                {/* Details */}
                <View style={{ marginBottom: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                        <Ionicons name="home" size={16} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />
                        <Text style={[typography.body, { color: colors.text }]}>
                            Unit {item.unit.unitNumber}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                        <Ionicons name="card" size={16} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />
                        <Text style={[typography.body, { color: colors.text }]}>
                            UGX {item.rentAmount.toLocaleString()}/month
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="calendar" size={16} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />
                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                            Invited {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                {/* Action Buttons */}
                {canAct && (
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <Button
                            title="Accept"
                            onPress={() => handleAccept(item.id)}
                            loading={isProcessing}
                            disabled={isProcessing}
                            style={{ flex: 1 }}
                        />
                        <TouchableOpacity
                            onPress={() => handleDecline(item.id)}
                            disabled={isProcessing}
                            style={{
                                flex: 1,
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: borderRadius.md,
                                paddingVertical: spacing.sm,
                                alignItems: 'center',
                                backgroundColor: colors.background,
                            }}
                        >
                            <Text style={[typography.body, { color: colors.textSecondary }]}>
                                Decline
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: spacing.base }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={{ marginBottom: spacing.lg }}>
                    <Text style={[typography.h2, { color: colors.text }]}>
                        Invitations
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                        Manage your property invitations
                    </Text>
                </View>

                {/* Content */}
                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl }}>
                        <Text style={[typography.body, { color: colors.textSecondary }]}>
                            Loading invitations...
                        </Text>
                    </View>
                ) : error ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl }}>
                        <Ionicons name="alert-circle" size={48} color={colors.error} style={{ marginBottom: spacing.md }} />
                        <Text style={[typography.body, { color: colors.text, textAlign: 'center', marginBottom: spacing.md }]}>
                            {error}
                        </Text>
                        <Button title="Retry" onPress={loadInvitations} />
                    </View>
                ) : invitations.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl }}>
                        <Ionicons name="mail-outline" size={48} color={colors.textSecondary} style={{ marginBottom: spacing.md }} />
                        <Text style={[typography.h3, { color: colors.text, textAlign: 'center', marginBottom: spacing.sm }]}>
                            No Invitations
                        </Text>
                        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                            You don't have any property invitations at the moment.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={invitations}
                        renderItem={renderInvitationCard}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
};
