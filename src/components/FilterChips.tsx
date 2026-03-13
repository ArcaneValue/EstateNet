import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface FilterChipsProps {
  options: { label: string; value: string }[];
  selectedValue?: string;
  onSelect: (value?: string) => void;
  allowClear?: boolean;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  options,
  selectedValue,
  onSelect,
  allowClear = false,
}) => {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const handlePress = (value: string) => {
    if (allowClear && selectedValue === value) {
      onSelect(undefined);
    } else {
      onSelect(value);
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, { gap: spacing.sm }]}
    >
      {options.map((option) => {
        const isSelected = selectedValue === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => handlePress(option.value)}
            style={[
              styles.chip,
              {
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.full,
                borderWidth: 1,
                borderColor: isSelected ? colors.primary : colors.border,
                backgroundColor: isSelected ? colors.primary : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                typography.body,
                {
                  color: isSelected ? colors.background : colors.text,
                  fontWeight: isSelected ? '600' : '400',
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
});
