/**
 * DesktopPlayerControls - Stremio/VLC-style bottom bar for Mac Catalyst.
 *
 * Layout (bottom to top):
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │  [Play] [Vol] 12:34 / 58:06  ···  [Subs] [Eps] [Fullscreen]│
 *  │  ════════════════ timeline scrubber ═════════════════════════│
 *  └──────────────────────────────────────────────────────────────┘
 *
 * Top left (with traffic light safe area):
 *  ┌────────────────────────
 *  │ (traffic lights)  Title - S1E1 · Pilot
 *  │
 *
 * No big center play/pause/skip buttons (those are touch-only).
 * Mouse movement + keyboard handled by DesktopPlayerOverlay native view.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../../contexts/ThemeContext';

import PlayerPauseIcon from '../../../../assets/player-icons/ic_player_pause.svg';
import PlayerPlayIcon from '../../../../assets/player-icons/ic_player_play.svg';
import PlayerSubtitlesIcon from '../../../../assets/player-icons/ic_player_subtitles.svg';
import PlayerEpisodesIcon from '../../../../assets/player-icons/ic_player_episodes.svg';

interface DesktopPlayerControlsProps {
  showControls: boolean;
  fadeAnim: Animated.Value;
  paused: boolean;
  title: string;
  episodeTitle?: string;
  season?: number;
  episode?: number;
  year?: number;
  streamName?: string;
  currentTime: number;
  duration: number;
  volume: number;
  isBuffering?: boolean;
  togglePlayback: () => void;
  skip: (seconds: number) => void;
  handleClose: () => void;
  setShowSubtitleModal: (show: boolean) => void;
  setShowEpisodesModal?: (show: boolean) => void;
  setShowAudioModal: (show: boolean) => void;
  setShowSourcesModal?: (show: boolean) => void;
  onSliderValueChange: (value: number) => void;
  onSlidingStart: () => void;
  onSlidingComplete: (value: number) => void;
  setVolume: (v: number) => void;
  formatTime: (seconds: number) => string;
  buffered: number;
}

const TRAFFIC_LIGHT_WIDTH = 90; // macOS traffic light buttons width + generous padding

const DesktopPlayerControls: React.FC<DesktopPlayerControlsProps> = ({
  showControls,
  fadeAnim,
  paused,
  title,
  episodeTitle,
  season,
  episode,
  year,
  streamName,
  currentTime,
  duration,
  volume,
  isBuffering,
  togglePlayback,
  skip,
  handleClose,
  setShowSubtitleModal,
  setShowEpisodesModal,
  setShowAudioModal,
  setShowSourcesModal,
  onSliderValueChange,
  onSlidingStart,
  onSlidingComplete,
  setVolume,
  formatTime,
  buffered,
}) => {
  const { currentTheme } = useTheme();
  const [previewTime, setPreviewTime] = useState(currentTime);
  const isSlidingRef = useRef(false);

  useEffect(() => {
    if (!isSlidingRef.current) setPreviewTime(currentTime);
  }, [currentTime]);

  const handleVolumeToggle = useCallback(() => {
    // Cycle: current -> mute -> restore
    setVolume(volume > 0 ? 0 : 1);
  }, [volume, setVolume]);

  const volumeIcon = volume === 0 ? 'volume-mute' : volume < 0.5 ? 'volume-low' : 'volume-high';

  const subtitleLine = [
    season && episode ? `S${season}E${episode}` : null,
    episodeTitle,
  ].filter(Boolean).join(' · ');

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: fadeAnim, zIndex: 20 }]}
      pointerEvents={showControls ? 'box-none' : 'none'}
    >
      {/* Top bar: title + close (with traffic light safe area) */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)', 'transparent']}
        style={s.topBar}
      >
        <View style={s.topContent}>
          {/* Spacer for traffic light buttons */}
          <View style={{ width: TRAFFIC_LIGHT_WIDTH }} />

          {/* Back / Close button */}
          <TouchableOpacity
            style={s.backBtn}
            onPress={handleClose}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          <View style={s.titleArea}>
            <Text style={s.titleText} numberOfLines={1}>{title}</Text>
            {subtitleLine ? (
              <Text style={s.subtitleText} numberOfLines={1}>{subtitleLine}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={s.closeBtn}
            onPress={handleClose}
            accessibilityLabel="Close player"
          >
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Bottom bar: timeline + controls */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.75)']}
        style={s.bottomBar}
      >
        {/* Timeline slider - full width */}
        <View style={s.timelineContainer}>
          <Slider
            style={s.slider}
            minimumValue={0}
            maximumValue={duration || 1}
            value={previewTime}
            onValueChange={(v) => setPreviewTime(v)}
            onSlidingStart={() => {
              isSlidingRef.current = true;
              onSlidingStart();
            }}
            onSlidingComplete={(v) => {
              isSlidingRef.current = false;
              setPreviewTime(v);
              onSlidingComplete(v);
            }}
            minimumTrackTintColor={currentTheme.colors.primary}
            maximumTrackTintColor="rgba(255,255,255,0.25)"
            thumbTintColor="transparent"
            tapToSeek
          />
          {/* Thin progress line visible when slider thumb is hidden */}
        </View>

        {/* Controls row */}
        <View style={s.controlsRow}>
          {/* Left cluster: play, volume, time */}
          <View style={s.leftCluster}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={togglePlayback}
              accessibilityLabel={paused ? 'Play' : 'Pause'}
            >
              {isBuffering ? (
                <Ionicons name="hourglass-outline" size={20} color="white" />
              ) : paused ? (
                <PlayerPlayIcon width={20} height={20} fill="white" />
              ) : (
                <PlayerPauseIcon width={20} height={20} fill="white" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.iconBtn}
              onPress={handleVolumeToggle}
              accessibilityLabel={volume > 0 ? 'Mute' : 'Unmute'}
            >
              <Ionicons name={volumeIcon} size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>

            <Text style={s.timeText}>
              {formatTime(previewTime)}
              <Text style={s.timeSeparator}> / </Text>
              {formatTime(duration)}
            </Text>
          </View>

          {/* Right cluster: subs, audio, episodes, sources, fullscreen */}
          <View style={s.rightCluster}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => setShowSubtitleModal(true)}
              accessibilityLabel="Subtitles"
            >
              <PlayerSubtitlesIcon width={18} height={18} fill="rgba(255,255,255,0.85)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => setShowAudioModal(true)}
              accessibilityLabel="Audio tracks"
            >
              <Ionicons name="musical-notes-outline" size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>

            {setShowSourcesModal && (
              <TouchableOpacity
                style={s.iconBtn}
                onPress={() => setShowSourcesModal(true)}
                accessibilityLabel="Sources"
              >
                <Ionicons name="layers-outline" size={18} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            )}

            {setShowEpisodesModal && (
              <TouchableOpacity
                style={s.iconBtn}
                onPress={() => setShowEpisodesModal(true)}
                accessibilityLabel="Episodes"
              >
                <PlayerEpisodesIcon width={18} height={18} fill="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            )}

            {/* Fullscreen button */}
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => {
                const { NativeModules } = require('react-native');
                NativeModules.PlatformInfo?.toggleFullscreen();
              }}
              accessibilityLabel="Toggle fullscreen"
            >
              <Ionicons name="expand-outline" size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingBottom: 40,
    zIndex: 21,
  },
  topContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  titleArea: {
    flex: 1,
    marginLeft: 8,
  },
  titleText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  subtitleText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 8,
    paddingTop: 60,
    zIndex: 21,
  },
  timelineContainer: {
    paddingHorizontal: 8,
    height: 28,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 28,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 36,
  },
  leftCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  timeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    marginLeft: 4,
  },
  timeSeparator: {
    color: 'rgba(255,255,255,0.4)',
  },
});

export default DesktopPlayerControls;
