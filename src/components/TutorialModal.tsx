import React, { useState } from 'react';
import { View, Text, Modal as RNModal, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { LinearGradient } from 'expo-linear-gradient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
          <LinearGradient
            colors={[colors.surface, colors.background]}
            style={styles.gradientContainer}
          >
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={28} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Content */}
            <View style={styles.content}>
              {/* Icon */}
              {currentStep?.icon && (
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: colors.primary + '15',
                      borderRadius: borderRadius.full,
                    },
                  ]}
                >
                  <Ionicons name={currentStep.icon} size={48} color={colors.primary} />
                </View>
              )}

              {/* Title */}
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.text,
                  },
                ]}
              >
                {hasSteps && currentStep ? currentStep.title : title}
              </Text>

              {/* Description */}
              <Text
                style={[
                  styles.description,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                {hasSteps && currentStep ? currentStep.description : description}
              </Text>

              {/* Step Indicators */}
              {hasSteps && (
                <View style={styles.stepIndicators}>
                  {steps.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.stepDot,
                        {
                          backgroundColor:
                            index === currentStepIndex
                              ? colors.primary
                              : colors.border,
                          width: index === currentStepIndex ? 24 : 8,
                        },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {hasSteps ? (
                <>
                  <View style={styles.navigationButtons}>
                    {!isFirstStep && (
                      <TouchableOpacity
                        onPress={handlePrevious}
                        style={[
                          styles.navButton,
                          styles.outlineButton,
                          { borderColor: colors.border }
                        ]}
                      >
                        <Text style={[styles.buttonText, { color: colors.text }]}>Previous</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={handleNext}
                      style={[
                        styles.navButton,
                        styles.primaryButton,
                        { backgroundColor: colors.primary },
                        !isFirstStep && { flex: 1 }
                      ]}
                    >
                      <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                        {isLastStep ? 'Get Started' : 'Next'}
                      </Text>
                      {!isLastStep && (
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                      )}
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={handleSkip}
                    style={styles.skipButton}
                  >
                    <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip Tutorial</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.navButton,
                    styles.primaryButton,
                    { backgroundColor: colors.primary }
                  ]}
                >
                  <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Got It!</Text>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    maxWidth: 400,
    maxHeight: SCREEN_HEIGHT * 0.75,
    position: 'relative',
    zIndex: 2,
  },
  gradientContainer: {
    borderRadius: 24,
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 4,
  },
  content: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    minHeight: 52,
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  outlineButton: {
    borderWidth: 1.5,
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
