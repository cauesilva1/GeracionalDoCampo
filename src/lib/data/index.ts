import type {
  AttrDef,
  AttrWeights,
  CountryDef,
  LeagueDef,
  LegacyTier,
  Position,
  PositionId,
} from "@/types/game";

export const ATTRS: AttrDef[] = [
  { k: "shot", labelKey: "attr.shot" },
  { k: "fin", labelKey: "attr.fin" },
  { k: "drb", labelKey: "attr.drb" },
  { k: "pass", labelKey: "attr.pass" },
  { k: "def", labelKey: "attr.def" },
  { k: "reb", labelKey: "attr.reb" },
  { k: "ath", labelKey: "attr.ath" },
  { k: "clu", labelKey: "attr.clu" },
];

/** Pesos calibrados por posição — OVR reflete o papel real em quadra. */
export const POSITION_WEIGHTS: Record<PositionId, AttrWeights> = {
  PG: {
    pass: 0.22,
    drb: 0.18,
    shot: 0.16,
    ath: 0.12,
    clu: 0.12,
    def: 0.1,
    fin: 0.06,
    reb: 0.04,
  },
  SG: {
    shot: 0.24,
    fin: 0.16,
    drb: 0.14,
    ath: 0.12,
    clu: 0.12,
    def: 0.1,
    pass: 0.08,
    reb: 0.04,
  },
  SF: {
    ath: 0.16,
    shot: 0.14,
    fin: 0.14,
    def: 0.14,
    drb: 0.12,
    pass: 0.1,
    clu: 0.12,
    reb: 0.08,
  },
  PF: {
    reb: 0.2,
    fin: 0.18,
    def: 0.16,
    ath: 0.14,
    shot: 0.1,
    clu: 0.1,
    pass: 0.06,
    drb: 0.06,
  },
  C: {
    reb: 0.26,
    fin: 0.18,
    def: 0.2,
    ath: 0.12,
    clu: 0.1,
    shot: 0.06,
    pass: 0.05,
    drb: 0.03,
  },
};

export const POSITIONS: Position[] = [
  { id: "PG", nameKey: "pos.PG", weights: POSITION_WEIGHTS.PG },
  { id: "SG", nameKey: "pos.SG", weights: POSITION_WEIGHTS.SG },
  { id: "SF", nameKey: "pos.SF", weights: POSITION_WEIGHTS.SF },
  { id: "PF", nameKey: "pos.PF", weights: POSITION_WEIGHTS.PF },
  { id: "C", nameKey: "pos.C", weights: POSITION_WEIGHTS.C },
];

export { LEGENDS, buildBalancedDraftPool, pickRerollLegend } from "@/data/nbaPlayers";

/** Birth country → starter league (strict). */
export const COUNTRIES: CountryDef[] = [
  { id: "us", nameKey: "country.us", flag: "🇺🇸", leagueId: "ncaa" },
  { id: "br", nameKey: "country.br", flag: "🇧🇷", leagueId: "nbb" },
  { id: "es", nameKey: "country.es", flag: "🇪🇸", leagueId: "acb" },
  { id: "fr", nameKey: "country.fr", flag: "🇫🇷", leagueId: "lnb" },
  { id: "au", nameKey: "country.au", flag: "🇦🇺", leagueId: "nbl" },
  { id: "cn", nameKey: "country.cn", flag: "🇨🇳", leagueId: "cba" },
];

export const LEAGUES: LeagueDef[] = [
  {
    id: "ncaa",
    nameKey: "league.ncaa",
    countryId: "us",
    currency: "USD",
    prestige: 0.78,
    salaryScale: 0.05,
    clubs: [
      { id: "duke", name: "Duke Blue Devils", short: "DUK", strength: 92 },
      { id: "kentucky", name: "Kentucky Wildcats", short: "UK", strength: 91 },
      { id: "kansas", name: "Kansas Jayhawks", short: "KU", strength: 90 },
      { id: "unc", name: "North Carolina", short: "UNC", strength: 89 },
      { id: "uconn", name: "UConn Huskies", short: "CON", strength: 88 },
      { id: "gonzaga", name: "Gonzaga Bulldogs", short: "GON", strength: 87 },
      { id: "arizona", name: "Arizona Wildcats", short: "ARZ", strength: 85 },
      { id: "ucla", name: "UCLA Bruins", short: "UCL", strength: 84 },
      { id: "michigan", name: "Michigan Wolverines", short: "MICH", strength: 82 },
      { id: "houston", name: "Houston Cougars", short: "HOU", strength: 86 },
    ],
  },
  {
    id: "nbb",
    nameKey: "league.nbb",
    countryId: "br",
    currency: "BRL",
    prestige: 0.82,
    salaryScale: 0.35,
    clubs: [
      { id: "franca", name: "Franca", short: "FRA", strength: 88 },
      { id: "flamengo", name: "Flamengo", short: "FLA", strength: 90 },
      { id: "spfc", name: "São Paulo", short: "SAO", strength: 86 },
      { id: "minas", name: "Minas", short: "MIN", strength: 85 },
      { id: "paulistano", name: "Paulistano", short: "PAU", strength: 82 },
      { id: "bauru", name: "Bauru", short: "BAU", strength: 80 },
      { id: "pinheiros", name: "Pinheiros", short: "PIN", strength: 78 },
      { id: "brasilia", name: "Brasília", short: "BRA", strength: 76 },
      { id: "corinthians", name: "Corinthians", short: "COR", strength: 79 },
      { id: "unifacisa", name: "Unifacisa", short: "UNI", strength: 77 },
    ],
  },
  {
    id: "acb",
    nameKey: "league.acb",
    countryId: "es",
    currency: "EUR",
    prestige: 1.05,
    salaryScale: 0.85,
    clubs: [
      { id: "rmadrid", name: "Real Madrid", short: "RMB", strength: 95 },
      { id: "barca", name: "FC Barcelona", short: "FCB", strength: 93 },
      { id: "baskonia", name: "Baskonia", short: "BAS", strength: 88 },
      { id: "unicaja", name: "Unicaja Málaga", short: "UNI", strength: 86 },
      { id: "valencia", name: "Valencia Basket", short: "VAL", strength: 85 },
      { id: "joventut", name: "Joventut Badalona", short: "JOV", strength: 82 },
      { id: "tenerife", name: "Lenovo Tenerife", short: "TEN", strength: 81 },
      { id: "murcia", name: "UCAM Murcia", short: "MUR", strength: 78 },
      { id: "gran_canaria", name: "Gran Canaria", short: "GCA", strength: 80 },
      { id: "bilbao", name: "Surne Bilbao", short: "BIL", strength: 74 },
    ],
  },
  {
    id: "lnb",
    nameKey: "league.lnb",
    countryId: "fr",
    currency: "EUR",
    prestige: 0.95,
    salaryScale: 0.7,
    clubs: [
      { id: "asvel", name: "LDLC ASVEL", short: "ASV", strength: 88 },
      { id: "monaco", name: "AS Monaco", short: "ASM", strength: 92 },
      { id: "paris", name: "Paris Basketball", short: "PAR", strength: 90 },
      { id: "mets92", name: "Metropolitans 92", short: "M92", strength: 84 },
      { id: "dijon", name: "JDA Dijon", short: "DIJ", strength: 80 },
      { id: "strasbourg", name: "SIG Strasbourg", short: "STR", strength: 82 },
      { id: "nanterre", name: "Nanterre 92", short: "NAN", strength: 78 },
      { id: "le_mans", name: "Le Mans Sarthe", short: "LMS", strength: 79 },
      { id: "cholet", name: "Cholet Basket", short: "CHO", strength: 76 },
      { id: "lyon", name: "LDLC ASVEL Bourg", short: "BOU", strength: 77 },
    ],
  },
  {
    id: "nbl",
    nameKey: "league.nbl",
    countryId: "au",
    currency: "AUD",
    prestige: 0.9,
    salaryScale: 0.55,
    clubs: [
      { id: "sydney", name: "Sydney Kings", short: "SYD", strength: 90 },
      { id: "melbourne", name: "Melbourne United", short: "MEL", strength: 88 },
      { id: "brisbane", name: "Brisbane Bullets", short: "BRI", strength: 82 },
      { id: "perth", name: "Perth Wildcats", short: "PER", strength: 86 },
      { id: "adelaide", name: "Adelaide 36ers", short: "ADL", strength: 80 },
      { id: "nz_breakers", name: "New Zealand Breakers", short: "NZB", strength: 78 },
      { id: "illawarra", name: "Illawarra Hawks", short: "ILL", strength: 84 },
      { id: "cairns", name: "Cairns Taipans", short: "CAI", strength: 76 },
    ],
  },
  {
    id: "cba",
    nameKey: "league.cba",
    countryId: "cn",
    currency: "CNY",
    prestige: 0.88,
    salaryScale: 0.75,
    clubs: [
      { id: "guangdong", name: "Guangdong Southern Tigers", short: "GDS", strength: 90 },
      { id: "liaoning", name: "Liaoning Flying Leopards", short: "LIA", strength: 92 },
      { id: "zhejiang", name: "Zhejiang Lions", short: "ZHE", strength: 86 },
      { id: "shanghai", name: "Shanghai Sharks", short: "SHA", strength: 84 },
      { id: "beijing", name: "Beijing Ducks", short: "BEJ", strength: 85 },
      { id: "xinjiang", name: "Xinjiang Flying Tigers", short: "XIN", strength: 83 },
      { id: "shandong", name: "Shandong Hi-Speed", short: "SD", strength: 80 },
      { id: "guangzhou", name: "Guangzhou Loong Lions", short: "GZL", strength: 78 },
    ],
  },
  {
    id: "euro",
    nameKey: "league.euro",
    countryId: "es",
    currency: "EUR",
    prestige: 1.18,
    salaryScale: 1.15,
    clubs: [
      { id: "euro_rmadrid", name: "Real Madrid", short: "RMB", strength: 96 },
      { id: "euro_barca", name: "FC Barcelona", short: "FCB", strength: 94 },
      { id: "euro_efes", name: "Anadolu Efes", short: "EFE", strength: 92 },
      { id: "euro_monaco", name: "AS Monaco", short: "ASM", strength: 91 },
      { id: "euro_fener", name: "Fenerbahçe", short: "FEN", strength: 90 },
      { id: "euro_oly", name: "Olympiacos", short: "OLY", strength: 89 },
      { id: "euro_pao", name: "Panathinaikos", short: "PAO", strength: 88 },
      { id: "euro_mac", name: "Maccabi Tel Aviv", short: "MTA", strength: 86 },
      { id: "euro_zalgiris", name: "Žalgiris Kaunas", short: "ZAL", strength: 84 },
      { id: "euro_milano", name: "Olimpia Milano", short: "MIL", strength: 85 },
    ],
  },
  {
    id: "nba",
    nameKey: "league.nba",
    countryId: "us",
    currency: "USD",
    prestige: 1.35,
    salaryScale: 2.4,
    clubs: [
      { id: "bos", name: "Boston Celtics", short: "BOS", strength: 94 },
      { id: "okc", name: "Oklahoma City Thunder", short: "OKC", strength: 93 },
      { id: "den", name: "Denver Nuggets", short: "DEN", strength: 91 },
      { id: "nyk", name: "New York Knicks", short: "NYK", strength: 90 },
      { id: "mil", name: "Milwaukee Bucks", short: "MIL", strength: 88 },
      { id: "min", name: "Minnesota Timberwolves", short: "MIN", strength: 89 },
      { id: "cle", name: "Cleveland Cavaliers", short: "CLE", strength: 90 },
      { id: "dal", name: "Dallas Mavericks", short: "DAL", strength: 87 },
      { id: "phx", name: "Phoenix Suns", short: "PHX", strength: 85 },
      { id: "lac", name: "LA Clippers", short: "LAC", strength: 86 },
      { id: "lal", name: "Los Angeles Lakers", short: "LAL", strength: 84 },
      { id: "gsw", name: "Golden State Warriors", short: "GSW", strength: 83 },
      { id: "mia", name: "Miami Heat", short: "MIA", strength: 82 },
      { id: "phi", name: "Philadelphia 76ers", short: "PHI", strength: 81 },
      { id: "sac", name: "Sacramento Kings", short: "SAC", strength: 80 },
      { id: "orl", name: "Orlando Magic", short: "ORL", strength: 84 },
      { id: "ind", name: "Indiana Pacers", short: "IND", strength: 85 },
      { id: "mem", name: "Memphis Grizzlies", short: "MEM", strength: 79 },
      { id: "atl", name: "Atlanta Hawks", short: "ATL", strength: 78 },
      { id: "chi", name: "Chicago Bulls", short: "CHI", strength: 76 },
      { id: "hou", name: "Houston Rockets", short: "HOU", strength: 82 },
      { id: "sas", name: "San Antonio Spurs", short: "SAS", strength: 77 },
      { id: "tor", name: "Toronto Raptors", short: "TOR", strength: 75 },
      { id: "uta", name: "Utah Jazz", short: "UTA", strength: 74 },
      { id: "por", name: "Portland Trail Blazers", short: "POR", strength: 73 },
      { id: "nop", name: "New Orleans Pelicans", short: "NOP", strength: 78 },
      { id: "was", name: "Washington Wizards", short: "WAS", strength: 70 },
      { id: "det", name: "Detroit Pistons", short: "DET", strength: 80 },
      { id: "cha", name: "Charlotte Hornets", short: "CHA", strength: 72 },
      { id: "bkn", name: "Brooklyn Nets", short: "BKN", strength: 74 },
    ],
  },
];

export const LEGACY_TIERS: LegacyTier[] = [
  { min: 0, id: "bench" },
  { min: 35, id: "solid" },
  { min: 60, id: "star" },
  { min: 85, id: "allstar" },
  { min: 110, id: "legend" },
  { min: 140, id: "immortal" },
  { min: 170, id: "goat_debate" },
];

export const STORAGE_KEY = "lenda-da-quadra-v7";
/** Migrate from previous persist key on first load. */
export const STORAGE_KEY_LEGACY = "lenda-da-quadra-v6";
/** Reachable draft window after strong early growth from age 16. */
export const NBA_DRAFT_OVR = 72;
/** Lottery / Top-10 stock — below this, pick is capped outside top 10. */
export const NBA_DRAFT_LOTTERY_OVR = 80;
export const NBA_DRAFT_MAX_AGE = 23;
export const NBA_DRAFT_MIN_SEASONS = 3;
export const NBA_FA_OVR = 78;
export const NBA_FA_MIN_AGE = 23;
export const NBA_FA_MIN_SEASONS = 3;
/** EuroLeague: bridge out of domestic by ~season 3. */
export const EURO_OVR = 68;
export const EURO_MIN_SEASONS = 1;
export const MARKET_COST_UNIT = 250_000;
export const MARKET_COST_HIGH = 3;
export const MARKET_COST_MED = 2;
export const MARKET_COST_LOW = 1;
export const STARTER_WALLET = 1_800_000;
export { RETIRE_AGE, START_AGE, START_YEAR } from "@/lib/calendar";
