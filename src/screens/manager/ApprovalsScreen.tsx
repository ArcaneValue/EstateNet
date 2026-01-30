import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useProperties } from '../../context/PropertyContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { AccessRequest, AccessRequestStatus } from '../../types/types';
import { Ionicons } from '@expo/vector-icons';

interface ApprovalsScreenProps {
    navigation: any;
}

export const ApprovalsScreen: React.FC<ApprovalsScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();
    const { getOwnedProperties, getPendingAccessRequests, approveAccessRequest, rejectAccessRequest } = useProperties();
    
    const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Get all pending requests for properties owned by this user
    const ownedProperties = user ? getOwnedProperties(user.id) : [];
    const allPendingRequests = ownedProperties.reduce((requests: AccessRequest[], property) => {
        const propertyRequests = getPendingAccessRequests(property.id);
        return [...requests, ...propertyRequests];
    }, []);

    const handleApproveRequest = (request: AccessRequest) => {
        Alert.alert(
            'Approve Request',
            `Approve ${request.requesterName}'s request to access ${request.propertyName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    style: 'default',
                    onPress: () => {
                        approveAccessRequest(request.propertyId, request.id);
                        Alert.alert('Success', 'Request approved successfully');
                    },
                },
            ]
        );
    };

    const handleRejectRequest = (request: AccessRequest) => {
        Alert.alert(
            'Reject Request',
            `Reject ${request.requesterName}'s request to access ${request.propertyName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: () => {
                        rejectAccessRequest(request.propertyId, request.id);
                        Alert.alert('Success', 'Request rejected successfully');
                    },
                },
            ]
        );
    };

    const handleViewDetails = (request: AccessRequest) => {
        setSelectedRequest(request);
        setShowDetailsModal(true);
    };

    const getStatusColor = (status: AccessRequestStatus) => {
        switch (status) {
            case 'pending': return colors.warning;
            case 'approved': return colors.success;
            case 'rejected': return colors.error;
            default: return colors.textSecondary;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'OWNER': return colors.primary;
            case 'ADMIN': return colors.accent;
            case 'MANAGER': return colors.success;
            case 'VIEWER': return colors.textSecondary;
            default: return colors.textSecondary;
        }
    };

    const renderRequestItem = ({ item }: { item: AccessRequest }) => (
        <Card style={{ marginBottom: spacing.md }}>
            <View style={styles.requestItem}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                            {item.requesterName}
                        </Text>
                        <StatusBadge
                            type="warning"
                            label="Pending"
                            size="small"
                            style={{ marginLeft: spacing.sm }}
                        />
                    </View>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        {item.requesterEmail}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
                        <Text style={[
                            typography.bodySmall,
                            { color: getRoleColor(item.requestedRole), fontWeight: '600' }
                        ]}>
                            {item.requestedRole}
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
                            Requested {item.createdAt.toLocaleDateString()}
                        </Text>
                    </View>
                    <Text style={[typography.bodySmall, { color: colors.text, marginTop: spacing.sm }]}>
                        Property: {item.propertyName}
                    </Text>
                    {item.message && (
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                            "{item.message}"
                        </Text>
                    )}
                </View>
                
                <View style={styles.requestActions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { borderColor: colors.border }]}
                        onPress={() => handleViewDetails(item)}
                    >
                        <Ionicons name="eye" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { borderColor: colors.success }]}
                        onPress={() => handleApproveRequest(item)}
                    >
                        <Ionicons name="checkmark" size={16} color={colors.success} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { borderColor: colors.error }]}
                        onPress={() => handleRejectRequest(item)}
                    >
                        <Ionicons name="close" size={16} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
        </Card>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.base,
                borderBottomWidth: 1,
                borderBottomColor: colors.divider,
            }}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginRight: spacing.sm }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[typography.h2, { color: colors.text }]}>
                        Approval Center
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        {allPendingRequests.length} pending request{allPendingRequests.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            </View>

            <View style={{ padding: spacing.base }}>
                {/* Info Card */}
                <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
                    <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                        Review and approve manager access requests for your properties. You can approve, reject, or view details for each request.
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        Managers can also request access using Property Codes.
                    </Text>
                </Card>

                {/* Requests List */}
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                    Pending Requests
                </Text>
                
                <FlatList
                    data={allPendingRequests}
                    renderItem={renderRequestItem}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <Card style={{ padding: spacing.xl, alignItems: 'center' }}>
                            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                                No pending requests
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                                All access requests have been processed
                            </Text>
                        </Card>
                    }
                />
            </View>

            {/* Request Details Modal */}
            <Modal
                visible={showDetailsModal}
                title="Request Details"
                onClose={() => setShowDetailsModal(false)}
            >
                {selectedRequest && (
                    <View style={{ padding: spacing.base }}>
                        <View style={{ marginBottom: spacing.lg }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Requester Information
                            </Text>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                {selectedRequest.requesterName}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                {selectedRequest.requesterEmail}
                            </Text>
                        </View>

                        <View style={{ marginBottom: spacing.lg }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Requested Role
                            </Text>
                            <Text style={[
                                typography.body,
                                { color: getRoleColor(selectedRequest.requestedRole), fontWeight: '600' }
                            ]}>
                                {selectedRequest.requestedRole}
                            </Text>
                        </View>

                        <View style={{ marginBottom: spacing.lg }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Property
                            </Text>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                {selectedRequest.propertyName}
                            </Text>
                            {selectedRequest.propertyCode && (
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    Property Code: {selectedRequest.propertyCode}
                                </Text>
                            )}
                        </View>

                        {selectedRequest.message && (
                            <View style={{ marginBottom: spacing.lg }}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    Message
                                </Text>
                                <Text style={[typography.body, { color: colors.text }]}>
                                    "{selectedRequest.message}"
                                </Text>
                            </View>
                        )}

                        <View style={{ marginBottom: spacing.lg }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Request Date
                            </Text>
                            <Text style={[typography.body, { color: colors.text }]}>
                                {selectedRequest.createdAt.toLocaleDateString()} at {selectedRequest.createdAt.toLocaleTimeString()}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row' }}>
                            <Button
                                title="Reject"
                                onPress={() => {
                                    handleRejectRequest(selectedRequest);
                                    setShowDetailsModal(false);
                                }}
                                variant="outline"
                                style={{ flex: 1, marginRight: spacing.sm }}
                            />
                            <Button
                                title="Approve"
                                onPress={() => {
                                    handleApproveRequest(selectedRequest);
                                    setShowDetailsModal(false);
                                }}
                                variant="primary"
                                style={{ flex: 1, marginLeft: spacing.sm }}
                            />
                        </View>
                    </View>
                )}
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    requestItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    requestActions: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 12,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
