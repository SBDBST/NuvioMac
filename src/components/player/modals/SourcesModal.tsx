import React, { useState } from 'react';
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
import { parseStreamTitle, Pill } from '../../../utils/streamTitleParser';
import { isMacCatalyst } from '../../../utils/platform';

interface SourcesModalProps {
  showSourcesModal: boolean;
  setShowSourcesModal: (show: boolean) => void;
  availableStreams: { [providerId: string]: { streams: Stream[]; addonName: string } };
  currentStreamUrl: string;
  onSelectStream: (stream: Stream) => void;
  isChangingSource?: boolean;
}

// Individual stream item with expandable secondary pills
const SourceStreamItem: React.FC<{
  stream: Stream; isSelected: boolean; isChangingSource: boolean;
  onPress: () => void; t: any;
}> = ({ stream, isSelected, isChangingSource, onPress }) => {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseStreamTitle(
    stream.name, stream.title,
    typeof stream.size === 'number' ? stream.size : undefined,
    stream.behaviorHints?.cached, stream.lang,
  );
  const hasSec = parsed.secondaryPills.length > 0;

  const pillStyle = (pill: Pill, tier: 'primary' | 'secondary') => ({
    paddingHorizontal: isMacCatalyst ? 11 : 7,
    paddingVertical: isMacCatalyst ? 4.5 : 2.5,
    borderRadius: 7,
    borderWidth: 1,
    backgroundColor: isSelected
      ? (pill.color ? pill.color + (tier === 'primary' ? '30' : '25') : 'rgba(0,0,0,0.10)')
      : (pill.color ? pill.color + (tier === 'primary' ? '30' : '22') : 'rgba(255,255,255,0.08)'),
    borderColor: isSelected
      ? (pill.color ? pill.color + '55' : 'rgba(0,0,0,0.15)')
      : (pill.color ? pill.color + (tier === 'primary' ? '55' : '45') : 'rgba(255,255,255,0.12)'),
  });

  const pillTextStyle = (pill: Pill) => ({
    fontSize: isMacCatalyst ? 12 : 9.5,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
    color: isSelected ? (pill.color || 'rgba(0,0,0,0.65)') : (pill.color || 'rgba(255,255,255,0.55)'),
  });

  return (
    <TouchableOpacity
      style={{
        padding: isMacCatalyst ? 18 : 10,
        borderRadius: 12,
        backgroundColor: isSelected ? 'white' : 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: isSelected ? 'white' : 'rgba(255,255,255,0.07)',
        opacity: (isChangingSource && !isSelected) ? 0.5 : 1,
      }}
      onPress={onPress} activeOpacity={0.7} disabled={isChangingSource}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, gap: isMacCatalyst ? 8 : 6 }}>
          <Text style={{ color: isSelected ? '#000' : '#fff', fontWeight: '600', fontSize: isMacCatalyst ? 17 : 13 }} numberOfLines={1}>
            {parsed.displayName}
          </Text>
          {(parsed.primaryPills.length > 0 || hasSec) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isMacCatalyst ? 6 : 5, alignItems: 'center' }}>
              {parsed.primaryPills.map((pill, i) => (
                <View key={`p-${pill.label}-${i}`} style={pillStyle(pill, 'primary')}>
                  <Text style={pillTextStyle(pill)}>{pill.label}</Text>
                </View>
              ))}
              {hasSec && (
                <TouchableOpacity
                  onPress={() => setExpanded(prev => !prev)}
                  style={{
                    width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center',
                    backgroundColor: isSelected ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  activeOpacity={0.6}
                >
                  <MaterialIcons
                    name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={16} color={isSelected ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.45)'}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
          {expanded && hasSec && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isMacCatalyst ? 6 : 5 }}>
              {parsed.secondaryPills.map((pill, i) => (
                <View key={`s-${pill.label}-${i}`} style={pillStyle(pill, 'secondary')}>
                  <Text style={pillTextStyle(pill)}>{pill.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={{ marginLeft: 12 }}>
          {isSelected
            ? <MaterialIcons name="check" size={18} color="black" />
            : <MaterialIcons name="play-arrow" size={18} color="rgba(255,255,255,0.25)" />
          }
        </View>
      </View>
    </TouchableOpacity>
  );
};

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

                <View style={{ gap: isMacCatalyst ? 10 : 8 }}>
                  {providerData.streams.map((stream, index) => (
                    <SourceStreamItem
                      key={`${providerId}-${index}`}
                      stream={stream}
                      isSelected={isStreamSelected(stream)}
                      isChangingSource={isChangingSource}
                      onPress={() => handleStreamSelect(stream)}
                      t={t}
                    />
                  ))}
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
