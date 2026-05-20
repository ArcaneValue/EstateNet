import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useMessages } from '../../context/MessageContext';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { apiGet } from '../../utils/apiClient';

interface ManagerMessagesScreenProps {
    navigation: any;
}

interface TenantConversation {
    tenantId: string;
    tenantName: string;
    tenantUserId: string;
    tenantEmail: string;
    propertyName: string;
    unitNumber: string;
    leaseId: string;
    messages: any[];
    lastMessage?: any;
    unreadCount: number;
}

interface OnboardedTenant {
    tenantId: string;
    tenantName: string;
    tenantUserId: string;
    tenantEmail: string;
    propertyName: string;
    unitNumber: string;
    leaseId: string;
}

export const ManagerMessagesScreen: React.FC<ManagerMessagesScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();
    const { inbox, sent, loading, sendMessage, markAsRead, loadInbox, loadSent } = useMessages();

    const [selectedConversation, setSelectedConversation] = useState<TenantConversation | null>(null);
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showNewMessageModal, setShowNewMessageModal] = useState(false);
    const [onboardedTenants, setOnboardedTenants] = useState<OnboardedTenant[]>([]);
    const [loadingTenants, setLoadingTenants] = useState(false);

    useEffect(() => {
        loadMessages();
        loadOnboardedTenants();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadMessages();
            loadOnboardedTenants();
        });
        return unsubscribe;
    }, [navigation]);

    const loadMessages = async () => {
        await loadInbox();
        await loadSent();
    };

    const loadOnboardedTenants = async () => {
        setLoadingTenants(true);
        try {
            const { status, json } = await apiGet('/manager/tenants');
            const payload: any = json;

            if (status === 200 && payload?.success && Array.isArray(payload.data)) {
                const tenantsList: OnboardedTenant[] = [];

                for (const tenant of payload.data) {
                    try {
                        const identityResponse = await apiGet(`/identities/${tenant.tenantId}`);
                        const identityPayload: any = identityResponse.json;

                        if (identityResponse.status === 200 && identityPayload?.success && identityPayload.data?.user) {
                            tenantsList.push({
                                tenantId: tenant.tenantId,
                                tenantName: tenant.name,
                                tenantUserId: identityPayload.data.user.id,
                                tenantEmail: tenant.email,
                                propertyName: tenant.propertyName,
                                unitNumber: tenant.unitNumber,
                                leaseId: tenant.leaseId,
                            });
                        }
                    } catch (error) {
                        console.error(`Error fetching user ID for tenant ${tenant.tenantId}:`, error);
                    }
                }

                setOnboardedTenants(tenantsList);
            } else {
                setOnboardedTenants([]);
            }
        } catch (error) {
            console.error('Error loading onboarded tenants:', error);
            setOnboardedTenants([]);
        } finally {
            setLoadingTenants(false);
        }
    };

    const groupMessagesByTenant = (): TenantConversation[] => {
        const allMessages = [...inbox, ...sent];
        const conversationMap = new Map<string, TenantConversation>();

        // First, add all onboarded tenants (even without messages)
        onboardedTenants.forEach(tenant => {
            conversationMap.set(tenant.tenantUserId, {
                tenantId: tenant.tenantId,
                tenantName: tenant.tenantName,
                tenantUserId: tenant.tenantUserId,
                tenantEmail: tenant.tenantEmail,
                propertyName: tenant.propertyName,
                unitNumber: tenant.unitNumber,
                leaseId: tenant.leaseId,
                messages: [],
                lastMessage: undefined,
                unreadCount: 0,
            });
        });

        // Then, add messages to existing conversations
        allMessages.forEach((msg: any) => {
            const isIncoming = msg.toUserId === user?.id;
            const otherUser = isIncoming ? msg.fromUser : msg.toUser;
            const tenantUserId = otherUser?.id;
            const tenantId = otherUser?.tenantId;

            if (!tenantUserId) return;

            const key = tenantUserId;

            if (!conversationMap.has(key)) {
                conversationMap.set(key, {
                    tenantId: tenantId || '',
                    tenantName: otherUser.name || otherUser.email,
                    tenantUserId: tenantUserId,
                    tenantEmail: otherUser.email,
                    propertyName: msg.lease?.property?.name || 'Unknown Property',
                    unitNumber: msg.lease?.unit?.unitNumber || '?',
                    leaseId: msg.leaseId || '',
                    messages: [],
                    lastMessage: msg,
                    unreadCount: 0,
                });
            }

            const conversation = conversationMap.get(key)!;
            conversation.messages.push(msg);

            if (!conversation.lastMessage || new Date(msg.createdAt) > new Date(conversation.lastMessage.createdAt)) {
                conversation.lastMessage = msg;
            }

            if (isIncoming && !msg.readAt) {
                conversation.unreadCount++;
            }
        });

        const conversations = Array.from(conversationMap.values());
        conversations.forEach(conv => {
            conv.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });

        conversations.sort((a, b) => {
            if (!a.lastMessage && !b.lastMessage) return 0;
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
        });

        return conversations;
    };

    const handleConversationPress = async (conversation: TenantConversation) => {
        setSelectedConversation(conversation);

        const unreadMessages = conversation.messages.filter(
            msg => msg.toUserId === user?.id && !msg.readAt
        );

        for (const msg of unreadMessages) {
            await markAsRead(msg.id);
        }
    };

    const handleSelectTenant = (tenant: OnboardedTenant) => {
        const conversation: TenantConversation = {
            tenantId: tenant.tenantId,
            tenantName: tenant.tenantName,
            tenantUserId: tenant.tenantUserId,
            tenantEmail: tenant.tenantEmail,
            propertyName: tenant.propertyName,
            unitNumber: tenant.unitNumber,
            leaseId: tenant.leaseId,
            messages: [],
            lastMessage: undefined,
            unreadCount: 0,
        };
        setShowNewMessageModal(false);
        setSelectedConversation(conversation);
    };

    const handleSendMessage = async () => {
        if (!selectedConversation || !messageText.trim()) return;

        if (!selectedConversation.tenantUserId) {
            Alert.alert('Error', 'Invalid tenant user ID. Please try selecting the tenant again.');
            return;
        }

        if (!selectedConversation.leaseId) {
            Alert.alert('Error', 'Invalid lease ID. Please try selecting the tenant again.');
            return;
        }

        setIsSending(true);
        try {
            const success = await sendMessage({
                toUserId: selectedConversation.tenantUserId,
                leaseId: selectedConversation.leaseId,
                subject: 'Message from your property manager',
                body: messageText.trim(),
            });

            if (success) {
                setMessageText('');
                await loadMessages();
                await loadOnboardedTenants();
            } else {
                Alert.alert('Error', 'Failed to send message. Please try again.');
            }
        } catch (error: any) {
            console.error('Send message error:', error);
            Alert.alert('Error', error?.message || 'Failed to send message.');
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 48) {
            return 'Yesterday';
        } else if (diffInHours < 168) {
            return date.toLocaleDateString('en-GB', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        }
    };

    const conversations = groupMessagesByTenant();

    if (selectedConversation) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    {/* Header */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: spacing.base,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                        backgroundColor: colors.surface,
                    }}>
                        <TouchableOpacity
                            onPress={() => setSelectedConversation(null)}
                            style={{ marginRight: spacing.md }}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h4, { color: colors.text }]}>
                                {selectedConversation.tenantName}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                {selectedConversation.propertyName} • Unit {selectedConversation.unitNumber}
                            </Text>
                        </View>
                    </View>

                    {/* Messages */}
                    <ScrollView
                        style={{ flex: 1, padding: spacing.base }}
                        contentContainerStyle={{ paddingBottom: spacing.lg }}
                    >
                        {selectedConversation.messages.map((msg: any, index: number) => {
                            const isFromManager = msg.fromUserId === user?.id;
                            return (
                                <View
                                    key={msg.id}
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: isFromManager ? 'flex-end' : 'flex-start',
                                        marginBottom: spacing.md,
                                    }}
                                >
                                    <View
                                        style={{
                                            maxWidth: '75%',
                                            backgroundColor: isFromManager ? colors.primary : colors.surface,
                                            padding: spacing.md,
                                            borderRadius: borderRadius.md,
                                            borderBottomRightRadius: isFromManager ? 4 : borderRadius.md,
                                            borderBottomLeftRadius: isFromManager ? borderRadius.md : 4,
                                        }}
                                    >
                                        {msg.subject && (
                                            <Text style={[
                                                typography.bodySmall,
                                                {
                                                    color: isFromManager ? '#FFFFFF' : colors.text,
                                                    fontWeight: '600',
                                                    marginBottom: spacing.xs,
                                                }
                                            ]}>
                                                {msg.subject}
                                            </Text>
                                        )}
                                        <Text style={[
                                            typography.body,
                                            { color: isFromManager ? '#FFFFFF' : colors.text }
                                        ]}>
                                            {msg.body}
                                        </Text>
                                        <Text style={[
                                            typography.bodySmall,
                                            {
                                                color: isFromManager ? 'rgba(255,255,255,0.7)' : colors.textSecondary,
                                                marginTop: spacing.xs,
                                                fontSize: 11,
                                            }
                                        ]}>
                                            {formatTime(msg.createdAt)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>

                    {/* Message Input */}
                    <View style={{
                        flexDirection: 'row',
                        padding: spacing.base,
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                        backgroundColor: colors.surface,
                        alignItems: 'center',
                    }}>
                        <TextInput
                            style={{
                                flex: 1,
                                backgroundColor: colors.background,
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: borderRadius.md,
                                padding: spacing.md,
                                color: colors.text,
                                maxHeight: 100,
                                marginRight: spacing.sm,
                            }}
                            placeholder="Type a message..."
                            placeholderTextColor={colors.textSecondary}
                            value={messageText}
                            onChangeText={setMessageText}
                            multiline
                            editable={!isSending}
                        />
                        <TouchableOpacity
                            onPress={handleSendMessage}
                            disabled={!messageText.trim() || isSending}
                            style={{
                                backgroundColor: messageText.trim() && !isSending ? colors.primary : colors.border,
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons
                                name="send"
                                size={20}
                                color={messageText.trim() && !isSending ? '#FFFFFF' : colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: spacing.base,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
            }}>
                <View>
                    <Text style={[typography.h2, { color: colors.text }]}>
                        Messages
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                        Tenant communications
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <TouchableOpacity onPress={() => setShowNewMessageModal(true)}>
                        <Ionicons name="create-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={loadMessages}>
                        <Ionicons name="refresh" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Conversations List */}
            {loading && conversations.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.base }}>
                    <Text style={[typography.body, { color: colors.text }]}>Loading messages...</Text>
                </View>
            ) : conversations.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
                    <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} />
                    <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, textAlign: 'center' }]}>
                        No Conversations
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                        Messages with your tenants will appear here
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.tenantUserId}
                    contentContainerStyle={{ padding: spacing.base }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => handleConversationPress(item)}
                            style={{
                                backgroundColor: colors.surface,
                                padding: spacing.lg,
                                borderRadius: borderRadius.md,
                                marginBottom: spacing.md,
                                borderWidth: 1,
                                borderColor: item.unreadCount > 0 ? colors.primary + '30' : colors.border,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                <View style={{
                                    backgroundColor: colors.primary + '20',
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: spacing.md,
                                }}>
                                    <Ionicons name="person" size={24} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs }}>
                                        <Text style={[
                                            typography.h4,
                                            {
                                                color: colors.text,
                                                flex: 1,
                                                fontWeight: item.unreadCount > 0 ? '700' : '600',
                                            }
                                        ]}>
                                            {item.tenantName}
                                        </Text>
                                        {item.unreadCount > 0 && (
                                            <View style={{
                                                backgroundColor: colors.error,
                                                paddingHorizontal: 8,
                                                paddingVertical: 2,
                                                borderRadius: 10,
                                                marginLeft: spacing.sm,
                                            }}>
                                                <Text style={[typography.bodySmall, { color: '#FFFFFF', fontSize: 10, fontWeight: '700' }]}>
                                                    {item.unreadCount}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                                        {item.propertyName} • Unit {item.unitNumber}
                                    </Text>
                                    {item.lastMessage ? (
                                        <>
                                            <Text
                                                style={[
                                                    typography.body,
                                                    {
                                                        color: item.unreadCount > 0 ? colors.text : colors.textSecondary,
                                                        fontWeight: item.unreadCount > 0 ? '600' : '400',
                                                    }
                                                ]}
                                                numberOfLines={2}
                                            >
                                                {item.lastMessage.body}
                                            </Text>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                                {formatTime(item.lastMessage.createdAt)}
                                            </Text>
                                        </>
                                    ) : (
                                        <Text style={[typography.body, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                                            No messages yet - tap to start conversation
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* New Message Modal - Tenant Selection */}
            <Modal
                visible={showNewMessageModal}
                onClose={() => setShowNewMessageModal(false)}
                title="Select Tenant"
                size="large"
            >
                <View>
                    <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
                        Choose a tenant to start a conversation
                    </Text>
                    {loadingTenants ? (
                        <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                            <Text style={[typography.body, { color: colors.text }]}>Loading tenants...</Text>
                        </View>
                    ) : onboardedTenants.length === 0 ? (
                        <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                            <Text style={[typography.h4, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
                                No Tenants Found
                            </Text>
                            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                                Invite tenants to your properties first
                            </Text>
                        </View>
                    ) : (
                        <ScrollView style={{ maxHeight: 400 }}>
                            {onboardedTenants.map((tenant) => (
                                <TouchableOpacity
                                    key={tenant.tenantUserId}
                                    onPress={() => handleSelectTenant(tenant)}
                                    style={{
                                        backgroundColor: colors.surface,
                                        padding: spacing.md,
                                        borderRadius: borderRadius.md,
                                        marginBottom: spacing.sm,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{
                                            backgroundColor: colors.primary + '20',
                                            width: 40,
                                            height: 40,
                                            borderRadius: 20,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: spacing.md,
                                        }}>
                                            <Ionicons name="person" size={20} color={colors.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[typography.h4, { color: colors.text }]}>
                                                {tenant.tenantName}
                                            </Text>
                                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                {tenant.propertyName} • Unit {tenant.unitNumber}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
};
