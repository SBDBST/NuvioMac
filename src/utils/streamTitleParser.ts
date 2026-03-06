/**
 * streamTitleParser.ts
 *
 * Parses raw Stremio stream titles (typically torrent filenames) into
 * structured metadata for clean UI display.
 *
 * Maximum possible fields (17):
 *   resolution, source, hdr, codec, audioFormat, audioChannels,
 *   bitDepth, size, language, isCached, releaseGroup, edition,
 *   proper, is3D, isDualAudio, hasMultiSubs, container
 *
 * Pills are split into two tiers:
 *   PRIMARY  -- the glanceable stuff for quick stream selection
 *   SECONDARY -- technical detail revealed via dropdown
 */

export interface Pill {
  label: string;
  color?: string;
  tier: 'primary' | 'secondary';
}

export interface ParsedStreamInfo {
  resolution: string | null;
  source: string | null;
  hdr: string | null;
  codec: string | null;
  audioFormat: string | null;
  audioChannels: string | null;
  bitDepth: string | null;
  size: string | null;
  language: string | null;
  isCached: boolean;
  releaseGroup: string | null;
  edition: string | null;
  proper: string | null;
  is3D: string | null;
  isDualAudio: boolean;
  hasMultiSubs: boolean;
  hasHardcodedSubs: boolean;
  container: string | null;
  displayName: string;
  primaryPills: Pill[];
  secondaryPills: Pill[];
}

// ── Lookup tables ───────────────────────────────────────────────────

const RESOLUTION: [RegExp, string][] = [
  [/\b2160p\b/i, '4K'], [/\b4k\b/i, '4K'], [/\buhd\b/i, '4K'],
  [/\b1080p\b/i, '1080p'], [/\b1080i\b/i, '1080i'],
  [/\b720p\b/i, '720p'], [/\b576p\b/i, '576p'],
  [/\b480p\b/i, '480p'], [/\b360p\b/i, '360p'],
];

const SOURCE: [RegExp, string][] = [
  [/\bremux\b/i, 'REMUX'], [/\bblu[\s.-]?ray\b/i, 'BluRay'],
  [/\bbdrip\b/i, 'BDRip'], [/\bbrrip\b/i, 'BRRip'],
  [/\bweb[\s.-]?dl\b/i, 'WEB-DL'], [/\bwebrip\b/i, 'WEBRip'],
  [/\bweb\b(?![\s.-]?dl)/i, 'WEB'], [/\bhdtv\b/i, 'HDTV'],
  [/\bpdtv\b/i, 'PDTV'], [/\bdvdrip\b/i, 'DVDRip'],
  [/\bdvd[\s.-]?r\b/i, 'DVDR'], [/\bcam(?:rip)?\b/i, 'CAM'],
  [/\bhdcam\b/i, 'HDCAM'], [/\bts(?:rip)?\b/i, 'TS'],
  [/\bscreener\b/i, 'SCR'], [/\bdvdscr\b/i, 'DVDSCR'],
  [/\bppvrip\b/i, 'PPVRip'], [/\bsatrip\b/i, 'SATRip'],
];

const HDR: [RegExp, string][] = [
  [/\bhdr10\+/i, 'HDR10+'], [/\bhdr10\b/i, 'HDR10'],
  [/\bdolby[\s.]?vision\b/i, 'DV'], [/\bDV\b/, 'DV'],
  [/\bhdr\b/i, 'HDR'], [/\bhlg\b/i, 'HLG'],
];

const CODEC: [RegExp, string][] = [
  [/\bav1\b/i, 'AV1'], [/\bhevc\b/i, 'HEVC'],
  [/\bx\.?265\b/i, 'x265'], [/\bh\.?265\b/i, 'H.265'],
  [/\bx\.?264\b/i, 'x264'], [/\bh\.?264\b/i, 'H.264'],
  [/\bmpeg[\s.-]?4\b/i, 'MPEG-4'], [/\bxvid\b/i, 'XviD'],
  [/\bdivx\b/i, 'DivX'], [/\bvp9\b/i, 'VP9'], [/\bvc[\s.-]?1\b/i, 'VC-1'],
];

const AUDIO_FORMAT: [RegExp, string][] = [
  [/\batmos\b/i, 'Atmos'], [/\btruehd\b/i, 'TrueHD'],
  [/\bdts[\s.-]?hd[\s.]?ma\b/i, 'DTS-HD MA'], [/\bdts[\s.-]?hd\b/i, 'DTS-HD'],
  [/\bdts[\s.-]?x\b/i, 'DTS:X'], [/\bdts\b/i, 'DTS'],
  [/\blpcm\b/i, 'LPCM'], [/\bflac\b/i, 'FLAC'], [/\bpcm\b/i, 'PCM'],
  [/\beac[\s.-]?3\b/i, 'EAC3'], [/\bdd[\s.]?\+/i, 'DD+'], [/\bddp\b/i, 'DD+'],
  [/\bdd[\s.]?5[\s.]?1\b/i, 'DD 5.1'], [/\bac[\s.-]?3\b/i, 'AC3'],
  [/\baac\b/i, 'AAC'], [/\bopus\b/i, 'Opus'], [/\bvorbis\b/i, 'Vorbis'],
  [/\bmp3\b/i, 'MP3'],
];

const AUDIO_CHANNELS: [RegExp, string][] = [
  [/\b7[\s.]1[\s.]4\b/i, '7.1.4'], [/\b7[\s.]1[\s.]2\b/i, '7.1.2'],
  [/\b7\.1\b(?![\s.]?[GMKT]B)/i, '7.1'],
  [/\b5\.1\b(?![\s.]?[GMKT]B)/i, '5.1'],
  [/\b2\.1\b(?![\s.]?[GMKT]B)/i, '2.1'],
  [/\b2\.0\b(?![\s.]?[GMKT]B)/i, '2.0'],
  [/\bstereo\b/i, 'Stereo'], [/\bmono\b/i, 'Mono'],
];

const BIT_DEPTH: [RegExp, string][] = [
  [/\b12[\s.-]?bit\b/i, '12bit'], [/\b10[\s.-]?bit\b/i, '10bit'],
  [/\b8[\s.-]?bit\b/i, '8bit'],
];

const EDITION: [RegExp, string][] = [
  [/\bimax\b/i, 'IMAX'], [/\bdirector'?s[\s.]?cut\b/i, "Dir. Cut"],
  [/\bextended[\s.]?(?:cut|edition)?\b/i, 'Extended'],
  [/\bunrated\b/i, 'Unrated'], [/\btheatrical\b/i, 'Theatrical'],
  [/\bcriterion\b/i, 'Criterion'], [/\bspecial[\s.]?edition\b/i, 'Special Ed.'],
  [/\bremastered\b/i, 'Remastered'], [/\bopen[\s.]?matte\b/i, 'Open Matte'],
];

const PROPER: [RegExp, string][] = [
  [/\bproper\b/i, 'PROPER'], [/\brepack\b/i, 'REPACK'],
  [/\breal\b/i, 'REAL'],
];

const THREE_D: [RegExp, string][] = [
  [/\bhalf[\s.-]?sbs\b/i, 'Half-SBS'], [/\bfull[\s.-]?sbs\b/i, 'Full-SBS'],
  [/\bsbs\b/i, 'SBS 3D'], [/\bhou\b/i, 'HOU 3D'], [/\b3d\b/i, '3D'],
];

const CONTAINER: [RegExp, string][] = [
  [/\.mkv\b/i, 'MKV'], [/\.mp4\b/i, 'MP4'], [/\.avi\b/i, 'AVI'],
  [/\.webm\b/i, 'WebM'], [/\.mov\b/i, 'MOV'],
];

const LANGUAGE_MAP: [RegExp, string][] = [
  [/\benglish\b/i, 'English'], [/\bfrench\b/i, 'French'],
  [/\bspanish\b/i, 'Spanish'], [/\bgerman\b/i, 'German'],
  [/\bitalian\b/i, 'Italian'], [/\bportuguese\b/i, 'Portuguese'],
  [/\brussian\b/i, 'Russian'], [/\bjapanese\b/i, 'Japanese'],
  [/\bkorean\b/i, 'Korean'], [/\bchinese\b/i, 'Chinese'],
  [/\bhindi\b/i, 'Hindi'], [/\barabic\b/i, 'Arabic'],
  [/\bturkish\b/i, 'Turkish'], [/\bpolish\b/i, 'Polish'],
  [/\bdutch\b/i, 'Dutch'], [/\bswedish\b/i, 'Swedish'],
  [/\bnorwegian\b/i, 'Norwegian'], [/\bdanish\b/i, 'Danish'],
  [/\bfinnish\b/i, 'Finnish'], [/\bczech\b/i, 'Czech'],
  [/\bthai\b/i, 'Thai'], [/\bvietnamese\b/i, 'Vietnamese'],
  [/\bindonesian\b/i, 'Indonesian'], [/\bgreek\b/i, 'Greek'],
  [/\bhebrew\b/i, 'Hebrew'], [/\bromanian\b/i, 'Romanian'],
  [/\bhungarian\b/i, 'Hungarian'], [/\bukrainian\b/i, 'Ukrainian'],
  [/\btelugu\b/i, 'Telugu'], [/\btamil\b/i, 'Tamil'],
  [/\burdu\b/i, 'Urdu'], [/\bbengali\b/i, 'Bengali'],
  [/\bmalay\b/i, 'Malay'], [/\btagalog\b/i, 'Tagalog'],
];

const LANG_CODE: Record<string, string> = {
  en: 'English', fr: 'French', es: 'Spanish', de: 'German',
  it: 'Italian', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese',
  ko: 'Korean', zh: 'Chinese', hi: 'Hindi', ar: 'Arabic',
  tr: 'Turkish', pl: 'Polish', nl: 'Dutch', sv: 'Swedish',
  no: 'Norwegian', da: 'Danish', fi: 'Finnish', cs: 'Czech',
  th: 'Thai', vi: 'Vietnamese', id: 'Indonesian', el: 'Greek',
  he: 'Hebrew', ro: 'Romanian', hu: 'Hungarian', uk: 'Ukrainian',
  te: 'Telugu', ta: 'Tamil', ur: 'Urdu', bn: 'Bengali',
  ms: 'Malay', tl: 'Tagalog',
};

// ── Helpers ─────────────────────────────────────────────────────────

function first(text: string, map: [RegExp, string][]): string | null {
  for (const [re, label] of map) { if (re.test(text)) return label; }
  return null;
}

function extractSize(text: string, streamSize?: number): string | null {
  const m1 = text.match(/💾\s*([\d.]+\s*[KMGT]?B)/i);
  if (m1) return m1[1].trim();
  const m2 = text.match(/\b([\d.]+)\s*(GB|MB|TB|KB)\b/i);
  if (m2) return `${m2[1]} ${m2[2].toUpperCase()}`;
  if (streamSize && streamSize > 0) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let val = streamSize; let idx = 0;
    while (val >= 1024 && idx < units.length - 1) { val /= 1024; idx++; }
    return `${val.toFixed(val >= 10 ? 1 : 2)} ${units[idx]}`;
  }
  return null;
}

function extractLanguage(text: string, langField?: string): string | null {
  if (langField) {
    const lc = langField.toLowerCase().trim();
    if (LANG_CODE[lc]) return LANG_CODE[lc];
    for (const [re, name] of LANGUAGE_MAP) { if (re.test(langField)) return name; }
    if (lc.length > 0 && lc.length <= 20) return langField.charAt(0).toUpperCase() + langField.slice(1);
  }
  return first(text, LANGUAGE_MAP);
}

function extractReleaseGroup(title: string): string | null {
  const cleaned = title.replace(/\.(mkv|mp4|avi|mov|wmv|flv|webm)$/i, '').replace(/\[.*?\]/g, '').trim();
  const m = cleaned.match(/-([A-Za-z0-9]{2,15})$/);
  return m ? m[1] : null;
}

function cleanDisplayName(name: string, title: string): string {
  if (name) {
    const lines = name.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 1 && lines[0].length < 50 && !lines[0].includes('.')) return lines[0];
  }
  const firstLine = (title || name || '').split('\n')[0].trim();
  let cleaned = firstLine.replace(/\./g, ' ').replace(/_/g, ' ').replace(/\s{2,}/g, ' ').trim();
  try { cleaned = decodeURIComponent(cleaned); } catch { /* ok */ }
  if (cleaned.length > 65) cleaned = cleaned.substring(0, 62) + '...';
  return cleaned || 'Unknown Stream';
}

// ── Colour helpers ──────────────────────────────────────────────────

export function resolutionColor(res: string | null): string {
  switch (res) {
    case '4K': return '#F59E0B';
    case '1080p': case '1080i': return '#3B82F6';
    case '720p': return '#10B981';
    default: return '#6B7280';
  }
}

const AUDIO_PREMIUM = '#E879F9';
const HDR_COL = '#D946EF';
const CACHED_COL = '#22C55E';
const EDITION_COL = '#F97316';
const LANG_COL = '#06B6D4';
const THREE_D_COL = '#EC4899';
const HC_COL = '#EF4444';

function premiumAudio(f: string | null): boolean {
  return ['Atmos', 'TrueHD', 'DTS-HD MA', 'DTS:X', 'LPCM'].includes(f || '');
}

// ── Main ────────────────────────────────────────────────────────────

export function parseStreamTitle(
  streamName?: string, streamTitle?: string,
  streamSize?: number, isCached?: boolean, streamLang?: string,
): ParsedStreamInfo {
  const name = streamName || '';
  const title = streamTitle || '';
  const combined = `${name}\n${title}`;

  const resolution = first(combined, RESOLUTION);
  const source = first(combined, SOURCE);
  const hdr = first(combined, HDR);
  const codec = first(combined, CODEC);
  const audioFormat = first(combined, AUDIO_FORMAT);
  const audioChannels = first(combined, AUDIO_CHANNELS);
  const bitDepth = first(combined, BIT_DEPTH);
  const size = extractSize(combined, streamSize);
  const language = extractLanguage(combined, streamLang);
  const cached = isCached ?? false;
  const releaseGroup = extractReleaseGroup(title.split('\n')[0]);
  const edition = first(combined, EDITION);
  const proper = first(combined, PROPER);
  const is3D = first(combined, THREE_D);
  const isDualAudio = /\bdual[\s.-]?audio\b/i.test(combined);
  const hasMultiSubs = /\bmulti[\s.-]?sub/i.test(combined);
  const hasHardcodedSubs = /\b(?:hardcoded|hc)[\s.-]?sub/i.test(combined);
  const container = first(combined, CONTAINER);
  const displayName = cleanDisplayName(name, title);

  // ── PRIMARY pills ─────────────────────────────────────────────
  const primary: Pill[] = [];
  if (resolution) primary.push({ label: resolution, color: resolutionColor(resolution), tier: 'primary' });
  if (source) primary.push({ label: source, color: source === 'REMUX' ? '#F59E0B' : undefined, tier: 'primary' });
  if (hdr) primary.push({ label: hdr, color: HDR_COL, tier: 'primary' });
  if (size) primary.push({ label: size, tier: 'primary' });
  if (cached) primary.push({ label: 'CACHED', color: CACHED_COL, tier: 'primary' });
  if (language && language !== 'English') primary.push({ label: language, color: LANG_COL, tier: 'primary' });

  // ── SECONDARY pills ───────────────────────────────────────────
  const secondary: Pill[] = [];
  if (codec) secondary.push({ label: codec, tier: 'secondary' });
  if (audioFormat) secondary.push({ label: audioFormat, color: premiumAudio(audioFormat) ? AUDIO_PREMIUM : undefined, tier: 'secondary' });
  if (audioChannels) secondary.push({ label: audioChannels, tier: 'secondary' });
  if (bitDepth) secondary.push({ label: bitDepth, tier: 'secondary' });
  if (edition) secondary.push({ label: edition, color: EDITION_COL, tier: 'secondary' });
  if (language === 'English') secondary.push({ label: 'English', color: LANG_COL, tier: 'secondary' });
  if (isDualAudio) secondary.push({ label: 'Dual Audio', color: LANG_COL, tier: 'secondary' });
  if (is3D) secondary.push({ label: is3D, color: THREE_D_COL, tier: 'secondary' });
  if (proper) secondary.push({ label: proper, tier: 'secondary' });
  if (hasMultiSubs) secondary.push({ label: 'Multi-Sub', tier: 'secondary' });
  if (hasHardcodedSubs) secondary.push({ label: 'HC Subs', color: HC_COL, tier: 'secondary' });
  if (releaseGroup) secondary.push({ label: releaseGroup, tier: 'secondary' });
  if (container) secondary.push({ label: container, tier: 'secondary' });

  return {
    resolution, source, hdr, codec, audioFormat, audioChannels,
    bitDepth, size, language, isCached: cached, releaseGroup,
    edition, proper, is3D, isDualAudio, hasMultiSubs,
    hasHardcodedSubs, container, displayName,
    primaryPills: primary, secondaryPills: secondary,
  };
}
