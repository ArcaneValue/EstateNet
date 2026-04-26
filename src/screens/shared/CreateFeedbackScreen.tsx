import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFeedback } from '../../context/FeedbackContext';
import { useTheme } from '../../theme/ThemeContext';

const CATEGORIES = [
    { value: 'FEATURE_REQUEST', label: 'Feature Request', icon: 'bulb-outline' },
    { value: 'BUG_REPORT', label: 'Bug Report', icon: 'bug-outline' },
    { value: 'GENERAL', label: 'General Feedback', icon: 'chatbubble-outline' }
];

export const CreateFeedbackScreen = ({ navigation }: any) => {
    const { createPost } = useFeedback();
    const { colors, spacing } = useTheme();
    const insets = useSafeAreaInsets();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return;
        }
        if (!content.trim()) {
            Alert.alert('Error', 'Please enter your feedback');
            return;
        }
        if (!selectedCategory) {
            Alert.alert('Error', 'Please select a category');
            return;
        }

        setSubmitting(true);
        try {
            await createPost({
                title: title.trim(),
                content: content.trim(),
                category: selectedCategory
            });

            // Navigate back and pass a refresh flag
            navigation.navigate('FeedbackCommunity', { refresh: true });
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit feedback');
            setSubmitting(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>New Feedback</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={[styles.label, { color: colors.text }]}>Category</Text>
                <View style={styles.categoryContainer}>
                    {CATEGORIES.map((category) => (
                        <TouchableOpacity
                            key={category.value}
                            style={[
                                styles.categoryCard,
                                { backgroundColor: colors.surface, borderColor: colors.border },
                                selectedCategory === category.value && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
                            ]}
                            onPress={() => setSelectedCategory(category.value)}
                        >
                            <Ionicons
                                name={category.icon as any}
                                size={32}
                                color={selectedCategory === category.value ? colors.primary : colors.textSecondary}
                            />
                            <Text
                                style={[
                                    styles.categoryLabel,
                                    { color: colors.textSecondary },
                                    selectedCategory === category.value && { color: colors.primary, fontWeight: '600' }
                                ]}
                            >
                                {category.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={[styles.label, { color: colors.text }]}>Title</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    placeholder="Brief summary of your feedback"
                    placeholderTextColor={colors.textTertiary}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={100}
                />
                <Text style={[styles.charCount, { color: colors.textTertiary }]}>{title.length}/100</Text>

                <Text style={[styles.label, { color: colors.text }]}>Details</Text>
                <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    placeholder="Provide detailed information about your feedback"
                    placeholderTextColor={colors.textTertiary}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                    maxLength={1000}
                />
                <Text style={[styles.charCount, { color: colors.textTertiary }]}>{content.length}/1000</Text>
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: colors.primary }, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="send" size={20} color="#fff" />
                            <Text style={styles.submitButtonText}>Submit Feedback</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    content: {
        flex: 1,
        padding: 16
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        marginTop: 8
    },
    categoryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24
    },
    categoryCard: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 4,
        borderRadius: 12,
        borderWidth: 2
    },
    categoryLabel: {
        marginTop: 8,
        fontSize: 12,
        textAlign: 'center'
    },
    input: {
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        borderWidth: 1
    },
    textArea: {
        minHeight: 150,
        paddingTop: 12
    },
    charCount: {
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
        marginBottom: 16
    },
    footer: {
        padding: 16,
        borderTopWidth: 1
    },
    submitButton: {
        flexDirection: 'row',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    submitButtonDisabled: {
        opacity: 0.6
    },
    submitButtonText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
        color: '#fff'
    }
});
