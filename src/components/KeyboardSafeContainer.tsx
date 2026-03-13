import React from 'react';
import {
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    ViewStyle,
} from 'react-native';

interface KeyboardSafeContainerProps {
    children: React.ReactNode;
    headerOffset?: number;
    scroll?: boolean;
    contentContainerStyle?: ViewStyle;
}

export const KeyboardSafeContainer: React.FC<KeyboardSafeContainerProps> = ({
    children,
    headerOffset = 0,
    scroll = true,
    contentContainerStyle,
}) => {
    const keyboardVerticalOffset = Platform.OS === 'ios' ? headerOffset : 0;

    if (scroll) {
        return (
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={keyboardVerticalOffset}
            >
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        { paddingBottom: 100 },
                        contentContainerStyle,
                    ]}
                >
                    {children}
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={keyboardVerticalOffset}
        >
            {children}
        </KeyboardAvoidingView>
    );
};
