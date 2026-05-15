import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, Dimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// Flexible property type that works with both full Property and hook Property types
interface PropertyForGallery {
    imageUrl?: string;
    units: Array<{
        id: string;
        unitNumber: string;
        imageUrl?: string;
    }>;
}

interface PropertyImageGalleryProps {
    property: PropertyForGallery;
    onUploadPropertyImage?: (imageBase64: string) => Promise<void>;
    onUploadUnitImage?: (unitId: string, imageBase64: string) => Promise<void>;
    editable?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = (SCREEN_WIDTH - 48) / 3; // 3 images per row with spacing

export const PropertyImageGallery: React.FC<PropertyImageGalleryProps> = ({
    property,
    onUploadPropertyImage,
    onUploadUnitImage,
    editable = false
}) => {
    const { colors, spacing, typography, borderRadius } = useTheme();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [uploadingUnitId, setUploadingUnitId] = useState<string | null>(null);
    const [uploadingProperty, setUploadingProperty] = useState(false);

    const pickImageForProperty = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                alert('Permission to access media library is required!');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64 && onUploadPropertyImage) {
                setUploadingProperty(true);
                const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
                await onUploadPropertyImage(base64Image);
                setUploadingProperty(false);
            }
        } catch (error) {
            console.error('Error picking property image:', error);
            setUploadingProperty(false);
        }
    };

    const pickImageForUnit = async (unitId: string) => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                alert('Permission to access media library is required!');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64 && onUploadUnitImage) {
                setUploadingUnitId(unitId);
                const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
                await onUploadUnitImage(unitId, base64Image);
                setUploadingUnitId(null);
            }
        } catch (error) {
            console.error('Error picking unit image:', error);
            setUploadingUnitId(null);
        }
    };

    const renderImageTile = (imageUrl: string | undefined, label: string, unitId?: string, isPropertyImage?: boolean) => {
        const hasImage = !!imageUrl;
        const isUploading = isPropertyImage ? uploadingProperty : (unitId && uploadingUnitId === unitId);

        return (
            <TouchableOpacity
                key={label}
                onPress={() => {
                    if (hasImage) {
                        setSelectedImage(imageUrl);
                    } else if (editable && isPropertyImage && onUploadPropertyImage) {
                        pickImageForProperty();
                    } else if (editable && unitId && onUploadUnitImage) {
                        pickImageForUnit(unitId);
                    }
                }}
                style={{
                    width: IMAGE_SIZE,
                    height: IMAGE_SIZE,
                    marginRight: spacing.sm,
                    marginBottom: spacing.sm,
                    borderRadius: borderRadius.md,
                    overflow: 'hidden',
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                }}
            >
                {hasImage ? (
                    <>
                        <Image
                            source={{ uri: imageUrl }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                        <View
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                padding: spacing.xs,
                            }}
                        >
                            <Text style={[typography.bodySmall, { color: '#FFF', fontSize: 10 }]} numberOfLines={1}>
                                {label}
                            </Text>
                        </View>
                    </>
                ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        {isUploading ? (
                            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                                Uploading...
                            </Text>
                        ) : editable && (isPropertyImage || unitId) ? (
                            <>
                                <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
                                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center', paddingHorizontal: spacing.xs }]} numberOfLines={2}>
                                    {label}
                                </Text>
                            </>
                        ) : (
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xs }]} numberOfLines={2}>
                                {label}
                            </Text>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const allImages = [
        { url: property.imageUrl, label: 'Property', unitId: undefined, isPropertyImage: true },
        ...property.units.map(unit => ({
            url: unit.imageUrl,
            label: unit.unitNumber,
            unitId: unit.id,
            isPropertyImage: false
        }))
    ];

    const hasAnyImages = allImages.some(img => img.url);

    if (!hasAnyImages && !editable) {
        return null;
    }

    return (
        <View style={{ marginTop: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text style={[typography.h4, { color: colors.text }]}>
                    {editable ? 'Property & Unit Images' : 'Images'}
                </Text>
                {editable && (
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                        Tap to upload
                    </Text>
                )}
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: spacing.md }}
            >
                {allImages.map((img, index) => renderImageTile(img.url, img.label, img.unitId, img.isPropertyImage))}
            </ScrollView>

            {/* Full Screen Image Modal */}
            <Modal
                visible={!!selectedImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setSelectedImage(null)}
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={{ width: '90%', height: '70%' }}
                    >
                        {selectedImage && (
                            <Image
                                source={{ uri: selectedImage }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="contain"
                            />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setSelectedImage(null)}
                        style={{
                            position: 'absolute',
                            top: 50,
                            right: 20,
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: 20,
                            padding: spacing.sm,
                        }}
                    >
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};
