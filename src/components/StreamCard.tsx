import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import FastImage from '@d11/react-native-fast-image';
import { Stream } from '../types/metadata';
import { useSettings } from '../hooks/useSettings';
import { useDownloads } from '../contexts/DownloadsContext';
import { useToast } from '../contexts/ToastContext';
import { parseStreamTitle } from '../utils/streamTitleParser';
import { isMacCatalyst } from '../utils/platform';

interface StreamCardProps {
  stream: Stream;
  onPress: () => void;
  index: number;
  isLoading?: boolean;
  statusMessage?: string;
  theme: any;
  showLogos?: boolean;
  scraperLogo?: string | null;
  showAlert: (title: string, message: string) => void;
  parentTitle?: string;
  parentType?: 'movie' | 'series';
  parentYear?: number;
  parentSeason?: number;
  parentEpisode?: number;
  parentEpisodeTitle?: string;
  parentPosterUrl?: string | null;
  providerName?: string;
  parentId?: string;
  parentImdbId?: string;
}

const StreamCard = memo(({
  stream,
  onPress,
  index,
  isLoading,
  statusMessage,
  theme,
  showLogos,
  scraperLogo,
  showAlert,
  parentTitle,
  parentType,
  parentYear,
  parentSeason,
  parentEpisode,
  parentEpisodeTitle,
  parentPosterUrl,
  providerName,
  parentId,
  parentImdbId
}: StreamCardProps) => {
  const { settings } = useSettings();
  const { startDownload } = useDownloads();
  const { showSuccess, showInfo } = useToast();

  // Handle long press to copy stream URL to clipboard
  const handleLongPress = useCallback(async () => {
    if (stream.url) {
      try {
        await ExpoClipboard.setStringAsync(stream.url);

        // Use toast for Android, custom alert for iOS
        if (Platform.OS === 'android') {
          showSuccess('URL Copied', 'Stream URL copied to clipboard!');
        } else {
          // iOS uses custom alert
          showAlert('Copied!', 'Stream URL has been copied to clipboard.');
        }
      } catch (error) {
        // Fallback: show URL in alert if clipboard fails
        if (Platform.OS === 'android') {
          showInfo('Stream URL', `Stream URL: ${stream.url}`);
        } else {
          showAlert('Stream URL', stream.url);
        }
      }
    }
  }, [stream.url, showAlert, showSuccess, showInfo]);

  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);

  const streamInfo = useMemo(() => {
    return parseStreamTitle(
      stream.name,
      stream.title,
      typeof stream.size === 'number' ? stream.size : undefined,
      stream.behaviorHints?.cached,
      stream.lang,
    );
  }, [stream.name, stream.title, stream.behaviorHints, stream.size, stream.lang]);

  const handleDownload = useCallback(async () => {
    try {
      const url = stream.url;
      if (!url) return;
      // Prevent duplicate downloads for the same exact URL
      try {
        const downloadsModule = require('../contexts/DownloadsContext');
        if (downloadsModule && downloadsModule.isDownloadingUrl && downloadsModule.isDownloadingUrl(url)) {
          showAlert('Already Downloading', 'This download has already started for this exact link.');
          return;
        }
      } catch { }
      // Show immediate feedback on both platforms
      // Show immediate feedback on both platforms
      // showAlert('Starting Download', 'Download will be started.');
      const parent: any = stream as any;
      const inferredTitle = parentTitle || stream.name || stream.title || parent.metaName || 'Content';
      const inferredType: 'movie' | 'series' = parentType || (parent.kind === 'series' || parent.type === 'series' ? 'series' : 'movie');
      const year = typeof parentYear === 'number'
        ? parentYear
        : (typeof parent.year === 'number' ? parent.year : undefined);
      const season = typeof parentSeason === 'number' ? parentSeason : (parent.season || parent.season_number);
      const episode = typeof parentEpisode === 'number' ? parentEpisode : (parent.episode || parent.episode_number);
      const episodeTitle = parentEpisodeTitle || parent.episodeTitle || parent.episode_name;
      // Prefer the stream's display name (often includes provider + resolution)
      const provider = (stream.name as any) || (stream.title as any) || providerName || parent.addonName || parent.addonId || (stream.addonName as any) || (stream.addonId as any) || 'Provider';

      // Use parentId first (from route params), fallback to stream metadata
      const idForContent = parentId || parent.imdbId || parent.tmdbId || parent.addonId || inferredTitle;

      // Extract tmdbId if available (from parentId or parent metadata)
      let tmdbId: number | undefined = undefined;
      if (parentId && parentId.startsWith('tmdb:')) {
        tmdbId = parseInt(parentId.split(':')[1], 10);
      } else if (typeof parent.tmdbId === 'number') {
        tmdbId = parent.tmdbId;
      }

      await startDownload({
        id: String(idForContent),
        type: inferredType,
        title: String(inferredTitle),
        year: inferredType === 'movie' ? year : undefined,
        providerName: String(provider),
        season: inferredType === 'series' ? (season ? Number(season) : undefined) : undefined,
        episode: inferredType === 'series' ? (episode ? Number(episode) : undefined) : undefined,
        episodeTitle: inferredType === 'series' ? (episodeTitle ? String(episodeTitle) : undefined) : undefined,
        quality: streamInfo.resolution || undefined,
        posterUrl: parentPosterUrl || parent.poster || parent.backdrop || null,
        url,
        headers: (stream.headers as any) || undefined,
        // Pass metadata for progress tracking
        imdbId: parentImdbId || parent.imdbId || undefined,
        tmdbId: tmdbId,
      });
      showAlert('Download Started', 'Your download has been added to the queue.');
    } catch (e: any) {
      showAlert('Download Failed', e.message || 'Could not start download.');
    }
  }, [startDownload, stream.url, stream.headers, streamInfo.resolution, showAlert, stream.name, stream.title, parentId, parentImdbId, parentTitle, parentType, parentSeason, parentEpisode, parentEpisodeTitle, parentPosterUrl, providerName]);

  const [expanded, setExpanded] = useState(false);
  const hasSecondary = streamInfo.secondaryPills.length > 0;

  const isDebrid = streamInfo.isCached;
  return (
    <TouchableOpacity
      style={[
        styles.streamCard,
        isLoading && styles.streamCardLoading,
        isDebrid && styles.streamCardHighlighted
      ]}
      onPress={onPress}
      onLongPress={handleLongPress}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      {/* Scraper Logo */}
      {showLogos && scraperLogo && (
        <View style={styles.scraperLogoContainer}>
          {scraperLogo.toLowerCase().endsWith('.svg') || scraperLogo.toLowerCase().includes('.svg?') ? (
            <Image
              source={{ uri: scraperLogo }}
              style={styles.scraperLogo}
              resizeMode="contain"
            />
          ) : (
            <FastImage
              source={{ uri: scraperLogo }}
              style={styles.scraperLogo}
              resizeMode={FastImage.resizeMode.contain}
            />
          )}
        </View>
      )}

      <View style={styles.streamDetails}>
        {/* Line 1: Display name + loading */}
        <View style={styles.nameRow}>
          <Text style={[styles.streamName, { color: theme.colors.highEmphasis }]} numberOfLines={1}>
            {streamInfo.displayName}
          </Text>
          {isLoading && (
            <View style={styles.loadingIndicator}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.primary }]}>
                {statusMessage || "Loading..."}
              </Text>
            </View>
          )}
        </View>

        {/* Line 2: Primary pills + expand chevron */}
        {(streamInfo.primaryPills.length > 0 || hasSecondary) && (
          <View style={styles.pillsRow}>
            {streamInfo.primaryPills.map((pill, i) => (
              <View
                key={`p-${pill.label}-${i}`}
                style={[
                  styles.pill,
                  pill.color
                    ? { backgroundColor: pill.color + '20', borderColor: pill.color + '40' }
                    : { backgroundColor: theme.colors.elevation2, borderColor: 'transparent' },
                ]}
              >
                <Text style={[styles.pillText, { color: pill.color || theme.colors.mediumEmphasis }]}>
                  {pill.label}
                </Text>
              </View>
            ))}
            {hasSecondary && (
              <TouchableOpacity
                style={[styles.expandBtn, { backgroundColor: theme.colors.elevation2 }]}
                onPress={() => setExpanded(prev => !prev)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.6}
              >
                <MaterialIcons
                  name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={14}
                  color={theme.colors.mediumEmphasis}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Expanded: Secondary pills */}
        {expanded && hasSecondary && (
          <View style={styles.pillsRow}>
            {streamInfo.secondaryPills.map((pill, i) => (
              <View
                key={`s-${pill.label}-${i}`}
                style={[
                  styles.pill,
                  pill.color
                    ? { backgroundColor: pill.color + '18', borderColor: pill.color + '35' }
                    : { backgroundColor: theme.colors.elevation2, borderColor: 'transparent' },
                ]}
              >
                <Text style={[styles.pillText, { color: pill.color || theme.colors.mediumEmphasis }]}>
                  {pill.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {settings?.enableDownloads !== false && (
        <TouchableOpacity
          style={[styles.streamAction, { backgroundColor: theme.colors.elevation2 }]}
          onPress={handleDownload}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="download"
            size={18}
            color={theme.colors.highEmphasis}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

const createStyles = (colors: any) => StyleSheet.create({
  streamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isMacCatalyst ? 16 : 14,
    borderRadius: 14,
    marginBottom: isMacCatalyst ? 12 : 10,
    minHeight: 60,
    backgroundColor: colors.card,
    width: '100%',
    zIndex: 1,
  },
  scraperLogoContainer: {
    width: 32,
    height: 32,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.elevation2,
    borderRadius: 8,
  },
  scraperLogo: {
    width: 22,
    height: 22,
  },
  streamCardLoading: {
    opacity: 0.6,
  },
  streamCardHighlighted: {
    backgroundColor: colors.elevation2,
  },
  streamDetails: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  streamName: {
    fontSize: isMacCatalyst ? 14 : 13,
    fontWeight: '600',
    lineHeight: 18,
    color: colors.highEmphasis,
    flex: 1,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isMacCatalyst ? 6 : 5,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  expandBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  streamAction: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});

export default StreamCard;
