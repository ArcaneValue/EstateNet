import React, { useState } from 'react';
import { View, Text, Modal as RNModal, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';

interface TutorialStep {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface TutorialModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  steps?: TutorialStep[];
  highlightArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  visible,
  onClose,
  title,
  description,
  steps = [],
  highlightArea
}) => {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
      setCurrentStepIndex(0);
    }
  }, [visible]);

  const hasSteps = steps.length > 0;
  const currentStep = hasSteps ? steps[currentStepIndex] : null;
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Highlight area (spotlight effect) */}
        {highlightArea && (
          <View
            style={[
              styles.highlightArea,
              {
                left: highlightArea.x,
                top: highlightArea.y,
                width: highlightArea.width,
                height: highlightArea.height,
                borderRadius: borderRadius.md,
                borderColor: colors.primary,
                borderWidth: 2,
                backgroundColor: 'transparent',
              },
            ]}
          />
        )}

        {/* Content Card */}
        <Animated.View
          style={[
            styles.contentContainer,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              padding: spacing.lg,
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeButton, { top: spacing.md, right: spacing.md }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Icon */}
          {currentStep?.icon && (
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: colors.primary + '20',
                  borderRadius: borderRadius.full,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <Ionicons name={currentStep.icon} size={40} color={colors.primary} />
            </View>
          )}

          {/* Title */}
          <Text
            style={[
              {
                fontSize: 20,
                fontWeight: 'bold',
                color: colors.text,
                marginBottom: spacing.sm,
                textAlign: 'center',
              },
            ]}
          >
            {hasSteps && currentStep ? currentStep.title : title}
          </Text>

          {/* Description */}
          <Text
            style={[
              {
                fontSize: 14,
                color: colors.textSecondary,
                marginBottom: spacing.md,
                textAlign: 'center',
                lineHeight: 20,
              },
            ]}
          >
            {hasSteps && currentStep ? currentStep.description : description}
          </Text>

          {/* Step Indicators */}
          {hasSteps && (
            <View style={[styles.stepIndicators, { marginBottom: spacing.md }]}>
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor:
                        index === currentStepIndex
                          ? colors.primary
                          : colors.textSecondary + '40',
                      width: index === currentStepIndex ? 20 : 8,
                      height: 6,
                      borderRadius: 3,
                      marginHorizontal: 3,
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {hasSteps ? (
              <>
                {/* Multi-step navigation */}
                <View style={{ flexDirection: 'row', gap: spacing.sm, flex: 1 }}>
                  {!isFirstStep && (
                    <Button
                      title="Previous"
                      onPress={handlePrevious}
                      variant="outline"
                      style={{ flex: 1 }}
                    />
                  )}
                  <Button
                    title={isLastStep ? 'Got It!' : 'Next'}
                    onPress={handleNext}
                    variant="primary"
                    style={{ flex: 1 }}
                    icon={
                      !isLastStep ? (
                        <Ionicons name="arrow-forward" size={20} color="white" />
                      ) : undefined
                    }
                    iconPosition="right"
                  />
                </View>
                <Button
                  title="Skip Tutorial"
                  onPress={handleSkip}
                  variant="ghost"
                  textStyle={{ color: colors.textSecondary }}
                  style={{ marginTop: spacing.sm }}
                />
              </>
            ) : (
              // Single-step tutorial
              <Button
                title="Got It!"
                onPress={onClose}
                variant="primary"
                style={{ width: '100%' }}
              />
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: 60,
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  highlightArea: {
    position: 'absolute',
    zIndex: 1,
  },
  contentContainer: {
    width: '100%',
    maxWidth: '100%',
    maxHeight: '75%',
    position: 'relative',
    zIndex: 2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  closeButton: {
    position: 'absolute',
    zIndex: 3,
    padding: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDot: {},
  buttonContainer: {
    width: '100%',
  },
});
