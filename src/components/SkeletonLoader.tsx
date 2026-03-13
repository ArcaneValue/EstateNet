import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface SkeletonLoaderProps {
    width?: DimensionValue;
    height: number;
    borderRadius?: number;
    style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    width = '100%',
    height,
    borderRadius = 8,
    style,
}) => {
    const { colors } = useTheme();
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [opacity]);

    return (
        <View style={[{ width, height, borderRadius, overflow: 'hidden' }, style]}>
            <Animated.View
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: colors.border,
                    opacity,
                }}
            />
        </View>
    );
};
