import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useTutorial, TUTORIAL_KEYS } from '../../context/TutorialContext';
import { Ionicons } from '@expo/vector-icons';
import { MessageDetailsModal } from './MessageDetailsModal';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { TutorialModal } from '../../components/TutorialModal';
import { useLease } from '../../context/LeaseContext';
import { useMessages } from '../../context/MessageContext';

interface Message {
    id: string;
    type: 'rent_reminder' | 'payment_confirmation' | 'announcement' | 'maintenance' | 'tenant_message';
    subject: string;
    preview: string;
    fullMessage: string;
    sender: string;
    date: string;
    read: boolean;
    category?: string;
    priority?: 'low' | 'normal' | 'urgent';
    status?: 'sent' | 'delivered' | 'read' | 'replied';
}

type MessageCategory = 'general' | 'maintenance' | 'billing' | 'complaint' | 'request' | 'other';
type MessagePriority = 'low' | 'normal' | 'urgent';

interface MessagesScreenProps {
    navigation: any;
}

export const MessagesScreen: React.FC<MessagesScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius, isDark, toggleTheme } = useTheme();
    const { user } = useAuth();
    const { activeLease, leaseLoading } = useLease();
    const insets = useSafeAreaInsets();
    const {
        inbox,
        sent,
        loading: messagesLoading,
        tenantTargets,
        loadInbox,
        loadSent,
        sendMessage,
        markAsRead,
        loadTenantTargets,
    } = useMessages();

    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
    const [showComposeModal, setShowComposeModal] = useState(false);
    const [messageCategory, setMessageCategory] = useState<MessageCategory>('general');
    const [messagePriority, setMessagePriority] = useState<MessagePriority>('normal');
    const [messageSubject, setMessageSubject] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [attachments, setAttachments] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);

    // Tutorial
    const { shouldShowTutorial, markTutorialSeen } = useTutorial();

    const categories: { id: MessageCategory; label: string; icon: string }[] = [
        { id: 'general', label: 'General Inquiry', icon: 'chatbubble-outline' },
        { id: 'maintenance', label: 'Maintenance Issue', icon: 'hammer-outline' },
        { id: 'billing', label: 'Billing Question', icon: 'card-outline' },
        { id: 'complaint', label: 'Complaint', icon: 'warning-outline' },
        { id: 'request', label: 'Request', icon: 'hand-left-outline' },
        { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
    ];

    const priorities: { id: MessagePriority; label: string; color: string }[] = [
        { id: 'low', label: 'Low', color: colors.success },
        { id: 'normal', label: 'Normal', color: colors.info },
        { id: 'urgent', label: 'Urgent', color: colors.error },
    ];

    useEffect(() => {
        loadTenantTargets();
        checkTutorial();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkTutorial = async () => {
        const shouldShow = await shouldShowTutorial(TUTORIAL_KEYS.TENANT_MESSAGES);
        if (shouldShow) {
            setTimeout(() => setShowTutorial(true), 500);
        }
    };

    const handleTutorialClose = async () => {
        await markTutorialSeen(TUTORIAL_KEYS.TENANT_MESSAGES);
        setShowTutorial(false);
    };

    useEffect(() => {
        if (leaseLoading) return;

        if (activeTab === 'inbox') {
            loadInbox(activeLease?.id);
        } else {
            loadSent(activeLease?.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, activeLease?.id, leaseLoading]);

    const unreadCount = inbox.filter((m: any) => !m.readAt).length;

    const getMessageIcon = (type: Message['type']) => {
        switch (type) {
            case 'rent_reminder':
                return 'time';
            case 'payment_confirmation':
                return 'checkmark-circle';
            case 'announcement':
                return 'megaphone';
            case 'maintenance':
                return 'hammer';
            case 'tenant_message':
                return 'send';
            default:
                return 'mail';
        }
    };

    const getMessageColor = (type: Message['type']) => {
        switch (type) {
            case 'rent_reminder':
                return colors.warning;
            case 'payment_confirmation':
                return colors.success;
            case 'announcement':
                return colors.info;
            case 'maintenance':
                return colors.accent;
            case 'tenant_message':
                return colors.primary;
            default:
                return colors.textSecondary;
        }
    };

    const getStatusIcon = (status?: string) => {
        switch (status) {
            case 'sent':
                return 'checkmark';
            case 'delivered':
                return 'checkmark-done';
            case 'read':
                return 'eye';
            case 'replied':
                return 'arrow-undo';
            default:
                return 'checkmark';
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'sent':
                return colors.textSecondary;
            case 'delivered':
                return colors.info;
            case 'read':
                return colors.success;
            case 'replied':
                return colors.primary;
            default:
                return colors.textSecondary;
        }
    };

    const resetComposeForm = () => {
        setMessageCategory('general');
        setMessagePriority('normal');
        setMessageSubject('');
        setMessageBody('');
        setAttachments([]);
    };

    const handleSendMessage = async () => {
        if (!messageSubject.trim()) {
            Alert.alert('Missing Subject', 'Please enter a subject for your message.');
            return;
        }
        if (!messageBody.trim()) {
            Alert.alert('Missing Message', 'Please enter your message content.');
            return;
        }

        setIsSending(true);
        try {
            if (!tenantTargets || tenantTargets.length === 0) {
                setIsSending(false);
                Alert.alert(
                    'Cannot send message',
                    'No property manager was found to receive your message. Please ensure you have accepted a property invitation.',
                );
                return;
            }

            const target = tenantTargets[0];

            const success = await sendMessage({
                toUserId: target.userId,
                leaseId: activeLease?.id,
                subject: messageSubject.trim(),
                body: messageBody.trim(),
            });

            if (success) {
                resetComposeForm();
                setShowComposeModal(false);
                setActiveTab('sent');
                await loadSent(activeLease?.id);
                Alert.alert('Message Sent', 'Your message has been sent to the property manager.');
            } else {
                Alert.alert('Error', 'Failed to send message. Please try again.');
            }
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to send message. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const handleAddAttachment = () => {
        Alert.alert(
            'Add Attachment',
            'Choose attachment type',
            [
                { text: 'Take Photo', onPress: () => setAttachments(prev => [...prev, `photo_${Date.now()}.jpg`]) },
                { text: 'Choose from Gallery', onPress: () => setAttachments(prev => [...prev, `image_${Date.now()}.jpg`]) },
                { text: 'Choose Document', onPress: () => setAttachments(prev => [...prev, `document_${Date.now()}.pdf`]) },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 48) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        }
    };

    const mapBackendMessageToUi = (backend: any, isInbox: boolean): Message => {
        const createdAt = backend.createdAt || new Date().toISOString();
        const body: string = backend.body || '';
        const subject: string = backend.subject || '';
        const senderName = isInbox
            ? backend.fromUser?.name || backend.fromUser?.email || 'Manager'
            : 'You';

        return {
            id: backend.id,
            type: 'tenant_message',
            subject: subject || 'No subject',
            preview: body.length > 100 ? `${body.substring(0, 100)}...` : body,
            fullMessage: body,
            sender: senderName,
            date: createdAt,
            read: !!backend.readAt,
            category: 'general',
            priority: 'normal',
            status: !isInbox ? (backend.readAt ? 'read' : 'sent') : undefined,
        };
    };

    const handleMessagePress = async (backendMessage: any, isInbox: boolean) => {
        if (isInbox && !backendMessage.readAt) {
            await markAsRead(backendMessage.id);
        }

        const mapped = mapBackendMessageToUi(
            isInbox
                ? { ...backendMessage, readAt: backendMessage.readAt || new Date().toISOString() }
                : backendMessage,
            isInbox,
        );
        setSelectedMessage(mapped);
    };

    const currentMessages = activeTab === 'inbox' ? inbox : sent;

    if (leaseLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.base }}>
                    <Text style={[typography.body, { color: colors.text }]}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const propertyName = activeLease?.property?.name;
    const unitNumber = activeLease?.unit?.unitNumber;

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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Custom Top Bar - Compose Icon Only */}
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
                            {getFirstName(user?.name)}
                        </Text>

                        {/* Subtext */}
                        {propertyName && unitNumber && (
                            <Text style={{
                                fontSize: 11,
                                color: colors.textTertiary,
                                marginTop: 4,
                                fontWeight: '500',
                            }}>
                                {unitNumber} – {propertyName}
                            </Text>
                        )}
                    </View>

                    {/* Right Section: Compose Icon Only */}
                    <TouchableOpacity
                        onPress={() => setShowComposeModal(true)}
                        activeOpacity={0.7}
                        style={{
                            backgroundColor: colors.primary,
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="create-outline" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ flex: 1 }}>
                {/* Header */}
                <View style={{ marginBottom: spacing.lg, paddingHorizontal: spacing.base, paddingTop: spacing.base }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h2, { color: colors.text }]}>
                                Messages
                            </Text>
                            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                Communications & inquiries
                            </Text>
                        </View>
                    </View>
                    {unreadCount > 0 && activeTab === 'inbox' && (
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: spacing.sm,
                        }}>
                            <View style={{
                                backgroundColor: colors.error,
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                marginRight: spacing.xs,
                            }} />
                            <Text style={[typography.bodySmall, { color: colors.text }]}>
                                {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
                            </Text>
                        </View>
                    )}
                </View>

                {!activeLease && (
                    <View style={{
                        backgroundColor: colors.primary + '10',
                        padding: spacing.md,
                        borderRadius: borderRadius.md,
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        marginBottom: spacing.lg,
                        marginHorizontal: spacing.base,
                    }}>
                        <Ionicons
                            name="information-circle"
                            size={20}
                            color={colors.primary}
                            style={{ marginRight: spacing.sm, marginTop: 2 }}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                No active lease
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                                You can still view and compose messages, but some automated rent and property notifications may be unavailable until you accept a property invitation.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Tabs */}
                <View style={{ flexDirection: 'row', marginBottom: spacing.lg, gap: spacing.sm, paddingHorizontal: spacing.base }}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('inbox')}
                        style={{
                            flex: 1,
                            paddingVertical: spacing.sm,
                            borderRadius: borderRadius.md,
                            backgroundColor: activeTab === 'inbox' ? colors.primary : colors.surface,
                            borderWidth: 1,
                            borderColor: activeTab === 'inbox' ? colors.primary : colors.border,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: spacing.xs,
                        }}
                    >
                        <Ionicons name="mail" size={16} color={activeTab === 'inbox' ? '#FFFFFF' : colors.text} />
                        <Text style={[typography.body, { color: activeTab === 'inbox' ? '#FFFFFF' : colors.text, fontWeight: '600' }]}>
                            Inbox
                        </Text>
                        {unreadCount > 0 && (
                            <View style={{
                                backgroundColor: activeTab === 'inbox' ? '#FFFFFF' : colors.error,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 10,
                                marginLeft: 4,
                            }}>
                                <Text style={[typography.bodySmall, { color: activeTab === 'inbox' ? colors.primary : '#FFFFFF', fontSize: 10, fontWeight: '700' }]}>
                                    {unreadCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('sent')}
                        style={{
                            flex: 1,
                            paddingVertical: spacing.sm,
                            borderRadius: borderRadius.md,
                            backgroundColor: activeTab === 'sent' ? colors.primary : colors.surface,
                            borderWidth: 1,
                            borderColor: activeTab === 'sent' ? colors.primary : colors.border,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: spacing.xs,
                        }}
                    >
                        <Ionicons name="send" size={16} color={activeTab === 'sent' ? '#FFFFFF' : colors.text} />
                        <Text style={[typography.body, { color: activeTab === 'sent' ? '#FFFFFF' : colors.text, fontWeight: '600' }]}>
                            Sent
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Messages List */}
                {currentMessages.length > 0 ? (
                    <FlatList
                        data={currentMessages}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: spacing.xl, paddingHorizontal: spacing.base }}
                        renderItem={({ item }) => {
                            const uiMessage = mapBackendMessageToUi(item, activeTab === 'inbox');
                            return (
                                <TouchableOpacity
                                    onPress={() => handleMessagePress(item, activeTab === 'inbox')}
                                    style={{
                                        backgroundColor: uiMessage.read ? colors.surface : colors.primaryLight + '10',
                                        padding: spacing.lg,
                                        borderRadius: borderRadius.md,
                                        marginBottom: spacing.md,
                                        borderWidth: 1,
                                        borderColor: uiMessage.read ? colors.border : colors.primary + '30',
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
                                        {/* Icon */}
                                        <View style={{
                                            backgroundColor: getMessageColor(item.type) + '20',
                                            width: 40,
                                            height: 40,
                                            borderRadius: 20,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: spacing.md,
                                        }}>
                                            <Ionicons name={getMessageIcon(item.type)} size={20} color={getMessageColor(item.type)} />
                                        </View>

                                        {/* Content */}
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs }}>
                                                <Text style={[
                                                    typography.h4,
                                                    {
                                                        color: colors.text,
                                                        flex: 1,
                                                        fontWeight: uiMessage.read ? '600' : '700',
                                                    }
                                                ]}>
                                                    {uiMessage.subject}
                                                </Text>
                                                {!uiMessage.read && (
                                                    <View style={{
                                                        backgroundColor: colors.error,
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: 4,
                                                        marginLeft: spacing.sm,
                                                        marginTop: 6,
                                                    }} />
                                                )}
                                            </View>

                                            <Text
                                                style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.sm }]}
                                                numberOfLines={2}
                                            >
                                                {uiMessage.preview}
                                            </Text>

                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                        {uiMessage.sender}
                                                    </Text>
                                                    {/* Status indicator for sent messages */}
                                                    {uiMessage.type === 'tenant_message' && uiMessage.status && (
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                                            <Ionicons name={getStatusIcon(uiMessage.status) as any} size={12} color={getStatusColor(uiMessage.status)} />
                                                            <Text style={[typography.bodySmall, { color: getStatusColor(uiMessage.status), fontSize: 10 }]}>
                                                                {uiMessage.status.charAt(0).toUpperCase() + uiMessage.status.slice(1)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                                    {formatDate(uiMessage.date)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                ) : (
                    <View style={{
                        flex: 1,
                        backgroundColor: colors.surface,
                        borderRadius: borderRadius.lg,
                        padding: spacing.xl,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginHorizontal: spacing.base,
                    }}>
                        <Ionicons name={activeTab === 'inbox' ? 'mail-open-outline' : 'send-outline'} size={64} color={colors.textSecondary} />
                        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, textAlign: 'center' }]}>
                            {activeTab === 'inbox' ? 'No Messages' : 'No Sent Messages'}
                        </Text>
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                            {activeTab === 'inbox'
                                ? "You don't have any messages at the moment."
                                : "You haven't sent any messages yet. Tap the compose button to send one."}
                        </Text>
                        {activeTab === 'sent' && (
                            <TouchableOpacity
                                onPress={() => setShowComposeModal(true)}
                                style={{
                                    marginTop: spacing.lg,
                                    backgroundColor: colors.primary,
                                    paddingVertical: spacing.sm,
                                    paddingHorizontal: spacing.lg,
                                    borderRadius: borderRadius.md,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: spacing.xs,
                                }}
                            >
                                <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                                <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                                    Compose Message
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Message Details Modal */}
            <MessageDetailsModal
                message={selectedMessage}
                visible={!!selectedMessage}
                onClose={() => setSelectedMessage(null)}
            />

            {/* Compose Message Modal */}
            <Modal
                visible={showComposeModal}
                onClose={() => {
                    setShowComposeModal(false);
                    resetComposeForm();
                }}
                title="New Message"
                size="large"
            >
                <View style={{ flex: 1 }}>
                    {/* Category Selection */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                            Category
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                            {categories.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => setMessageCategory(cat.id)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: spacing.sm,
                                        paddingHorizontal: spacing.md,
                                        borderRadius: borderRadius.md,
                                        backgroundColor: messageCategory === cat.id ? colors.primary : colors.surface,
                                        borderWidth: 1,
                                        borderColor: messageCategory === cat.id ? colors.primary : colors.border,
                                        gap: spacing.xs,
                                    }}
                                >
                                    <Ionicons
                                        name={cat.icon as any}
                                        size={14}
                                        color={messageCategory === cat.id ? '#FFFFFF' : colors.text}
                                    />
                                    <Text style={[
                                        typography.bodySmall,
                                        {
                                            color: messageCategory === cat.id ? '#FFFFFF' : colors.text,
                                            fontWeight: '500',
                                        }
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Priority Selection */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                            Priority
                        </Text>
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                            {priorities.map(pri => (
                                <TouchableOpacity
                                    key={pri.id}
                                    onPress={() => setMessagePriority(pri.id)}
                                    style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingVertical: spacing.sm,
                                        borderRadius: borderRadius.md,
                                        backgroundColor: messagePriority === pri.id ? pri.color + '20' : colors.surface,
                                        borderWidth: 2,
                                        borderColor: messagePriority === pri.id ? pri.color : colors.border,
                                        gap: spacing.xs,
                                    }}
                                >
                                    <View style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: pri.color,
                                    }} />
                                    <Text style={[
                                        typography.bodySmall,
                                        {
                                            color: messagePriority === pri.id ? pri.color : colors.text,
                                            fontWeight: '600',
                                        }
                                    ]}>
                                        {pri.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Subject */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                            Subject *
                        </Text>
                        <TextInput
                            value={messageSubject}
                            onChangeText={setMessageSubject}
                            placeholder="Enter message subject..."
                            placeholderTextColor={colors.textSecondary}
                            style={{
                                backgroundColor: colors.surface,
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: borderRadius.md,
                                padding: spacing.md,
                                color: colors.text,
                                fontSize: 14,
                            }}
                        />
                    </View>

                    {/* Message Body */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                            Message *
                        </Text>
                        <TextInput
                            value={messageBody}
                            onChangeText={setMessageBody}
                            placeholder="Type your message here..."
                            placeholderTextColor={colors.textTertiary}
                            multiline
                            numberOfLines={8}
                            textAlignVertical="top"
                            style={{
                                backgroundColor: colors.surface,
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: borderRadius.md,
                                padding: spacing.md,
                                color: colors.text,
                                fontSize: 15,
                                minHeight: 150,
                            }}
                        />
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'right' }]}>
                            {messageBody.length} characters
                        </Text>
                    </View>

                    {/* Attachments */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                Attachments
                            </Text>
                            <TouchableOpacity
                                onPress={handleAddAttachment}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: spacing.xs,
                                }}
                            >
                                <Ionicons name="attach" size={16} color={colors.primary} />
                                <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '600' }]}>
                                    Add
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {attachments.length > 0 ? (
                            <View style={{ gap: spacing.sm }}>
                                {attachments.map((file, index) => (
                                    <View
                                        key={index}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: colors.surface,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            borderRadius: borderRadius.md,
                                            padding: spacing.sm,
                                        }}
                                    >
                                        <Ionicons
                                            name={file.endsWith('.pdf') ? 'document' : 'image'}
                                            size={20}
                                            color={colors.primary}
                                            style={{ marginRight: spacing.sm }}
                                        />
                                        <Text style={[typography.bodySmall, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                                            {file}
                                        </Text>
                                        <TouchableOpacity onPress={() => handleRemoveAttachment(index)}>
                                            <Ionicons name="close-circle" size={20} color={colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={{
                                backgroundColor: colors.surface,
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: borderRadius.md,
                                borderStyle: 'dashed',
                                padding: spacing.lg,
                                alignItems: 'center',
                            }}>
                                <Ionicons name="cloud-upload-outline" size={32} color={colors.textSecondary} />
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                                    No attachments added
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Quick Templates */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                            Quick Templates
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setMessageCategory('maintenance');
                                        setMessageSubject('Maintenance Request');
                                        setMessageBody('Dear Property Manager,\n\nI would like to report a maintenance issue in my unit.\n\nIssue: \nLocation: \nUrgency: \n\nPlease arrange for inspection at your earliest convenience.\n\nThank you.');
                                    }}
                                    style={{
                                        backgroundColor: colors.surface,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        borderRadius: borderRadius.md,
                                        padding: spacing.sm,
                                        paddingHorizontal: spacing.md,
                                    }}
                                >
                                    <Text style={[typography.bodySmall, { color: colors.text }]}>Maintenance Request</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setMessageCategory('billing');
                                        setMessageSubject('Payment Inquiry');
                                        setMessageBody('Dear Property Manager,\n\nI have a question regarding my recent payment/billing.\n\nDetails: \n\nPlease clarify at your earliest convenience.\n\nThank you.');
                                    }}
                                    style={{
                                        backgroundColor: colors.surface,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        borderRadius: borderRadius.md,
                                        padding: spacing.sm,
                                        paddingHorizontal: spacing.md,
                                    }}
                                >
                                    <Text style={[typography.bodySmall, { color: colors.text }]}>Payment Inquiry</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setMessageCategory('request');
                                        setMessageSubject('General Request');
                                        setMessageBody('Dear Property Manager,\n\nI would like to make the following request:\n\n\n\nThank you for your consideration.');
                                    }}
                                    style={{
                                        backgroundColor: colors.surface,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        borderRadius: borderRadius.md,
                                        padding: spacing.sm,
                                        paddingHorizontal: spacing.md,
                                    }}
                                >
                                    <Text style={[typography.bodySmall, { color: colors.text }]}>General Request</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>

                    {/* Send Button */}
                    <Button
                        title={isSending ? "Sending..." : "Send Message"}
                        onPress={handleSendMessage}
                        variant="primary"
                        disabled={isSending}
                        icon={<Ionicons name="send" size={16} color="#FFFFFF" />}
                    />
                </View>
            </Modal>

            {/* Messages Tutorial */}
            <TutorialModal
                visible={showTutorial}
                onClose={handleTutorialClose}
                title="Communicate with Management"
                description="Send messages to your property manager and receive important notifications."
                steps={[
                    {
                        title: 'Inbox & Sent Messages',
                        description: 'Switch between Inbox to read messages and Sent to see your message history.',
                        icon: 'mail-outline'
                    },
                    {
                        title: 'Compose New Message',
                        description: 'Click the compose button to send a message to your property manager.',
                        icon: 'create-outline'
                    },
                    {
                        title: 'Message Categories',
                        description: 'Choose from categories like Maintenance, Billing, or General Inquiry to organize your messages.',
                        icon: 'folder-outline'
                    },
                    {
                        title: 'Quick Templates',
                        description: 'Use pre-written templates for common requests like maintenance issues or payment inquiries.',
                        icon: 'document-text-outline'
                    }
                ]}
            />
        </SafeAreaView>
    );
};
