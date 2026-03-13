import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ScreenWrapperProps {
    children: React.ReactNode;
    style?: any;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ children, style }) => {
    const { colors } = useTheme();

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.background,
                },
                style
            ]}
        >
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
