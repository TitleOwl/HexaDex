// ─── Cache & API URLs ─────────────────────────────────────────────────────────
export const CACHE_KEY    = "pkdx_cache_v2";
export const LIST_KEY     = "pkdx_list_v2";
export const THAI_KEY     = "pkdx_thai_v2";
export const JP_KEY       = "pkdx_jp_v2";
export const TEAM_KEY     = "pkdx_team_v1";
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const THAI_NAMES_URL = "https://raw.githubusercontent.com/sindresorhus/pokemon/main/data/th.json";
export const JP_NAMES_URL   = "https://raw.githubusercontent.com/sindresorhus/pokemon/main/data/ja.json";

export const CRY_URL = {
  anime:    (id)   => `https://pokemoncries.com/cries/${id}.mp3`,
  showdown: (name) => `https://play.pokemonshowdown.com/audio/cries/${name.toLowerCase().replace(/[^a-z0-9-]/g, "")}.mp3`,
  latest:   (id)   => `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`,
  legacy:   (id)   => `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy/${id}.ogg`,
};

export const GLB_URL = {
  regular: (id) => `https://cdn.jsdelivr.net/gh/Pokemon-3D-api/assets@main/models/opt/regular/${id}.glb`,
  shiny:   (id) => `https://cdn.jsdelivr.net/gh/Pokemon-3D-api/assets@main/models/opt/shiny/${id}.glb`,
};

export const PAGE_SIZE       = 1350;
export const SEARCH_DEBOUNCE = 1350;

// ─── Generations / Regions ────────────────────────────────────────────────────
export const GENERATIONS = [
  { min: 1,   max: Infinity, en: "All",    th: "ทั้งหมด",  ja: "全世代",   sub: { en: "",        th: "",       ja: ""       } },
  { min: 1,   max: 151,      en: "Kanto",  th: "คันโต",    ja: "カントー", sub: { en: "Gen I",   th: "เจน I",   ja: "第一世代" } },
  { min: 152, max: 251,      en: "Johto",  th: "โจโต",     ja: "ジョウト", sub: { en: "Gen II",  th: "เจน II",  ja: "第二世代" } },
  { min: 252, max: 386,      en: "Hoenn",  th: "โฮเอ็น",   ja: "ホウエン", sub: { en: "Gen III", th: "เจน III", ja: "第三世代" } },
  { min: 387, max: 493,      en: "Sinnoh", th: "ซินโนห์",  ja: "シンオウ", sub: { en: "Gen IV",  th: "เจน IV",  ja: "第四世代" } },
  { min: 494, max: 649,      en: "Unova",  th: "อูโนวา",   ja: "イッシュ", sub: { en: "Gen V",   th: "เจน V",   ja: "第五世代" } },
  { min: 650, max: 721,      en: "Kalos",  th: "คาโลส",    ja: "カロス",   sub: { en: "Gen VI",  th: "เจน VI",  ja: "第六世代" } },
  { min: 722, max: 809,      en: "Alola",  th: "อาโลลา",   ja: "アローラ", sub: { en: "Gen VII", th: "เจน VII", ja: "第七世代" } },
  { min: 810, max: 905,      en: "Galar",  th: "กาลาร์",   ja: "ガラル",   sub: { en: "Gen VIII",th: "เจน VIII",ja: "第八世代" } },
  { min: 906, max: 1025,     en: "Paldea", th: "พัลเดีย",  ja: "パルデア", sub: { en: "Gen IX",  th: "เจน IX",  ja: "第九世代" } },
];

// ─── Type Data ────────────────────────────────────────────────────────────────
export const TYPE_COLORS = {
  normal:"#A8A878", fire:"#F08030", water:"#6890F0", electric:"#F8D030",
  grass:"#78C850", ice:"#98D8D8", fighting:"#C03028", poison:"#A040A0",
  ground:"#E0C068", flying:"#A890F0", psychic:"#F85888", bug:"#A8B820",
  rock:"#B8A038", ghost:"#705898", dragon:"#7038F8", dark:"#705848",
  steel:"#B8B8D0", fairy:"#EE99AC",
};
export const TYPE_NAMES_TH = {
  normal:"ปกติ", fire:"ไฟ", water:"น้ำ", electric:"ไฟฟ้า",
  grass:"หญ้า", ice:"น้ำแข็ง", fighting:"ต่อสู้", poison:"พิษ",
  ground:"พื้นดิน", flying:"บิน", psychic:"จิต", bug:"แมลง",
  rock:"หิน", ghost:"ผี", dragon:"มังกร", dark:"มืด",
  steel:"เหล็ก", fairy:"นางฟ้า",
};
export const TYPE_NAMES_JA = {
  normal:"ノーマル", fire:"ほのお", water:"みず", electric:"でんき",
  grass:"くさ", ice:"こおり", fighting:"かくとう", poison:"どく",
  ground:"じめん", flying:"ひこう", psychic:"エスパー", bug:"むし",
  rock:"いわ", ghost:"ゴースト", dragon:"ドラゴン", dark:"あく",
  steel:"はがね", fairy:"フェアリー",
};
export const ALL_TYPES = Object.keys(TYPE_COLORS);

export const STAT_LABELS = {
  hp:"HP", attack:"ATK", defense:"DEF",
  "special-attack":"SP.ATK", "special-defense":"SP.DEF", speed:"SPD",
};

// ─── Type Effectiveness: TYPE_OFFENSE[attacker][defender] = multiplier ────────
export const TYPE_OFFENSE = {
  normal:   { rock:.5, ghost:0, steel:.5 },
  fire:     { fire:.5, water:.5, grass:2, ice:2, bug:2, rock:.5, dragon:.5, steel:2 },
  water:    { fire:2, water:.5, grass:.5, ground:2, rock:2, dragon:.5 },
  electric: { water:2, electric:.5, grass:.5, ground:0, flying:2, dragon:.5 },
  grass:    { fire:.5, water:2, grass:.5, poison:.5, ground:2, flying:.5, bug:.5, rock:2, dragon:.5, steel:.5 },
  ice:      { fire:.5, water:.5, grass:2, ice:.5, ground:2, flying:2, dragon:2, steel:.5 },
  fighting: { normal:2, ice:2, poison:.5, flying:.5, psychic:.5, bug:.5, rock:2, ghost:0, dark:2, steel:2, fairy:.5 },
  poison:   { grass:2, poison:.5, ground:.5, rock:.5, ghost:.5, steel:0, fairy:2 },
  ground:   { fire:2, electric:2, grass:.5, poison:2, flying:0, bug:.5, rock:2, steel:2 },
  flying:   { electric:.5, grass:2, fighting:2, bug:2, rock:.5, steel:.5 },
  psychic:  { fighting:2, poison:2, psychic:.5, dark:0, steel:.5 },
  bug:      { fire:.5, grass:2, fighting:.5, flying:.5, psychic:2, ghost:.5, dark:2, steel:.5, fairy:.5 },
  rock:     { fire:2, ice:2, fighting:.5, ground:.5, flying:2, bug:2, steel:.5 },
  ghost:    { normal:0, psychic:2, ghost:2, dark:.5 },
  dragon:   { dragon:2, steel:.5, fairy:0 },
  dark:     { fighting:.5, psychic:2, ghost:2, dark:.5, fairy:.5 },
  steel:    { fire:.5, water:.5, electric:.5, ice:2, rock:2, steel:.5, fairy:2 },
  fairy:    { fire:.5, fighting:2, poison:.5, dragon:2, dark:2, steel:.5 },
};

// ─── Move Learnset version groups ─────────────────────────────────────────────
export const VERSION_ORDER = [
  "scarlet-violet","sword-shield","ultra-sun-ultra-moon","sun-moon",
  "omega-ruby-alpha-sapphire","x-y","black-2-white-2","black-white",
  "heartgold-soulsilver","platinum","diamond-pearl","firered-leafgreen",
  "ruby-sapphire","colosseum","xd","crystal","gold-silver","yellow","red-blue",
];
export const VERSION_LABELS = {
  "scarlet-violet":"Scarlet / Violet", "sword-shield":"Sword / Shield",
  "ultra-sun-ultra-moon":"Ultra Sun / Ultra Moon", "sun-moon":"Sun / Moon",
  "omega-ruby-alpha-sapphire":"Omega Ruby / Alpha Sapphire", "x-y":"X / Y",
  "black-2-white-2":"Black 2 / White 2", "black-white":"Black / White",
  "heartgold-soulsilver":"HeartGold / SoulSilver", "platinum":"Platinum",
  "diamond-pearl":"Diamond / Pearl", "firered-leafgreen":"FireRed / LeafGreen",
  "ruby-sapphire":"Ruby / Sapphire", "colosseum":"Colosseum",
  "xd":"XD", "crystal":"Crystal", "gold-silver":"Gold / Silver",
  "yellow":"Yellow", "red-blue":"Red / Blue",
};

// ─── Move Categories ──────────────────────────────────────────────────────────
export const CAT_CONFIG = {
  physical:{ en:"Physical", th:"กายภาพ", ja:"物理", color:"#C03028", icon:"💥" },
  special: { en:"Special",  th:"พิเศษ",  ja:"特殊",  color:"#6890F0", icon:"✨" },
  status:  { en:"Status",   th:"สถานะ",  ja:"変化",  color:"#A8A878", icon:"○"  },
};

// ─── Pokeballs (Pokemon GO style) ─────────────────────────────────────────────
// multiplier = base catch rate multiplier. specialEffect = bonus condition.
export const POKEBALLS = [
  { id:"poke-ball",    name:"Poké Ball",    nameTH:"มอนสเตอร์บอล",     nameJA:"モンスターボール",
    mult:1,    icon:"⚪", color:"#dc2626", desc:"Standard ball" },
  { id:"great-ball",   name:"Great Ball",   nameTH:"ซูเปอร์บอล",       nameJA:"スーパーボール",
    mult:1.5,  icon:"🔵", color:"#2563eb", desc:"1.5× catch rate" },
  { id:"ultra-ball",   name:"Ultra Ball",   nameTH:"ไฮเปอร์บอล",       nameJA:"ハイパーボール",
    mult:2,    icon:"🟡", color:"#facc15", desc:"2× catch rate" },
  { id:"master-ball",  name:"Master Ball",  nameTH:"มาสเตอร์บอล",      nameJA:"マスターボール",
    mult:255,  icon:"🟣", color:"#a855f7", desc:"Always catches!" },
  { id:"premier-ball", name:"Premier Ball", nameTH:"พรีเมียร์บอล",     nameJA:"プレミアボール",
    mult:1,    icon:"⚪", color:"#f3f4f6", desc:"Same as Poké Ball" },
  { id:"quick-ball",   name:"Quick Ball",   nameTH:"ควิกบอล",          nameJA:"クイックボール",
    mult:4,    icon:"⚡", color:"#eab308", desc:"4× on first turn" },
  { id:"dusk-ball",    name:"Dusk Ball",    nameTH:"ดัสก์บอล",         nameJA:"ダークボール",
    mult:3,    icon:"🌑", color:"#1f2937", desc:"3× at night/caves" },
  { id:"timer-ball",   name:"Timer Ball",   nameTH:"ไทเมอร์บอล",       nameJA:"タイマーボール",
    mult:2.5,  icon:"⏰", color:"#f97316", desc:"Better over time" },
  { id:"net-ball",     name:"Net Ball",     nameTH:"เน็ตบอล",          nameJA:"ネットボール",
    mult:3.5,  icon:"🟢", color:"#0d9488", desc:"3.5× on Bug/Water" },
  { id:"dive-ball",    name:"Dive Ball",    nameTH:"ไดฟ์บอล",          nameJA:"ダイブボール",
    mult:3.5,  icon:"🌊", color:"#06b6d4", desc:"3.5× underwater" },
  { id:"luxury-ball",  name:"Luxury Ball",  nameTH:"ลักชัวรี่บอล",     nameJA:"ゴージャスボール",
    mult:1,    icon:"⚫", color:"#000",     desc:"Boosts friendship" },
  { id:"heal-ball",    name:"Heal Ball",    nameTH:"ฮีลบอล",           nameJA:"ヒールボール",
    mult:1,    icon:"💗", color:"#ec4899", desc:"Heals on catch" },
];

// ─── Berries (affect catch chance) ────────────────────────────────────────────
// boost = % boost to catch chance, escape = % reduction in escape chance
export const BERRIES = [
  { id:"none",          name:"No Berry",      nameTH:"ไม่ใช้",        nameJA:"なし",
    boost:0,   icon:"➖", color:"#94a3b8", desc:"No berry effect" },
  { id:"razz",          name:"Razz Berry",    nameTH:"ราซเบอร์รี่",   nameJA:"ズリのみ",
    boost:50,  icon:"🍓", color:"#dc2626", desc:"+50% catch rate" },
  { id:"silver-razz",   name:"Silver Razz",   nameTH:"ราซเบอร์รี่เงิน", nameJA:"シルバーズリ",
    boost:80,  icon:"🍒", color:"#94a3b8", desc:"+80% catch rate" },
  { id:"golden-razz",   name:"Golden Razz",   nameTH:"ราซเบอร์รี่ทอง", nameJA:"ゴールデンズリ",
    boost:150, icon:"🍯", color:"#facc15", desc:"+150% catch rate!" },
  { id:"nanab",         name:"Nanab Berry",   nameTH:"นานับเบอร์รี่",  nameJA:"ナナのみ",
    boost:20,  icon:"🍌", color:"#fde047", desc:"Calms Pokémon (+20%)" },
  { id:"pinap",         name:"Pinap Berry",   nameTH:"ปินาปเบอร์รี่",  nameJA:"パイルのみ",
    boost:0,   icon:"🍍", color:"#fbbf24", desc:"2× rewards (no catch boost)" },
];

// ─── Who's That Difficulty ────────────────────────────────────────────────────
export const DIFFICULTIES = [
  { id:"easy",   en:"Easy",   th:"ง่าย",   ja:"かんたん",
    choices:4,  silSize:240, scoreMul:1,  hintCost:0,  lives:5, time:0 },
  { id:"normal", en:"Normal", th:"ปกติ",  ja:"ふつう",
    choices:4,  silSize:200, scoreMul:2,  hintCost:1,  lives:3, time:0 },
  { id:"hard",   en:"Hard",   th:"ยาก",   ja:"むずかしい",
    choices:6,  silSize:160, scoreMul:3,  hintCost:2,  lives:3, time:15 },
  { id:"expert", en:"Expert", th:"โหด",   ja:"エキスパート",
    choices:8,  silSize:130, scoreMul:5,  hintCost:5,  lives:1, time:10 },
];

// ─── Type Sound config (Web Audio chord per type) ─────────────────────────────
export const TYPE_SOUND = {
  fire:     { freqs:[165,220,277],  wave:"sawtooth", duration:1.4 },
  water:    { freqs:[196,294,392],  wave:"sine",     duration:1.8 },
  electric: { freqs:[440,660,880],  wave:"square",   duration:0.9 },
  grass:    { freqs:[261,329,392],  wave:"triangle", duration:1.6 },
  ice:      { freqs:[523,659,784],  wave:"sine",     duration:1.6 },
  fighting: { freqs:[98,147,196],   wave:"sawtooth", duration:1.2 },
  poison:   { freqs:[185,247,311],  wave:"triangle", duration:1.6 },
  ground:   { freqs:[82,110,165],   wave:"sawtooth", duration:1.5 },
  flying:   { freqs:[330,440,587],  wave:"sine",     duration:1.6 },
  psychic:  { freqs:[311,415,554],  wave:"sine",     duration:1.8 },
  bug:      { freqs:[220,277,370],  wave:"triangle", duration:1.4 },
  rock:     { freqs:[98,131,196],   wave:"square",   duration:1.3 },
  ghost:    { freqs:[147,196,247],  wave:"triangle", duration:2.0 },
  dragon:   { freqs:[110,165,247],  wave:"sawtooth", duration:1.8 },
  dark:     { freqs:[73,98,147],    wave:"triangle", duration:1.8 },
  steel:    { freqs:[247,370,494],  wave:"square",   duration:1.2 },
  fairy:    { freqs:[392,523,698],  wave:"sine",     duration:1.6 },
  normal:   { freqs:[261,329,392],  wave:"sine",     duration:1.4 },
};

// ─── i18n: All UI strings ─────────────────────────────────────────────────────
export const STRINGS = {
  en: {
    subtitle:"All Regions", searchPlaceholder:"Search name or ID…",
    allTypes:"All Types", loading:"Loading…",
    loadMoreBtn:(n)=>`⚡ Load More (${n.toLocaleString()} left)`,
    noResult:"No Pokémon Found", noResultSub:"Try a different name or change the filter",
    of:"of", loaded:"loaded",
    resultsFor:(q)=>`Results for "${q}"`,
    typeHeading:(t,n)=>`${t.toUpperCase()} — ${n} Pokémon`,
    height:"Height", weight:"Weight", baseExp:"Base EXP",
    baseStats:"Base Stats", evYield:"EV Yield", total:"Total",
    abilities:"Abilities", details:"Details",
    captureRate:"Capture Rate", happiness:"Happiness", growth:"Growth",
    sprites:"Sprites", evolutions:"Evolutions", matchup:"Matchup", breeding:"Breeding",
    evoLoading:"Loading evolution chain…",
    front:"Front", back:"Back", shiny:"Shiny ✦", shinyBack:"Shiny Back",
    female:"Female", femaleBack:"Female Back", hiddenAbility:"(hidden)",
    tabs:["📊 Stats","🛡️ Matchup","⚡ Abilities","🌱 Evolutions","🎯 Moves","📋 GO Moves","🎨 Sprites","🥚 Breeding","🗺️ Locations"],
    loadingThaiNames:"Loading Thai names…", loadingJpNames:"Loading Japanese names…",
    immune:"Immune", weak:"Weak", resist:"Resist", normal2:"Normal",
    eggGroups:"Egg Groups", genderRatio:"Gender Ratio", hatchTime:"Hatch Steps",
    male:"♂ Male", female2:"♀ Female", genderless:"Genderless", steps:"steps",
    playCry:"Play cry", viewMode:"View", sizeView:"Size", sizeVs:"Size vs Human",
    avgHeight:"Avg. human",
    pokedex:"Pokédex", whosThat:"Who's That?", whosThatTitle:"Who's That Pokémon?",
    whosThatSub:"Guess the silhouette!",
    score:"Score", streak:"Streak", reveal:"Reveal", nextPokemon:"Next",
    correct:"Correct!", wrong:"Wrong!", itWas:"It was",
    teamBuilder:"Team", teamTitle:"Build Your Team", teamSub:"Pick 6 Pokémon",
    addPokemon:"Add Pokémon", teamWeak:"Team Weaknesses", teamResist:"Team Resistances",
    teamAvg:"Average Stats", emptySlot:"Empty",
    locations:"Locations", noLocations:"No location data — this Pokémon may not be wild-catchable",
    dailyPokemon:"Daily Pokémon", visitStreak:"Visit Streak",
    sound:"Sound", catchBtn:"Throw Pokeball", catching:"Catching…",
    caught:"Gotcha!", escaped:"Oh no, it broke free!",
    chance:"chance", level:"Lv", method:"Method",
    settings:"Settings", language:"Language", about:"About",
    compare:"Compare", compareTitle:"Compare Pokémon", compareSub:"Select 2 Pokémon to compare",
    selectPokemon:"Select Pokémon", winner:"Winner", tie:"Tie",
    catchSimulator:"Catch Simulator", chooseBall:"Choose a Pokéball", chooseBerry:"Use a Berry?",
    catchChance:"Catch Chance", throwIt:"Throw it!", tryAgain:"Try Again",
    lives:"Lives", combo:"Combo", hint:"Hint", useHint:"Use Hint", noLives:"No lives left!",
    difficulty:"Difficulty", filterByType:"Filter by Type", playAgain:"Play Again",
    finalScore:"Final Score", bestScore:"Best", timeUp:"Time's up!",
    typeHint:"It's a ", typeAdvantage:"Type Advantage", noAdvantage:"Even matchup",
    higherStats:"Higher Stats", bigger:"Bigger", heavier:"Heavier", faster:"Faster",
    favorites:"Favorites", favFilter:"My Favorites",
    favEmpty:"No favorites yet", favEmptySub:"Tap ♡ on any Pokémon card to save it here",
    addFav:"Add to favorites", removeFav:"Remove from favorites",
  },
  th: {
    subtitle:"ทุกภูมิภาค", searchPlaceholder:"ค้นหาชื่อหรือ ID…",
    allTypes:"ทุกประเภท", loading:"กำลังโหลด…",
    loadMoreBtn:(n)=>`⚡ โหลดเพิ่ม (เหลือ ${n.toLocaleString()} ตัว)`,
    noResult:"ไม่พบโปเกมอน", noResultSub:"ลองค้นหาด้วยชื่ออื่น หรือเปลี่ยนตัวกรอง",
    of:"จาก", loaded:"โหลดแล้ว",
    resultsFor:(q)=>`ผลลัพธ์ "${q}"`,
    typeHeading:(t,n)=>`ประเภท ${t.toUpperCase()} — ${n} ตัว`,
    height:"ความสูง", weight:"น้ำหนัก", baseExp:"EXP พื้นฐาน",
    baseStats:"สถิติพื้นฐาน", evYield:"EV ที่ได้รับ", total:"รวม",
    abilities:"ความสามารถ", details:"รายละเอียด",
    captureRate:"อัตราจับ", happiness:"ความสุข", growth:"การเติบโต",
    sprites:"สไปรท์", evolutions:"วิวัฒนาการ", matchup:"ตารางประเภท", breeding:"การเพาะพันธุ์",
    evoLoading:"กำลังโหลดสายวิวัฒนาการ…",
    front:"หน้า", back:"หลัง", shiny:"ชายนี่ ✦", shinyBack:"ชายนี่ (หลัง)",
    female:"เพศเมีย", femaleBack:"เพศเมีย (หลัง)", hiddenAbility:"(ซ่อน)",
    tabs:["📊 สถิติ","🛡️ ตารางประเภท","⚡ ความสามารถ","🌱 วิวัฒนาการ","🎯 สกิล","📋 GO Moves","🎨 สไปรท์","🥚 เพาะพันธุ์","🗺️ แหล่งที่พบ"],
    loadingThaiNames:"กำลังโหลดชื่อภาษาไทย…", loadingJpNames:"กำลังโหลดชื่อภาษาญี่ปุ่น…",
    immune:"ภูมิคุ้มกัน", weak:"อ่อนแอ", resist:"ทนทาน", normal2:"ปกติ",
    eggGroups:"กลุ่มไข่", genderRatio:"อัตราส่วนเพศ", hatchTime:"ก้าวฟักไข่",
    male:"♂ ตัวผู้", female2:"♀ ตัวเมีย", genderless:"ไม่มีเพศ", steps:"ก้าว",
    playCry:"ฟังเสียงร้อง", viewMode:"มุมมอง", sizeView:"ขนาด", sizeVs:"ขนาดเทียบกับคน",
    avgHeight:"คนเฉลี่ย",
    pokedex:"โปเกเด็กซ์", whosThat:"นี่ใคร?", whosThatTitle:"โปเกมอนตัวนี้ใคร?",
    whosThatSub:"ทายภาพเงา!",
    score:"คะแนน", streak:"สตรีค", reveal:"เฉลย", nextPokemon:"ตัวต่อไป",
    correct:"ถูกต้อง!", wrong:"ผิดครับ!", itWas:"คำตอบคือ",
    teamBuilder:"ทีม", teamTitle:"สร้างทีมของคุณ", teamSub:"เลือก 6 ตัว",
    addPokemon:"เพิ่มโปเกมอน", teamWeak:"จุดอ่อนของทีม", teamResist:"จุดทนทาน",
    teamAvg:"สเตทเฉลี่ย", emptySlot:"ว่าง",
    locations:"แหล่งที่พบ", noLocations:"ไม่พบข้อมูลแหล่งที่พบ — โปเกมอนนี้อาจจับในป่าไม่ได้",
    dailyPokemon:"โปเกมอนประจำวัน", visitStreak:"เข้าต่อเนื่อง",
    sound:"เสียง", catchBtn:"ขว้างมอนสเตอร์บอล", catching:"กำลังจับ…",
    caught:"ได้แล้ว!", escaped:"แย่จัง หลุดมือไป!",
    chance:"โอกาส", level:"เลเวล", method:"วิธี",
    settings:"ตั้งค่า", language:"ภาษา", about:"เกี่ยวกับ",
    compare:"เปรียบเทียบ", compareTitle:"เปรียบเทียบโปเกมอน", compareSub:"เลือก 2 ตัวเพื่อเปรียบเทียบ",
    selectPokemon:"เลือกโปเกมอน", winner:"ผู้ชนะ", tie:"เสมอ",
    catchSimulator:"จำลองการจับ", chooseBall:"เลือกบอล", chooseBerry:"ใช้เบอร์รี่?",
    catchChance:"โอกาสจับ", throwIt:"ขว้างเลย!", tryAgain:"ลองอีกครั้ง",
    lives:"ชีวิต", combo:"คอมโบ", hint:"ใบ้", useHint:"ใช้ใบ้", noLives:"หมดชีวิตแล้ว!",
    difficulty:"ระดับ", filterByType:"กรองตามประเภท", playAgain:"เล่นใหม่",
    finalScore:"คะแนนสุดท้าย", bestScore:"สถิติสูงสุด", timeUp:"หมดเวลา!",
    typeHint:"เป็น ", typeAdvantage:"ได้เปรียบ", noAdvantage:"เสมอกัน",
    higherStats:"สเตทดีกว่า", bigger:"ตัวใหญ่กว่า", heavier:"หนักกว่า", faster:"เร็วกว่า",
    favorites:"รายการโปรด", favFilter:"รายการโปรด",
    favEmpty:"ยังไม่มีรายการโปรด", favEmptySub:"กด ♡ ที่การ์ดโปเกมอนเพื่อบันทึก",
    addFav:"เพิ่มในรายการโปรด", removeFav:"ลบออกจากรายการโปรด",
  },
  ja: {
    subtitle:"全地方", searchPlaceholder:"名前またはIDで検索…",
    allTypes:"すべてのタイプ", loading:"読み込み中…",
    loadMoreBtn:(n)=>`⚡ さらに読み込む (残り${n.toLocaleString()}匹)`,
    noResult:"ポケモンが見つかりません", noResultSub:"別の名前やフィルターをお試しください",
    of:"中", loaded:"読み込み済み",
    resultsFor:(q)=>`「${q}」の結果`,
    typeHeading:(t,n)=>`${t.toUpperCase()} — ${n}匹`,
    height:"高さ", weight:"重さ", baseExp:"基礎EXP",
    baseStats:"種族値", evYield:"努力値", total:"合計",
    abilities:"特性", details:"詳細",
    captureRate:"捕獲率", happiness:"なつき度", growth:"成長速度",
    sprites:"スプライト", evolutions:"進化", matchup:"タイプ相性", breeding:"タマゴ",
    evoLoading:"進化チェーンを読み込み中…",
    front:"表", back:"後ろ", shiny:"色違い ✦", shinyBack:"色違い（後ろ）",
    female:"メス", femaleBack:"メス（後ろ）", hiddenAbility:"(夢特性)",
    tabs:["📊 種族値","🛡️ タイプ相性","⚡ 特性","🌱 進化","🎯 わざ","📋 GO技","🎨 スプライト","🥚 タマゴ","🗺️ 生息地"],
    loadingThaiNames:"タイ語名を読み込み中…", loadingJpNames:"日本語名を読み込み中…",
    immune:"無効", weak:"弱点", resist:"半減", normal2:"等倍",
    eggGroups:"タマゴグループ", genderRatio:"性別比率", hatchTime:"孵化歩数",
    male:"♂ オス", female2:"♀ メス", genderless:"性別なし", steps:"歩",
    playCry:"鳴き声", viewMode:"表示", sizeView:"サイズ", sizeVs:"人間との比較",
    avgHeight:"平均身長",
    pokedex:"ポケデックス", whosThat:"だれだ?", whosThatTitle:"このポケモンはだれだ?",
    whosThatSub:"シルエットを当てよう!",
    score:"スコア", streak:"連続正解", reveal:"答え", nextPokemon:"次へ",
    correct:"正解!", wrong:"はずれ!", itWas:"答えは",
    teamBuilder:"チーム", teamTitle:"チームを作ろう", teamSub:"6匹選ぼう",
    addPokemon:"追加", teamWeak:"チームの弱点", teamResist:"チームの耐性",
    teamAvg:"平均種族値", emptySlot:"空き",
    locations:"生息地", noLocations:"生息地データなし — 野生では捕獲できないかも",
    dailyPokemon:"今日のポケモン", visitStreak:"連続訪問",
    sound:"効果音", catchBtn:"モンスターボールを投げる", catching:"捕獲中…",
    caught:"やったー!", escaped:"逃げられた！",
    chance:"確率", level:"Lv", method:"方法",
    settings:"設定", language:"言語", about:"概要",
    compare:"比較", compareTitle:"ポケモン比較", compareSub:"2匹選んで比較しよう",
    selectPokemon:"選ぶ", winner:"勝者", tie:"引き分け",
    catchSimulator:"捕獲シミュレーター", chooseBall:"ボールを選ぶ", chooseBerry:"きのみを使う?",
    catchChance:"捕獲確率", throwIt:"投げる!", tryAgain:"もう一度",
    lives:"ライフ", combo:"コンボ", hint:"ヒント", useHint:"ヒントを使う", noLives:"ライフ切れ！",
    difficulty:"難易度", filterByType:"タイプで絞り込み", playAgain:"もう一度",
    finalScore:"最終スコア", bestScore:"最高記録", timeUp:"時間切れ!",
    typeHint:"タイプ: ", typeAdvantage:"有利", noAdvantage:"互角",
    higherStats:"種族値が高い", bigger:"大きい", heavier:"重い", faster:"速い",
    favorites:"お気に入り", favFilter:"お気に入り",
    favEmpty:"お気に入りがありません", favEmptySub:"カードの ♡ を押して保存しよう",
    addFav:"お気に入りに追加", removeFav:"お気に入りから削除",
  },
};
