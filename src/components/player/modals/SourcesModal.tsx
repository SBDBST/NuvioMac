import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Stream } from '../../../types/streams';
import { parseStreamTitle, resolutionColor } from '../../../utils/streamTitleParser';
import { isMacCatalyst } from '../../../utils/platform';

interface SourcesModalProps {
  showSourcesModal: boolean;
  setShowSourcesModal: (show: boolean) => void;
  availableStreams: { [providerId: string]: { streams: Stream[]; addonName: string } };
  currentStreamUrl: string;
  onSelectStream: (stream: Stream) => void;
  isChangingSource?: boolean;
}

const MENU_WIDTH_CATALYST = 440;
const MENU_WIDTH_DEFAULT = 400;

export const SourcesModal: React.FC<SourcesModalProps> = ({
  showSourcesModal,
  setShowSourcesModal,
  availableStreams,
  currentStreamUrl,
  onSelectStream,
  isChangingSource = false,
}) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const MENU_WIDTH = Math.min(width * 0.85, isMacCatalyst ? MENU_WIDTH_CATALYST : MENU_WIDTH_DEFAULT);

  const handleClose = () => {
    setShowSourcesModal(false);
  };

  if (!showSourcesModal) return null;

  const sortedProviders = Object.entries(availableStreams);

  const handleStreamSelect = (stream: Stream) => {
    if (stream.url !== currentStreamUrl && !isChangingSource) {
      onSelectStream(stream);
    }
  };

  const isStreamSelected = (stream: Stream): boolean => {
    return stream.url === currentStreamUrl;
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 10000 }]}>
      {/* Backdrop */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleClose}
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        />
      </TouchableOpacity>

      <Animated.View
        entering={SlideInRight.duration(300)}
        exiting={SlideOutRight.duration(250)}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: MENU_WIDTH,
          backgroundColor: '#0f0f0f',
          borderLeftWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <View style={{
          paddingTop: Platform.OS === 'ios' ? 60 : 20,
          paddingHorizontal: 20,
          paddingBottom: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>
            {t('player_ui.change_source')}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 40 }}
        >
          {isChangingSource && (
            <View style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderRadius: 12,
              padding: 10,
              marginBottom: 15,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <ActivityIndicator size="small" color="#22C55E" />
              <Text style={{ color: '#22C55E', fontSize: 14, fontWeight: '600', marginLeft: 10 }}>
                {t('player_ui.switching_source')}
              </Text>
            </View>
          )}

          {sortedProviders.length > 0 ? (
            sortedProviders.map(([providerId, providerData]) => (
              <View key={providerId} style={{ marginBottom: 20 }}>
                <Text style={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: 12,
                  fontWeight: '700',
                  marginBottom: 10,
                  marginLeft: 5,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}>
                  {providerData.addonName} ({providerData.streams.length})
                </Text>

                <View style={{ gap: 8 }}>
                  {providerData.streams.map((stream, index) => {
                    const isSelected = isStreamSelected(stream);
                    const parsed = parseStreamTitle(
                      stream.name,
                      stream.title,
                      typeof stream.size === 'number' ? stream.size : undefined,
                      stream.behaviorHints?.cached,
                    );

                    // Build pills
                    const pills: { label: string; color?: string }[] = [];
                    if (parsed.resolution) pills.push({ label: parsed.resolution, color: resolutionColor(parsed.resolution) });
                    if (parsed.source) pills.push({ label: parsed.source });
                    if (parsed.codec) pills.push({ label: parsed.codec });
                    if (parsed.hdr) pills.push({ label: parsed.hdr, color: '#D946EF' });
                    if (parsed.audio) pills.push({ label: parsed.audio });
                    if (parsed.size) pills.push({ label: parsed.size });
                    if (parsed.isCached) pills.push({ label: 'CACHED', color: '#22C55E' });

                    return (
                      <TouchableOpacity
                        key={`${providerId}-${index}`}
                        style={{
                          padding: isMacCatalyst ? 12 : 10,
                          borderRadius: 12,
                          backgroundColor: isSelected ? 'white' : 'rgba(255,255,255,0.05)',
                          borderWidth: 1,
                          borderColor: isSelected ? 'white' : 'rgba(255,255,255,0.06)',
                          opacity: (isChangingSource && !isSelected) ? 0.5 : 1,
                        }}
                        onPress={() => handleStreamSelect(stream)}
                        activeOpacity={0.7}
                        disabled={isChangingSource === true}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ flex: 1, gap: 6 }}>
                            {/* Line 1: name */}
                            <Text style={{
                              color: isSelected ? '#000' : '#fff',
                              fontWeight: '600',
                              fontSize: 13,
                            }} numberOfLines={1}>
                              {parsed.displayName}
                            </Text>

                            {/* Line 2: pills */}
                            {pills.length > 0 && (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                                {pills.map((pill, i) => (
                                  <View
                                    key={`${pill.label}-${i}`}
                                    style={{
                                      paddingHorizontal: 7,
                                      paddingVertical: 2,
                                      borderRadius: 5,
                                      backgroundColor: isSelected
                                        ? (pill.color ? pill.color + '25' : 'rgba(0,0,0,0.08)')
                                        : (pill.color ? pill.color + '20' : 'rgba(255,255,255,0.08)'),
                                      borderWidth: 1,
                                      borderColor: isSelected
                                        ? (pill.color ? pill.color + '50' : 'rgba(0,0,0,0.12)')
                                        : (pill.color ? pill.color + '35' : 'transparent'),
                                    }}
                                  >
                                    <Text style={{
                                      fontSize: 9,
                                      fontWeight: '700',
                                      letterSpacing: 0.3,
                                      textTransform: 'uppercase',
                                      color: isSelected
                                        ? (pill.color || 'rgba(0,0,0,0.6)')
                                        : (pill.color || 'rgba(255,255,255,0.5)'),
                                    }}>
                                      {pill.label}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>

                          <View style={{ marginLeft: 12 }}>
                            {isSelected ? (
                              <MaterialIcons name="check" size={18} color="black" />
                            ) : (
                              <MaterialIcons name="play-arrow" size={18} color="rgba(255,255,255,0.25)" />
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          ) : (
            <View style={{ padding: 40, alignItems: 'center', opacity: 0.5 }}>
              <MaterialIcons name="cloud-off" size={48} color="white" />
              <Text style={{ color: 'white', marginTop: 16, textAlign: 'center', fontWeight: '600' }}>
                {t('player_ui.no_sources_found')}
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

export default SourcesModal;
