/**
 * streamTitleParser.ts
 *
 * Parses raw Stremio stream titles (typically torrent filenames) into
 * structured metadata for clean UI display.
 *
 * Typical input:
 *   "Breaking.Bad.S01E01.720p.BluRay.x264-DEMAND\n💾 892.4 MB\n⚙️ Torrentio"
 *
 * Output: { resolution, codec, hdr, audio, source, size, releaseGroup, ... }
 */

export interface ParsedStreamInfo {
  /** e.g. "720p", "1080p", "4K" */
  resolution: string | null;
  /** e.g. "x264", "x265", "HEVC", "AV1" */
  codec: string | null;
  /** e.g. "HDR", "HDR10", "HDR10+", "DV" (Dolby Vision) */
  hdr: string | null;
  /** e.g. "5.1", "7.1", "Atmos", "DTS", "AAC", "DTS-HD" */
  audio: string | null;
  /** e.g. "BluRay", "WEB-DL", "WEBRip", "HDTV", "CAM", "REMUX" */
  source: string | null;
  /** Human-readable file size, e.g. "1.4 GB" */
  size: string | null;
  /** e.g. "DEMAND", "YTS", "RARBG", "NTb" */
  releaseGroup: string | null;
  /** Whether this stream is debrid-cached */
  isCached: boolean;
  /** Cleaned display name (first meaningful line, dots replaced) */
  displayName: string;
  /** The addon/provider name if extractable */
  provider: string | null;
}

// -- Resolution --
const RESOLUTION_MAP: [RegExp, string][] = [
  [/\b2160p\b/i, '4K'],
  [/\b4k\b/i, '4K'],
  [/\buhd\b/i, '4K'],
  [/\b1080p\b/i, '1080p'],
  [/\b720p\b/i, '720p'],
  [/\b480p\b/i, '480p'],
  [/\b360p\b/i, '360p'],
];

// -- Codec --
const CODEC_MAP: [RegExp, string][] = [
  [/\bav1\b/i, 'AV1'],
  [/\bhevc\b/i, 'HEVC'],
  [/\bx\.?265\b/i, 'x265'],
  [/\bh\.?265\b/i, 'H.265'],
  [/\bx\.?264\b/i, 'x264'],
  [/\bh\.?264\b/i, 'H.264'],
  [/\bxvid\b/i, 'XviD'],
  [/\bdivx\b/i, 'DivX'],
  [/\bvp9\b/i, 'VP9'],
];

// -- HDR --
const HDR_MAP: [RegExp, string][] = [
  [/\bhdr10\+/i, 'HDR10+'],
  [/\bhdr10\b/i, 'HDR10'],
  [/\bdolby[\s.]?vision\b/i, 'DV'],
  [/\bDV\b/, 'DV'],  // case-sensitive to avoid false matches
  [/\bhdr\b/i, 'HDR'],
  [/\bhlg\b/i, 'HLG'],
];

// -- Audio --
const AUDIO_MAP: [RegExp, string][] = [
  [/\batmos\b/i, 'Atmos'],
  [/\bdts[\s.-]?hd[\s.]?ma\b/i, 'DTS-HD MA'],
  [/\bdts[\s.-]?hd\b/i, 'DTS-HD'],
  [/\bdts[\s.-]?x\b/i, 'DTS:X'],
  [/\bdts\b/i, 'DTS'],
  [/\btruehd\b/i, 'TrueHD'],
  [/\bflac\b/i, 'FLAC'],
  [/\beac3\b/i, 'EAC3'],
  [/\bdd[\s.]?5[\s.]?1\b/i, 'DD 5.1'],
  [/\bddp?[\s.]?5[\s.]?1\b/i, 'DD+ 5.1'],
  [/\bac3\b/i, 'AC3'],
  [/\baac\b/i, 'AAC'],
  [/\b7[\s.]?1\b(?![\dp])/, '7.1'],  // avoid matching "7.1 GB"
  [/\b5[\s.]?1\b(?![\s.]?[GM]B)/, '5.1'],
];

// -- Source type --
const SOURCE_MAP: [RegExp, string][] = [
  [/\bremux\b/i, 'REMUX'],
  [/\bblu[\s.-]?ray\b/i, 'BluRay'],
  [/\bbdrip\b/i, 'BDRip'],
  [/\bbrrip\b/i, 'BRRip'],
  [/\bweb[\s.-]?dl\b/i, 'WEB-DL'],
  [/\bwebrip\b/i, 'WEBRip'],
  [/\bweb\b(?![\s.-]?dl)/i, 'WEB'],
  [/\bhdtv\b/i, 'HDTV'],
  [/\bpdtv\b/i, 'PDTV'],
  [/\bdvdrip\b/i, 'DVDRip'],
  [/\bcam(?:rip)?\b/i, 'CAM'],
  [/\bhdcam\b/i, 'HDCAM'],
  [/\bts(?:rip)?\b/i, 'TS'],
  [/\bscreener\b/i, 'SCR'],
  [/\bdvdscr\b/i, 'DVDSCR'],
];

// -- Size extraction --
const SIZE_REGEX = /💾\s*([\d.]+\s*[KMGT]?B)/i;
const SIZE_REGEX_PLAIN = /\b([\d.]+)\s*(GB|MB|TB|KB)\b/i;

// -- Release group (last hyphen-separated word) --
const GROUP_REGEX = /(?:^|[.\s-])([A-Za-z0-9]{2,12})$/;

function firstMatch(text: string, map: [RegExp, string][]): string | null {
  for (const [regex, label] of map) {
    if (regex.test(text)) return label;
  }
  return null;
}

function extractSize(title: string, streamSize?: number): string | null {
  // Check emoji format first
  const emojiMatch = title.match(SIZE_REGEX);
  if (emojiMatch) return emojiMatch[1].trim();

  // Check plain format
  const plainMatch = title.match(SIZE_REGEX_PLAIN);
  if (plainMatch) return `${plainMatch[1]} ${plainMatch[2].toUpperCase()}`;

  // Fall back to stream.size field (bytes)
  if (streamSize && streamSize > 0) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let val = streamSize;
    let idx = 0;
    while (val >= 1024 && idx < units.length - 1) {
      val /= 1024;
      idx++;
    }
    return `${val.toFixed(val >= 10 ? 1 : 2)} ${units[idx]}`;
  }

  return null;
}

function extractReleaseGroup(title: string): string | null {
  // Strip known tags and file extensions first
  const cleaned = title
    .replace(/\.(mkv|mp4|avi|mov|wmv|flv|webm)$/i, '')
    .replace(/\[.*?\]/g, '')
    .trim();

  // Look for -GROUP at end
  const match = cleaned.match(/-([A-Za-z0-9]{2,15})$/);
  if (match) return match[1];

  return null;
}

function cleanDisplayName(name: string, title: string): string {
  // Use stream.name if it's a clean provider+quality format
  if (name) {
    // Stremio addons typically put "AddonName\nQuality" in name
    const lines = name.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 1) {
      // If first line looks like a provider name (no dots, short), use it
      if (lines[0].length < 40 && !lines[0].includes('.')) {
        return lines[0];
      }
    }
  }

  // Fall back to cleaning up the title
  const firstLine = (title || name || '').split('\n')[0].trim();

  // Replace dots/underscores with spaces, clean up
  let cleaned = firstLine
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Remove URL encoding
  try {
    cleaned = decodeURIComponent(cleaned);
  } catch { /* ignore */ }

  // Truncate if too long
  if (cleaned.length > 60) {
    cleaned = cleaned.substring(0, 57) + '...';
  }

  return cleaned || 'Unknown Stream';
}

export function parseStreamTitle(
  streamName: string | undefined,
  streamTitle: string | undefined,
  streamSize?: number,
  isCached?: boolean,
): ParsedStreamInfo {
  const name = streamName || '';
  const title = streamTitle || '';
  const combined = `${name}\n${title}`;

  return {
    resolution: firstMatch(combined, RESOLUTION_MAP),
    codec: firstMatch(combined, CODEC_MAP),
    hdr: firstMatch(combined, HDR_MAP),
    audio: firstMatch(combined, AUDIO_MAP),
    source: firstMatch(combined, SOURCE_MAP),
    size: extractSize(combined, streamSize),
    releaseGroup: extractReleaseGroup(title.split('\n')[0]),
    isCached: isCached ?? false,
    displayName: cleanDisplayName(name, title),
    provider: null, // filled by caller from addon context
  };
}

/**
 * Determines the accent colour for a resolution pill.
 */
export function resolutionColor(res: string | null): string {
  switch (res) {
    case '4K': return '#F59E0B';
    case '1080p': return '#3B82F6';
    case '720p': return '#10B981';
    case '480p': return '#8B5CF6';
    default: return '#6B7280';
  }
}
