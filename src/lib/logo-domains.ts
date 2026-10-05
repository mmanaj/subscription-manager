// Popular services → the site whose icon is their logo. Matched against the subscription name
// (lowercased, longest key first), so "Amazon Prime Video" hits "prime video" before "amazon".
const KNOWN: Record<string, string> = {
  netflix: "netflix.com",
  spotify: "spotify.com",
  skyshowtime: "skyshowtime.com",
  "sky showtime": "skyshowtime.com",
  allegro: "allegro.pl",
  "amazon prime video": "primevideo.com",
  "prime video": "primevideo.com",
  "amazon prime": "amazon.pl",
  amazon: "amazon.pl",
  audible: "audible.com",
  claude: "claude.ai",
  anthropic: "claude.ai",
  chatgpt: "chatgpt.com",
  openai: "openai.com",
  perplexity: "perplexity.ai",
  gemini: "gemini.google.com",
  midjourney: "midjourney.com",
  cursor: "cursor.com",
  "github copilot": "github.com",
  github: "github.com",
  "youtube music": "music.youtube.com",
  "youtube premium": "youtube.com",
  youtube: "youtube.com",
  "disney+": "disneyplus.com",
  "disney plus": "disneyplus.com",
  disney: "disneyplus.com",
  "hbo max": "max.com",
  hbo: "max.com",
  max: "max.com",
  "canal+": "canalplus.com",
  "canal plus": "canalplus.com",
  "player.pl": "player.pl",
  player: "player.pl",
  "polsat box go": "polsatboxgo.pl",
  polsat: "polsatboxgo.pl",
  viaplay: "viaplay.pl",
  "apple tv": "tv.apple.com",
  "apple music": "music.apple.com",
  "apple one": "apple.com",
  icloud: "icloud.com",
  apple: "apple.com",
  "google one": "one.google.com",
  "google workspace": "workspace.google.com",
  google: "google.com",
  "microsoft 365": "microsoft365.com",
  "office 365": "microsoft365.com",
  microsoft: "microsoft.com",
  xbox: "xbox.com",
  "game pass": "xbox.com",
  playstation: "playstation.com",
  "ps plus": "playstation.com",
  nintendo: "nintendo.com",
  steam: "steampowered.com",
  adobe: "adobe.com",
  lightroom: "adobe.com",
  photoshop: "adobe.com",
  canva: "canva.com",
  figma: "figma.com",
  notion: "notion.so",
  dropbox: "dropbox.com",
  "1password": "1password.com",
  bitwarden: "bitwarden.com",
  nordvpn: "nordvpn.com",
  "proton": "proton.me",
  linkedin: "linkedin.com",
  duolingo: "duolingo.com",
  tidal: "tidal.com",
  deezer: "deezer.com",
  storytel: "storytel.com",
  legimi: "legimi.pl",
  empik: "empik.com",
  "bookbeat": "bookbeat.pl",
  medium: "medium.com",
  substack: "substack.com",
  patreon: "patreon.com",
  revolut: "revolut.com",
  multisport: "benefitsystems.pl",
  medicover: "medicover.pl",
  "lux med": "luxmed.pl",
  luxmed: "luxmed.pl",
  orange: "orange.pl",
  "t-mobile": "t-mobile.pl",
  plus: "plus.pl",
  play: "play.pl",
  nju: "njumobile.pl",
  vectra: "vectra.pl",
  "wyborcza": "wyborcza.pl",
  "rzeczpospolita": "rp.pl",
  "onet premium": "onet.pl",
  "glovo": "glovoapp.com",
  "uber one": "uber.com",
  uber: "uber.com",
  wolt: "wolt.com",
  bolt: "bolt.eu",
  "pyszne": "pyszne.pl",
};

const KEYS = Object.keys(KNOWN).sort((a, b) => b.length - a.length);

export function knownDomain(name: string): string | null {
  const n = ` ${name.toLowerCase().replace(/\s+/g, " ").trim()} `;
  // Whole-word-ish match so "play" doesn't fire inside "playstation" or "display".
  const key = KEYS.find((k) => new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(n));
  return key ? KNOWN[key] : null;
}

export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** "SkyShowtime" → "skyshowtime.com". Last resort only. */
export function guessDomain(name: string): string | null {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .split(/\s+/)[0]
    ?.replace(/[^a-z0-9-]/g, "");
  return slug && slug.length >= 2 ? `${slug}.com` : null;
}

/** Domain to look the logo up on: manual override > known service > link host > guess. */
export function logoDomainFor(s: { name: string; url: string | null; logoDomain?: string | null }): string | null {
  return normalizeDomain(s.logoDomain) ?? knownDomain(s.name) ?? hostOf(s.url) ?? guessDomain(s.name);
}

export function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  const host = hostOf(/^https?:\/\//.test(v) ? v : `https://${v}`);
  return host && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) ? host : null;
}
