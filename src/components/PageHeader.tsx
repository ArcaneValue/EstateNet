import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

interface RightAction {
  label?: string;
  iconName?: string;
  onPress: () => void;
  loading?: boolean;
  badge?: number;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  rightAction?: RightAction;
  rightActions?: RightAction[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  showBack = true,
  rightAction,
  rightActions
}) => {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const actions = rightActions || (rightAction ? [rightAction] : []);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.md,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.content}>
        {showBack && onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={[styles.backButton, { padding: spacing.sm }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}

        <View style={styles.titleContainer}>
          <Text
            style={[
              typography.h2,
              { color: colors.text, textAlign: 'center' },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                typography.bodySmall,
                { color: colors.textSecondary, textAlign: 'center', marginTop: 2 },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.rightContainer}>
          {actions.length > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {actions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={action.onPress}
                  disabled={action.loading}
                  style={[
                    styles.rightAction,
                    {
                      padding: spacing.sm,
                      opacity: action.loading ? 0.6 : 1,
                    },
                  ]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {action.loading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      {action.iconName && (
                        <View>
                          <Ionicons
                            name={action.iconName as any}
                            size={22}
                            color={colors.primary}
                          />
                          {action.badge !== undefined && action.badge > 0 && (
                            <View style={{
                              position: 'absolute',
                              top: -6,
                              right: -6,
                              backgroundColor: colors.error,
                              borderRadius: 8,
                              minWidth: 16,
                              height: 16,
                              justifyContent: 'center',
                              alignItems: 'center',
                              paddingHorizontal: 4,
                            }}>
                              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>
                                {action.badge > 99 ? '99+' : action.badge}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                      {action.label && (
                        <Text style={[typography.body, { color: colors.primary, fontWeight: '600', marginLeft: action.iconName ? spacing.xs : 0 }]}>
                          {action.label}
                        </Text>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
});
