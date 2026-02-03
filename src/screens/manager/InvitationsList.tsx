import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';

export interface ManagerInvitation {
  id: string;
  tenantId: string;
  tenantName?: string;
  tenantEmail?: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  rentAmount: number;
  status: InvitationStatus;
  createdAt: string;
  respondedAt?: string | null;
}

interface InvitationsListProps {
  invitations: ManagerInvitation[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onCancel?: (id: string) => void;
  cancellingId?: string | null;
  colors: any;
  spacing: any;
  typography: any;
}

const StatusBadge: React.FC<{ status: InvitationStatus; colors: any }> = ({ status, colors }) => {
  const statusColors: Record<InvitationStatus, string> = {
    PENDING: colors.warning,
    ACCEPTED: colors.success,
    DECLINED: colors.error,
    EXPIRED: colors.textTertiary,
    CANCELLED: colors.textTertiary,
  };

  return (
    <View
      style={{
        backgroundColor: statusColors[status] + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: '600', color: statusColors[status] }}>
        {status}
      </Text>
    </View>
  );
};

export const InvitationsList: React.FC<InvitationsListProps> = ({
  invitations,
  loading,
  error,
  onRetry,
  onCancel,
  cancellingId,
  colors,
  spacing,
  typography,
}) => {
  if (loading) {
    return (
      <View style={{ padding: spacing.lg, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Loading invitations...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: spacing.lg, alignItems: 'center' }}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={[typography.body, { color: colors.error, marginTop: spacing.md, textAlign: 'center' }]}>
          {error}
        </Text>
        <Button title="Retry" onPress={onRetry} variant="primary" size="medium" style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  if (invitations.length === 0) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          padding: spacing.xl,
          borderRadius: 12,
          alignItems: 'center',
          marginTop: spacing.md,
        }}
      >
        <Ionicons name="mail-outline" size={48} color={colors.textTertiary} />
        <Text style={[typography.h4, { color: colors.text, marginTop: spacing.md }]}>No Invitations</Text>
        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }]}>
          You haven't sent any tenant invitations yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginTop: spacing.md }}>
      {invitations.map((inv) => (
        <View
          key={inv.id}
          style={{
            backgroundColor: colors.surface,
            padding: spacing.base,
            borderRadius: 12,
            marginBottom: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.h4, { color: colors.text }]}>
                {inv.tenantName || inv.tenantId}
              </Text>
              {inv.tenantEmail && (
                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                  {inv.tenantEmail}
                </Text>
              )}
              <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: 4 }]}>
                ID: {inv.tenantId}
              </Text>
            </View>
            <StatusBadge status={inv.status} colors={colors} />
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: colors.divider,
              marginVertical: spacing.md,
            }}
          />

          <View style={{ gap: spacing.sm }}>
            <InfoRow label="Property" value={inv.propertyName} colors={colors} typography={typography} />
            <InfoRow label="Unit" value={inv.unitNumber} colors={colors} typography={typography} />
            <InfoRow
              label="Rent"
              value={`UGX ${inv.rentAmount.toLocaleString()}`}
              colors={colors}
              typography={typography}
            />
            <InfoRow
              label="Sent"
              value={new Date(inv.createdAt).toLocaleDateString()}
              colors={colors}
              typography={typography}
            />
          </View>

          {inv.status === 'PENDING' && onCancel && (
            <TouchableOpacity
              onPress={() => onCancel(inv.id)}
              disabled={cancellingId === inv.id}
              style={{
                marginTop: spacing.md,
                paddingVertical: spacing.sm,
                alignItems: 'center',
                opacity: cancellingId === inv.id ? 0.5 : 1,
              }}
            >
              {cancellingId === inv.id ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Text style={{ color: colors.error, fontSize: 14, fontWeight: '500' }}>Cancel Invitation</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
};

const InfoRow: React.FC<{ label: string; value: string; colors: any; typography: any }> = ({
  label,
  value,
  colors,
  typography,
}) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[typography.bodySmall, { color: colors.text, fontWeight: '500' }]}>{value}</Text>
  </View>
);
