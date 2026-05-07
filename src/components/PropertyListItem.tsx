import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Card } from './Card';
import { Ionicons } from '@expo/vector-icons';

interface PropertyListItemProps {
    propertyId: string;
    name: string;
    location: string;
    occupiedUnits: number;
    totalUnits: number;
    monthlyRent: number;
    imageUrl?: string;
    onPress: () => void;
}

export const PropertyListItem: React.FC<PropertyListItemProps> = ({
    name,
    location,
    occupiedUnits,
    totalUnits,
    monthlyRent,
    imageUrl,
    onPress,
}) => {
    const { colors, spacing, typography } = useTheme();
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <Card style={{ marginBottom: spacing.md }}>
                <View style={styles.container}>
                    {/* Property Image or Icon */}
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl }}
                            style={[
                                styles.iconContainer,
                                { borderRadius: 24 }
                            ]}
                            resizeMode="cover"
                        />
                    ) : (
                        <View
                            style={[
                                styles.iconContainer,
                                { backgroundColor: colors.primary + '20' },
                            ]}
                        >
                            <Ionicons name="business" size={24} color={colors.primary} />
                        </View>
                    )}

                    {/* Property Info */}
                    <View style={styles.infoContainer}>
                        <Text style={[typography.h4, { color: colors.text }]}>{name}</Text>
                        <Text
                            style={[
                                typography.bodySmall,
                                { color: colors.textSecondary, marginTop: spacing.xs },
                            ]}
                        >
                            <Ionicons name="location-outline" size={12} /> {location}
                        </Text>

                        {/* Units & Revenue */}
                        <View style={[styles.statsRow, { marginTop: spacing.sm }]}>
                            <View style={styles.stat}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    Units
                                </Text>
                                <Text style={[typography.h4, { color: colors.text, marginTop: 2 }]}>
                                    {occupiedUnits}/{totalUnits}
                                </Text>
                            </View>
                            <View style={styles.stat}>
                                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                    Monthly Revenue
                                </Text>
                                <Text style={[typography.h4, { color: colors.success, marginTop: 2 }]}>
                                    UGX {(monthlyRent / 1000000).toFixed(1)}M
                                </Text>
                            </View>
                        </View>

                        {/* Occupancy Indicator */}
                        <View style={[styles.occupancyBar, { marginTop: spacing.sm }]}>
                            <View
                                style={[
                                    styles.occupancyFill,
                                    {
                                        width: `${occupancyRate}%`,
                                        backgroundColor:
                                            occupancyRate >= 90
                                                ? colors.success
                                                : occupancyRate >= 70
                                                    ? colors.warning
                                                    : colors.error,
                                    },
                                ]}
                            />
                        </View>
                        <Text
                            style={[
                                typography.caption,
                                { color: colors.textSecondary, marginTop: spacing.xs },
                            ]}
                        >
                            {occupancyRate.toFixed(0)}% Occupied
                        </Text>
                    </View>

                    {/* Chevron */}
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
            </Card>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    infoContainer: {
        flex: 1,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    stat: {
        flex: 1,
    },
    occupancyBar: {
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        overflow: 'hidden',
    },
    occupancyFill: {
        height: '100%',
        borderRadius: 2,
    },
});
