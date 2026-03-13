import React, { useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Alert,
    Modal as RNModal,
    TextInput,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/Button';

interface ManageAccessScreenProps {
    navigation: any;
    route: any;
}

export const ManageAccessScreen: React.FC<ManageAccessScreenProps> = ({ navigation, route }) => {
    const { colors, spacing, typography, shadows } = useTheme();

    const propertyId = route.params?.propertyId;
    const propertyName = route.params?.propertyName || 'Property';

    const [managers, setManagers] = useState<any[]>([]);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');

    const handleInviteManager = () => {
        if (!inviteEmail.trim()) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }
        Alert.alert('Info', 'Manager invitation feature will be implemented with backend integration');
        setInviteEmail('');
        setShowInviteModal(false);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <PageHeader
                title="Manage Access"
                subtitle={propertyName}
                onBack={() => navigation.goBack()}
            />

            <View style={{ flex: 1, padding: spacing.lg }}>
                {/* Invite Manager Button */}
                <Button
                    title="Invite Manager"
                    onPress={() => setShowInviteModal(true)}
                    variant="primary"
                    size="large"
                    style={{ marginBottom: spacing.lg }}
                    icon={<Ionicons name="person-add" size={18} color="#FFFFFF" />}
                />

                {/* Managers List */}
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                    Property Managers ({managers.length})
                </Text>

                <FlatList
                    data={managers}
                    keyExtractor={(item, index) => index.toString()}
                    ListEmptyComponent={
                        <View style={{
                            backgroundColor: colors.surface,
                            padding: spacing.xl,
                            borderRadius: 12,
                            alignItems: 'center',
                            ...shadows.sm,
                        }}>
                            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
                                No Managers Yet
                            </Text>
                            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                                Invite a manager to get started
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={{
                            backgroundColor: colors.surface,
                            padding: spacing.lg,
                            marginBottom: spacing.md,
                            borderRadius: 12,
                            ...shadows.sm,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    backgroundColor: colors.primary,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: spacing.md,
                                }}>
                                    <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }}>
                                        {item.name?.charAt(0)?.toUpperCase() || 'M'}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                        {item.name}
                                    </Text>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                        {item.email}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                />
            </View>

            {/* Invite Manager Modal */}
            <RNModal
                visible={showInviteModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowInviteModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    padding: spacing.lg,
                }}>
                    <View style={{
                        backgroundColor: colors.background,
                        borderRadius: 12,
                        padding: spacing.lg,
                    }}>
                        <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
                            Invite Manager
                        </Text>

                        <TextInput
                            placeholder="Manager email address"
                            placeholderTextColor={colors.textSecondary}
                            value={inviteEmail}
                            onChangeText={setInviteEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={{
                                backgroundColor: colors.surface,
                                borderRadius: 8,
                                padding: spacing.md,
                                color: colors.text,
                                marginBottom: spacing.lg,
                            }}
                        />

                        <View style={{ flexDirection: 'row', gap: spacing.md }}>
                            <Button
                                title="Cancel"
                                onPress={() => setShowInviteModal(false)}
                                variant="outline"
                                style={{ flex: 1 }}
                            />
                            <Button
                                title="Send Invitation"
                                onPress={handleInviteManager}
                                variant="primary"
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </View>
            </RNModal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({});
