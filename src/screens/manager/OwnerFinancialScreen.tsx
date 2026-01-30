import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useProperties } from '../../context/PropertyContext';
import { usePayments } from '../../context/PaymentContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { Ionicons } from '@expo/vector-icons';

interface OwnerFinancialScreenProps {
    navigation: any;
}

export const OwnerFinancialScreen: React.FC<OwnerFinancialScreenProps> = ({ navigation }) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const { user } = useAuth();
    const { getOwnedProperties } = useProperties();
    const { payments, generateIncomeStatement, generateBalanceSheet, generateCashflowStatement } = usePayments();

    const [showExportModal, setShowExportModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState<string>('');

    const ownedProperties = user ? getOwnedProperties(user.id) : [];

    // Calculate financial metrics across all owned properties
    const totalRentCollected = ownedProperties.reduce((total, property) => {
        const propertyPayments = payments.filter(p => p.propertyId === property.id);
        return total + propertyPayments.reduce((sum, payment) => sum + payment.amount, 0);
    }, 0);

    const totalOutstanding = ownedProperties.reduce((total, property) => {
        const occupiedUnits = property.units.filter(unit => unit.isOccupied);
        return total + occupiedUnits.reduce((sum, unit) => sum + (unit.rentAmount * 0.1), 0); // Assume 10% outstanding
    }, 0);

    const totalMonthlyRent = ownedProperties.reduce((total, property) => {
        const occupiedUnits = property.units.filter(unit => unit.isOccupied);
        return total + occupiedUnits.reduce((sum, unit) => sum + unit.rentAmount, 0);
    }, 0);

    const totalExpenses = ownedProperties.reduce((total, property) => {
        return total + property.monthlyExpenses;
    }, 0);

    const netIncome = totalRentCollected - totalExpenses;
    const occupancyRate = ownedProperties.reduce((total, property) => {
        const occupied = property.units.filter(unit => unit.isOccupied).length;
        return total + (occupied / property.units.length * 100);
    }, 0) / (ownedProperties.length || 1);

    const handleExportReport = (reportType: string) => {
        setSelectedReport(reportType);
        setShowExportModal(false);

        // Mock export functionality
        setTimeout(() => {
            Alert.alert(
                'Export Successful',
                `${reportType} report has been exported successfully and saved to your device.`,
                [{ text: 'OK', onPress: () => setSelectedReport('') }]
            );
        }, 1000);
    };

    const formatCurrency = (amount: number) => {
        return `UGX ${(amount / 1000000).toFixed(1)}M`;
    };

    const formatPercentage = (value: number) => {
        return `${value.toFixed(1)}%`;
    };

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
                        Financial Overview
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        {ownedProperties.length} propert{ownedProperties.length !== 1 ? 'ies' : 'y'}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => setShowExportModal(true)}
                    style={{
                        backgroundColor: colors.primary,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}
                >
                    <Ionicons name="download" size={16} color="#FFFFFF" />
                    <Text style={[typography.bodySmall, { color: '#FFFFFF', marginLeft: spacing.xs }]}>
                        Export
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.base }}>

                {/* Summary Cards */}
                <View style={styles.summaryGrid}>
                    <Card style={[styles.summaryCard, { backgroundColor: colors.successLight, marginRight: 6 }]}>
                        <View style={styles.summaryContent}>
                            <Ionicons name="trending-up" size={24} color={colors.success} />
                            <Text style={[typography.h2, { color: colors.success, marginTop: spacing.sm }]}>
                                {formatCurrency(totalRentCollected)}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.success, marginTop: spacing.xs }]}>
                                Total Rent Collected
                            </Text>
                        </View>
                    </Card>

                    <Card style={[styles.summaryCard, { backgroundColor: colors.errorLight, marginLeft: 6 }]}>
                        <View style={styles.summaryContent}>
                            <Ionicons name="alert-circle" size={24} color={colors.error} />
                            <Text style={[typography.h2, { color: colors.error, marginTop: spacing.sm }]}>
                                {formatCurrency(totalOutstanding)}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.error, marginTop: spacing.xs }]}>
                                Outstanding Arrears
                            </Text>
                        </View>
                    </Card>
                </View>

                <View style={[styles.summaryGrid, { marginTop: spacing.lg }]}>
                    <Card style={[styles.summaryCard, { backgroundColor: colors.primary + '15', marginRight: 6 }]}>
                        <View style={styles.summaryContent}>
                            <Ionicons name="cash" size={24} color={colors.primary} />
                            <Text style={[typography.h2, { color: colors.primary, marginTop: spacing.sm }]}>
                                {formatCurrency(netIncome)}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.primary, marginTop: spacing.xs }]}>
                                Net Income
                            </Text>
                        </View>
                    </Card>

                    <Card style={[styles.summaryCard, { backgroundColor: colors.accent + '15', marginLeft: 6 }]}>
                        <View style={styles.summaryContent}>
                            <Ionicons name="home" size={24} color={colors.accent} />
                            <Text style={[typography.h2, { color: colors.accent, marginTop: spacing.sm }]}>
                                {formatPercentage(occupancyRate)}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.accent, marginTop: spacing.xs }]}>
                                Occupancy Rate
                            </Text>
                        </View>
                    </Card>
                </View>

                {/* Monthly Breakdown */}
                <Card style={{ marginBottom: spacing.lg }}>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                        Monthly Breakdown
                    </Text>

                    <View style={{ marginBottom: spacing.md }}>
                        <View style={styles.breakdownRow}>
                            <Text style={[typography.body, { color: colors.text }]}>
                                Total Monthly Rent
                            </Text>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                {formatCurrency(totalMonthlyRent)}
                            </Text>
                        </View>

                        <View style={styles.breakdownRow}>
                            <Text style={[typography.body, { color: colors.text }]}>
                                Operating Expenses
                            </Text>
                            <Text style={[typography.body, { color: colors.error, fontWeight: '600' }]}>
                                -{formatCurrency(totalExpenses)}
                            </Text>
                        </View>

                        <View style={[
                            styles.breakdownRow,
                            { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md, marginTop: spacing.sm }
                        ]}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                Net Monthly Income
                            </Text>
                            <Text style={[
                                typography.body,
                                { color: netIncome >= 0 ? colors.success : colors.error, fontWeight: '600' }
                            ]}>
                                {netIncome >= 0 ? '+' : ''}{formatCurrency(netIncome)}
                            </Text>
                        </View>
                    </View>
                </Card>

                {/* Property Performance */}
                <Card style={{ marginBottom: spacing.lg }}>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                        Property Performance
                    </Text>

                    {ownedProperties.map((property) => {
                        const propertyPayments = payments.filter(p => p.propertyId === property.id);
                        const propertyRentCollected = propertyPayments.reduce((sum, p) => sum + p.amount, 0);
                        const occupiedUnits = property.units.filter(unit => unit.isOccupied).length;
                        const propertyOccupancyRate = (occupiedUnits / property.units.length) * 100;

                        return (
                            <View key={property.id} style={[styles.propertyRow, { marginBottom: spacing.md }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                        {property.name}
                                    </Text>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                        {occupiedUnits}/{property.units.length} units occupied
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[typography.body, { color: colors.success, fontWeight: '600' }]}>
                                        {formatCurrency(propertyRentCollected)}
                                    </Text>
                                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                        {formatPercentage(propertyOccupancyRate)}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </Card>

                {/* Quick Actions */}
                <Card>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                        Reports & Analytics
                    </Text>

                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => handleExportReport('Income Statement')}
                        >
                            <Ionicons name="document-text" size={20} color={colors.primary} />
                            <Text style={[typography.bodySmall, { color: colors.text, marginTop: 4 }]}>
                                Income Statement
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => handleExportReport('Balance Sheet')}
                        >
                            <Ionicons name="pie-chart" size={20} color={colors.accent} />
                            <Text style={[typography.bodySmall, { color: colors.text, marginTop: 4 }]}>
                                Balance Sheet
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => handleExportReport('Cash Flow')}
                        >
                            <Ionicons name="swap-horizontal" size={20} color={colors.success} />
                            <Text style={[typography.bodySmall, { color: colors.text, marginTop: 4 }]}>
                                Cash Flow
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Card>
            </ScrollView>

            {/* Export Modal */}
            <Modal
                visible={showExportModal}
                title="Export Report"
                onClose={() => setShowExportModal(false)}
            >
                <View style={{ padding: spacing.base }}>
                    <Text style={[typography.body, { color: colors.text, marginBottom: spacing.lg }]}>
                        Select the report you want to export as PDF:
                    </Text>

                    {[
                        { id: 'Income Statement', label: 'Income Statement', icon: 'document-text' },
                        { id: 'Balance Sheet', label: 'Balance Sheet', icon: 'pie-chart' },
                        { id: 'Cash Flow Statement', label: 'Cash Flow Statement', icon: 'swap-horizontal' },
                        { id: 'Property Performance', label: 'Property Performance', icon: 'bar-chart' },
                    ].map((report) => (
                        <TouchableOpacity
                            key={report.id}
                            style={[
                                styles.reportOption,
                                { borderColor: colors.border }
                            ]}
                            onPress={() => handleExportReport(report.label)}
                        >
                            <Ionicons name={report.icon as any} size={20} color={colors.primary} />
                            <Text style={[typography.body, { color: colors.text, marginLeft: spacing.md }]}>
                                {report.label}
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    ))}
                </View>
            </Modal>

            {/* Export Success Modal */}
            <Modal
                visible={selectedReport !== ''}
                title="Exporting Report"
                onClose={() => setSelectedReport('')}
                showCloseButton={false}
            >
                <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                    <View style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: colors.successLight,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: spacing.lg,
                    }}>
                        <Ionicons name="checkmark" size={32} color={colors.success} />
                    </View>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>
                        Export Successful!
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                        {selectedReport} has been exported and saved to your device.
                    </Text>
                    <Button
                        title="Done"
                        onPress={() => setSelectedReport('')}
                        variant="primary"
                        style={{ marginTop: spacing.lg }}
                    />
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    summaryGrid: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    summaryCard: {
        flex: 1,
        padding: 16,
    },
    summaryContent: {
        alignItems: 'center',
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    propertyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginHorizontal: 2,
    },
    reportOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 12,
    },
});
