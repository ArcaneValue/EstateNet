import React from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface TutorialStep {
    title: string;
    description: string;
    icon: string;
    action?: string;
}

interface FeedbackTutorialModalProps {
    visible: boolean;
    onClose: () => void;
    onComplete: () => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
    {
        title: 'Welcome to Feedback Hub',
        description: 'This is your community space to share ideas, report issues, and help improve EstateNet. Your feedback helps us build a better product!',
        icon: 'chatbubble-ellipses-outline',
        action: 'Let\'s get started'
    },
    {
        title: 'Create a Feedback Post',
        description: 'Tap the "+" button to share your thoughts. You can categorize your post as a Bug Report, Feature Request, or General Feedback.',
        icon: 'add-circle-outline',
        action: 'Try creating a post'
    },
    {
        title: 'Vote on Important Issues',
        description: 'Upvote posts that matter to you. This helps us prioritize what to work on next. Your votes make a real difference!',
        icon: 'arrow-up-outline',
        action: 'Upvote posts you care about'
    },
    {
        title: 'Join the Conversation',
        description: 'Comment on posts to share your experience or ask questions. Detailed feedback helps us understand your needs better.',
        icon: 'chatbubble-outline',
        action: 'Engage with the community'
    },
    {
        title: 'Track Your Feedback',
        description: 'See your posts in "My Feedback" tab. We\'ll update post statuses as we work on your suggestions.',
        icon: 'list-outline',
        action: 'Check your post status'
    },
    {
        title: 'Admin Support',
        description: 'Our admin team reviews all feedback and responds to important issues. Look for admin badges and official responses.',
        icon: 'shield-checkmark-outline',
        action: 'Connect with admins'
    }
];

export const FeedbackTutorialModal: React.FC<FeedbackTutorialModalProps> = ({
    visible,
    onClose,
    onComplete
}) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const [currentStep, setCurrentStep] = React.useState(0);
    const [loading, setLoading] = React.useState(false);

    const currentStepData = TUTORIAL_STEPS[currentStep];
    const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

    const handleNext = async () => {
        if (isLastStep) {
            setLoading(true);
            await onComplete();
            setLoading(false);
            onClose();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSkip = async () => {
        await onComplete();
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20
            }}>
                <View style={{
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    padding: spacing.lg,
                    width: '100%',
                    maxWidth: 400,
                    maxHeight: '80%',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.25,
                    shadowRadius: 20,
                    elevation: 10
                }}>
                    {/* Header */}
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: spacing.lg
                    }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                fontSize: 20,
                                fontWeight: 'bold',
                                color: colors.text,
                                marginBottom: 4
                            }}>
                                {currentStepData.title}
                            </Text>
                            <Text style={{
                                fontSize: 14,
                                color: colors.textSecondary
                            }}>
                                Step {currentStep + 1} of {TUTORIAL_STEPS.length}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleSkip}
                            style={{ padding: 4 }}
                        >
                            <Text style={{
                                fontSize: 14,
                                color: colors.textSecondary,
                                fontWeight: '500'
                            }}>
                                Skip
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Progress Bar */}
                    <View style={{
                        height: 4,
                        backgroundColor: colors.border,
                        borderRadius: 2,
                        marginBottom: spacing.lg
                    }}>
                        <View style={{
                            height: '100%',
                            backgroundColor: colors.primary,
                            borderRadius: 2,
                            width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%`
                        }} />
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={{ flex: 1 }}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: spacing.lg }}
                    >
                        <View style={{
                            alignItems: 'center',
                            marginBottom: spacing.lg
                        }}>
                            <View style={{
                                width: 80,
                                height: 80,
                                borderRadius: 40,
                                backgroundColor: colors.primary + '15',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: spacing.md
                            }}>
                                <Ionicons
                                    name={currentStepData.icon as any}
                                    size={40}
                                    color={colors.primary}
                                />
                            </View>
                        </View>

                        <Text style={{
                            fontSize: 16,
                            lineHeight: 24,
                            color: colors.text,
                            textAlign: 'center',
                            marginBottom: spacing.lg
                        }}>
                            {currentStepData.description}
                        </Text>

                        {currentStepData.action && (
                            <View style={{
                                backgroundColor: colors.info + '15',
                                padding: spacing.md,
                                borderRadius: borderRadius.md,
                                borderLeftWidth: 4,
                                borderLeftColor: colors.info
                            }}>
                                <Text style={{
                                    fontSize: 14,
                                    color: colors.info,
                                    fontWeight: '500',
                                    marginBottom: 4
                                }}>
                                    Try this:
                                </Text>
                                <Text style={{
                                    fontSize: 14,
                                    color: colors.textSecondary,
                                    lineHeight: 20
                                }}>
                                    {currentStepData.action}
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Navigation */}
                    <View style={{
                        flexDirection: 'row',
                        gap: spacing.md,
                        paddingTop: spacing.md,
                        borderTopWidth: 1,
                        borderTopColor: colors.border
                    }}>
                        {currentStep > 0 && (
                            <TouchableOpacity
                                onPress={handlePrevious}
                                style={{
                                    flex: 1,
                                    paddingVertical: spacing.md,
                                    paddingHorizontal: spacing.lg,
                                    borderRadius: borderRadius.md,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    alignItems: 'center'
                                }}
                            >
                                <Text style={{
                                    fontSize: 16,
                                    fontWeight: '600',
                                    color: colors.textSecondary
                                }}>
                                    Previous
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={handleNext}
                            disabled={loading}
                            style={{
                                flex: currentStep > 0 ? 1 : 2,
                                paddingVertical: spacing.md,
                                paddingHorizontal: spacing.lg,
                                borderRadius: borderRadius.md,
                                backgroundColor: colors.primary,
                                alignItems: 'center',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={{
                                    fontSize: 16,
                                    fontWeight: '600',
                                    color: '#fff'
                                }}>
                                    {isLastStep ? 'Get Started' : 'Next'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
