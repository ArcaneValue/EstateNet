import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Input } from './Input';
import { Button } from './Button';
import { KeyboardSafeContainer } from './KeyboardSafeContainer';
import { Ionicons } from '@expo/vector-icons';
import { Property, PropertyType, OwnershipType, MaintenanceCondition, Unit } from '../types/types';

interface AddPropertyFormProps {
    onSubmit: (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onCancel: () => void;
}

export const AddPropertyForm: React.FC<AddPropertyFormProps> = ({ onSubmit, onCancel }) => {
    const { colors, spacing, typography, borderRadius, shadows } = useTheme();

    // Initial Form State
    const [formData, setFormData] = useState<Partial<Property>>({
        name: '',
        location: '',
        propertyType: 'apartment',
        units: [],
        ownership: 'personal',
        propertyOwner: '',
        decisionAuthority: '',
        existingArrears: 0,
        creditors: '',
        monthlyExpenses: 0,
        expenseApprovalLimit: 0,
        rentCollectionMethod: 'Bank Transfer',
        paymentTerms: 'Monthly',
        latePaymentPolicy: '',
        securityDeposit: 0,
        maintenanceCondition: 'good',
        fireSafetySystems: false,
        legalCompliance: '',
        requiredRepairs: '',
        maintenanceHandler: '',
        communicationHandler: '',
        expenseApprover: '',
        emergencyContacts: '',
    });

    const [numUnits, setNumUnits] = useState<string>('0');
    const [sqFootage, setSqFootage] = useState<string>('');
    const [unitRate, setUnitRate] = useState<string>('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [currentStep, setCurrentStep] = useState(0); // 0: Basic, 1: Ownership, 2: Financial, 3: Maintenance, 4: Operational

    // Helper to update form data
    const updateField = (field: keyof Property, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error if exists
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // Handle Unit Generation
    useEffect(() => {
        const count = parseInt(numUnits) || 0;
        const footage = parseInt(sqFootage) || 0;
        const rate = parseInt(unitRate) || 0;

        if (count > 0) {
            const newUnits: Unit[] = Array.from({ length: count }).map((_, index) => ({
                id: `TEMP-${index}`,
                unitNumber: `Unit ${index + 1}`,
                squareFootage: footage,
                rentAmount: rate,
                isOccupied: false
            }));
            setFormData(prev => ({ ...prev, units: newUnits }));
        }
    }, [numUnits, sqFootage, unitRate]);

    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        if (step === 0) { // Basic
            if (!formData.name) newErrors.name = 'Property Name is required';
            if (!formData.location) newErrors.location = 'Location is required';
            if (!numUnits || parseInt(numUnits) < 1) newErrors.numUnits = 'At least 1 unit is required';
        }
        // Add more validations for other steps if needed

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 4));
        } else {
            Alert.alert('Validation Error', 'Please fill in all required fields.');
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    const handleSubmit = () => {
        if (validateStep(currentStep)) {
            // Final validation check
            if (!formData.name || !formData.location) {
                Alert.alert('Error', 'Please complete all required fields');
                return;
            }
            onSubmit(formData as any);
        }
    };

    // --- Custom Components ---

    const SectionHeader = ({ title, step }: { title: string, step: number }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.lg }}>
            <View style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: currentStep >= step ? colors.primary : colors.border,
                justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm
            }}>
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>{step + 1}</Text>
            </View>
            <Text style={[typography.h3, { color: colors.text }]}>{title}</Text>
        </View>
    );

    const RadioGroup = ({ options, value, onChange }: { options: string[], value: string, onChange: (val: string) => void }) => (
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
            {options.map(opt => (
                <TouchableOpacity
                    key={opt}
                    onPress={() => onChange(opt)}
                    style={{
                        flexDirection: 'row', alignItems: 'center',
                        padding: spacing.sm, borderWidth: 1,
                        borderColor: value === opt ? colors.primary : colors.border,
                        borderRadius: borderRadius.md,
                        backgroundColor: value === opt ? colors.primary + '10' : 'transparent'
                    }}
                >
                    <View style={{
                        width: 16, height: 16, borderRadius: 8, borderWidth: 2,
                        borderColor: value === opt ? colors.primary : colors.textSecondary,
                        marginRight: spacing.sm,
                        justifyContent: 'center', alignItems: 'center'
                    }}>
                        {value === opt && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />}
                    </View>
                    <Text style={[typography.body, { color: value === opt ? colors.primary : colors.text }]}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const StarRating = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
        const ratings = ['poor', 'fair', 'good', 'excellent'];
        const currentIndex = ratings.indexOf(value);

        return (
            <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md }}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => {
                        const index = Math.min(star - 1, 3); // Map 5 stars to 4 values loosely
                        onChange(ratings[index]);
                    }}>
                        <Ionicons
                            name={star <= (currentIndex + 2) ? "star" : "star-outline"}
                            size={32}
                            color={colors.warning}
                        />
                    </TouchableOpacity>
                ))}
                <Text style={[typography.body, { marginLeft: spacing.sm, alignSelf: 'center', color: colors.textSecondary }]}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                </Text>
            </View>
        );
    };

    const Checkbox = ({ label, value, onChange }: { label: string, value: boolean, onChange: (val: boolean) => void }) => (
        <TouchableOpacity
            onPress={() => onChange(!value)}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}
        >
            <View style={{
                width: 20, height: 20, borderRadius: 4, borderWidth: 2,
                borderColor: value ? colors.primary : colors.textSecondary,
                marginRight: spacing.sm,
                justifyContent: 'center', alignItems: 'center',
                backgroundColor: value ? colors.primary : 'transparent'
            }}>
                {value && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
            <Text style={[typography.body, { color: colors.text }]}>{label}</Text>
        </TouchableOpacity>
    );

    // --- Form Sections ---

    const renderBasicInfo = () => (
        <View>
            <Input
                label="Property Name *"
                placeholder="e.g. Sunset Apartments"
                value={formData.name}
                onChangeText={(text) => updateField('name', text)}
                error={errors.name}
                containerStyle={{ marginBottom: spacing.md }}
            />
            <Input
                label="Location *"
                placeholder="Address or Area"
                value={formData.location}
                onChangeText={(text) => updateField('location', text)}
                error={errors.location}
                containerStyle={{ marginBottom: spacing.md }}
                icon={<Ionicons name="location-outline" size={20} color={colors.textSecondary} />}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Input
                    label="Number of Units *"
                    placeholder="0"
                    keyboardType="numeric"
                    value={numUnits}
                    onChangeText={setNumUnits}
                    error={errors.numUnits}
                    containerStyle={{ marginBottom: spacing.md, flex: 0.48 }}
                />
                <Input
                    label="Sq Ft per Unit"
                    placeholder="e.g. 1200"
                    keyboardType="numeric"
                    value={sqFootage}
                    onChangeText={setSqFootage}
                    containerStyle={{ marginBottom: spacing.md, flex: 0.48 }}
                />
            </View>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }]}>
                Ownership Type
            </Text>
            <RadioGroup
                options={['personal', 'company']}
                value={formData.ownership || 'personal'}
                onChange={(val) => updateField('ownership', val)}
            />
        </View>
    );

    const renderOwnershipDetails = () => (
        <View>
            <Input
                label="Owner / Authority Name"
                placeholder="Who owns this property?"
                value={formData.propertyOwner}
                onChangeText={(text) => updateField('propertyOwner', text)}
                containerStyle={{ marginBottom: spacing.md }}
            />
            <Input
                label="Standard Monthly Rent (UGX)"
                placeholder="e.g. 1,500,000"
                keyboardType="numeric"
                value={unitRate ? formatMoney(unitRate) : ''}
                onChangeText={(text) => setUnitRate(text.replace(/,/g, ''))}
                containerStyle={{ marginBottom: spacing.md }}
            />
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                * This rent will be applied to all {numUnits} generated units. You can edit individual units later.
            </Text>

            <Input
                label="Decision Authority"
                placeholder="e.g. Property Manager"
                value={formData.decisionAuthority}
                onChangeText={(text) => updateField('decisionAuthority', text)}
                containerStyle={{ marginBottom: spacing.md }}
            />
        </View>
    );

    // Format money with commas
    const formatMoney = (value: string) => {
        const num = value.replace(/[^0-9]/g, '');
        return num ? Number(num).toLocaleString() : '';
    };

    const parseMoney = (value: string) => {
        return Number(value.replace(/,/g, '')) || 0;
    };

    const renderFinancialInfo = () => (
        <View>
            <Input
                label="Existing Arrears (UGX)"
                placeholder="0"
                keyboardType="numeric"
                value={formData.existingArrears ? formatMoney(formData.existingArrears.toString()) : ''}
                onChangeText={(text) => updateField('existingArrears', parseMoney(text))}
                containerStyle={{ marginBottom: spacing.md }}
            />
            <Input
                label="Creditors / Service Providers"
                placeholder="e.g. Water, Electricity, Security"
                value={formData.creditors}
                onChangeText={(text) => updateField('creditors', text)}
                containerStyle={{ marginBottom: spacing.md }}
            />
            <Input
                label="Estimated Monthly Expenses (UGX)"
                placeholder="0"
                keyboardType="numeric"
                value={formData.monthlyExpenses ? formatMoney(formData.monthlyExpenses.toString()) : ''}
                onChangeText={(text) => updateField('monthlyExpenses', parseMoney(text))}
                containerStyle={{ marginBottom: spacing.md }}
            />
            <Input
                label="Expense Approval Limit (UGX)"
                placeholder="0"
                keyboardType="numeric"
                value={formData.expenseApprovalLimit ? formatMoney(formData.expenseApprovalLimit.toString()) : ''}
                onChangeText={(text) => updateField('expenseApprovalLimit', parseMoney(text))}
                containerStyle={{ marginBottom: spacing.md }}
            />
        </View>
    );

    const renderMaintenance = () => (
        <View>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }]}>
                Building Condition
            </Text>
            <StarRating
                value={formData.maintenanceCondition || 'good'}
                onChange={(val) => updateField('maintenanceCondition', val)}
            />

            <Checkbox
                label="Fire Safety Systems Installed?"
                value={formData.fireSafetySystems || false}
                onChange={(val) => updateField('fireSafetySystems', val)}
            />

            <Input
                label="Legal Compliance Notes"
                placeholder="Permits, Insurance, etc."
                multiline
                numberOfLines={3}
                value={formData.legalCompliance}
                onChangeText={(text) => updateField('legalCompliance', text)}
                containerStyle={{ marginBottom: spacing.md }}
            />
        </View>
    );

    const rentCollectionOptions = ['EstateNet', 'Bank Transfer', 'Mobile Money', 'Cash'];
    const [showRentCollectionDropdown, setShowRentCollectionDropdown] = useState(false);

    const renderOperational = () => (
        <View>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }]}>
                Preferred Rent Collection
            </Text>
            <TouchableOpacity
                onPress={() => setShowRentCollectionDropdown(!showRentCollectionDropdown)}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: colors.surface,
                    borderWidth: 2,
                    borderColor: showRentCollectionDropdown ? colors.accent : colors.border,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    marginBottom: showRentCollectionDropdown ? 0 : spacing.md,
                }}
            >
                <Text style={[typography.body, { color: formData.rentCollectionMethod ? colors.text : colors.textTertiary }]}>
                    {formData.rentCollectionMethod || 'Select method'}
                </Text>
                <Ionicons
                    name={showRentCollectionDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.textSecondary}
                />
            </TouchableOpacity>
            {showRentCollectionDropdown && (
                <View style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderTopWidth: 0,
                    borderColor: colors.border,
                    borderBottomLeftRadius: borderRadius.md,
                    borderBottomRightRadius: borderRadius.md,
                    marginBottom: spacing.md,
                }}>
                    {rentCollectionOptions.map((option) => (
                        <TouchableOpacity
                            key={option}
                            onPress={() => {
                                updateField('rentCollectionMethod', option);
                                setShowRentCollectionDropdown(false);
                            }}
                            style={{
                                padding: spacing.md,
                                borderBottomWidth: option !== rentCollectionOptions[rentCollectionOptions.length - 1] ? 1 : 0,
                                borderBottomColor: colors.border,
                                backgroundColor: formData.rentCollectionMethod === option ? colors.primary + '10' : 'transparent',
                            }}
                        >
                            <Text style={[
                                typography.body,
                                { color: formData.rentCollectionMethod === option ? colors.primary : colors.text }
                            ]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <Text style={[typography.h4, { color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm }]}>Responsibilities</Text>

            <Input
                label="Maintenance Handler"
                placeholder="Name/Role"
                value={formData.maintenanceHandler}
                onChangeText={(text) => updateField('maintenanceHandler', text)}
                containerStyle={{ marginBottom: spacing.md }}
            />
            <Input
                label="Communication Handler"
                placeholder="Name/Role"
                value={formData.communicationHandler}
                onChangeText={(text) => updateField('communicationHandler', text)}
                containerStyle={{ marginBottom: spacing.md }}
            />
            <Input
                label="Emergency Contacts"
                placeholder="Phone numbers"
                value={formData.emergencyContacts}
                onChangeText={(text) => updateField('emergencyContacts', text)}
                containerStyle={{ marginBottom: spacing.md }}
            />
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{
                padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <Text style={[typography.h2, { color: colors.text }]}>Property Details</Text>
                <TouchableOpacity onPress={onCancel}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <KeyboardSafeContainer contentContainerStyle={{ padding: spacing.lg }}>
                {currentStep === 0 && (
                    <>
                        <SectionHeader title="Basic Information" step={0} />
                        {renderBasicInfo()}
                    </>
                )}
                {currentStep === 1 && (
                    <>
                        <SectionHeader title="Ownership Details" step={1} />
                        {renderOwnershipDetails()}
                    </>
                )}
                {currentStep === 2 && (
                    <>
                        <SectionHeader title="Financial Information" step={2} />
                        {renderFinancialInfo()}
                    </>
                )}
                {currentStep === 3 && (
                    <>
                        <SectionHeader title="Maintenance & Compliance" step={3} />
                        {renderMaintenance()}
                    </>
                )}
                {currentStep === 4 && (
                    <>
                        <SectionHeader title="Operational Details" step={4} />
                        {renderOperational()}
                    </>
                )}
            </KeyboardSafeContainer>

            {/* Footer */}
            <View style={{
                padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border,
                flexDirection: 'row', gap: spacing.md
            }}>
                {currentStep > 0 ? (
                    <Button
                        title="Back"
                        onPress={handleBack}
                        variant="outline"
                        style={{ flex: 1 }}
                    />
                ) : (
                    <Button
                        title="Cancel"
                        onPress={onCancel}
                        variant="outline"
                        style={{ flex: 1 }}
                    />
                )}

                {currentStep < 4 ? (
                    <Button
                        title="Next"
                        onPress={handleNext}
                        variant="primary"
                        style={{ flex: 1 }}
                    />
                ) : (
                    <Button
                        title="Submit Property"
                        onPress={handleSubmit}
                        variant="primary"
                        style={{ flex: 1 }}
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({});
