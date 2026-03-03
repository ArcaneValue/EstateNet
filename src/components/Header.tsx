import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface HeaderProps {
    title: string;
    onBackPress?: () => void;
    rightIcon?: React.ReactNode;
    backgroundColor?: string;
}

export const Header: React.FC<HeaderProps> = ({
    title,
    onBackPress,
    rightIcon,
    backgroundColor,
}) => {
    const { colors, spacing, typography } = useTheme();

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: backgroundColor || colors.surface,
                    borderBottomColor: colors.border,
                    paddingTop: Platform.OS === 'android' ? 45 : 50,
                },
            ]}
        >
            <View style={styles.content}>
                {onBackPress && (
                    <TouchableOpacity
                        onPress={onBackPress}
                        style={[styles.backButton, { marginRight: spacing.base }]}
                    >
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                )}
                
                <Text
                    style={[
                        typography.h3,
                        styles.title,
                        { color: colors.text, flex: 1 },
                    ]}
                    numberOfLines={1}
                >
                    {title}
                </Text>

                {rightIcon && (
                    <View style={styles.rightIcon}>
                        {rightIcon}
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderBottomWidth: 1,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        minHeight: 56,
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontWeight: '600',
        fontSize: 18,
    },
    rightIcon: {
        marginLeft: 8,
    },
});
