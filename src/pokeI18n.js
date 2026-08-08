// Thai/Japanese values for PokéAPI fields that the API itself does not
// localise into Thai (it has ja/ko/zh/… but never th). Anything missing
// falls back to the tidied English string, so partial tables are safe.

const title = (s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// ─── Egg groups (complete: 15 groups) ────────────────────────────────────────
const EGG_GROUP_TH = {
  monster: "สัตว์ประหลาด", water1: "น้ำ 1", water2: "น้ำ 2", water3: "น้ำ 3",
  bug: "แมลง", flying: "นก", ground: "ทุ่งหญ้า", fairy: "นางฟ้า",
  plant: "พืช", humanshape: "คล้ายมนุษย์", mineral: "แร่ธาตุ",
  indeterminate: "ไร้รูปร่าง", ditto: "ดิตโต้", dragon: "มังกร",
  "no-eggs": "ไม่มีไข่",
};
const EGG_GROUP_JA = {
  monster: "かいじゅう", water1: "水中1", water2: "水中2", water3: "水中3",
  bug: "虫", flying: "飛行", ground: "陸上", fairy: "妖精",
  plant: "植物", humanshape: "人型", mineral: "鉱物",
  indeterminate: "不定形", ditto: "メタモン", dragon: "ドラゴン",
  "no-eggs": "タマゴ未発見",
};

// The API keys are internal ("humanshape", "indeterminate"), not the names
// the games use — so English needs a table of its own too.
const EGG_GROUP_EN = {
  monster: "Monster", water1: "Water 1", water2: "Water 2", water3: "Water 3",
  bug: "Bug", flying: "Flying", ground: "Field", fairy: "Fairy",
  plant: "Grass", humanshape: "Human-Like", mineral: "Mineral",
  indeterminate: "Amorphous", ditto: "Ditto", dragon: "Dragon",
  "no-eggs": "No Eggs Discovered",
};

export const eggGroupName = (key, lang) =>
  (lang === "th" ? EGG_GROUP_TH[key] : lang === "ja" ? EGG_GROUP_JA[key] : EGG_GROUP_EN[key])
  ?? title(key);

// ─── Abilities (Thai) ───────────────────────────────────────────────────────
// Covers the abilities you meet most often; the rest fall back to English,
// which is also how most Thai players refer to the rarer ones.
const ABILITY_TH = {
  overgrow: "พลังพืชล้น", blaze: "เพลิงลุก", torrent: "กระแสน้ำเชี่ยว",
  swarm: "ฝูงแมลง", "shield-dust": "ละอองเกราะ", "shed-skin": "ลอกคราบ",
  "compound-eyes": "ตาประกอบ", "tinted-lens": "เลนส์สีจาง",
  "run-away": "หนีเก่ง", "keen-eye": "ตาไว", "hyper-cutter": "ก้ามคม",
  static: "ไฟฟ้าสถิต", "lightning-rod": "สายล่อฟ้า", "volt-absorb": "ดูดซับไฟฟ้า",
  "water-absorb": "ดูดซับน้ำ", "flash-fire": "รับไฟ", levitate: "ลอยตัว",
  "sand-veil": "ม่านทราย", "snow-cloak": "ม่านหิมะ", "poison-point": "หนามพิษ",
  rivalry: "ชิงดีชิงเด่น", intimidate: "ข่มขวัญ", "cute-charm": "เสน่ห์น่ารัก",
  sturdy: "อึดทน", "rock-head": "หัวหิน", chlorophyll: "คลอโรฟิลล์",
  "solar-power": "พลังแสงอาทิตย์", "rain-dish": "รับน้ำฝน", "swift-swim": "ว่ายน้ำไว",
  drizzle: "เรียกฝน", drought: "เรียกแดด", "sand-stream": "เรียกพายุทราย",
  "snow-warning": "เรียกหิมะ", "thick-fat": "ไขมันหนา", guts: "ใจสู้",
  hustle: "เร่งพลัง", "serene-grace": "พรอันสงบ", "natural-cure": "รักษาตัวเอง",
  synchronize: "ซิงโครไนซ์", trace: "ลอกเลียน", download: "ดาวน์โหลด",
  adaptability: "ปรับตัว", technician: "ช่างชำนาญ", "skill-link": "ต่อเนื่อง",
  "iron-fist": "หมัดเหล็ก", "mold-breaker": "ทำลายกรอบ", scrappy: "ไม่เกรงกลัว",
  "no-guard": "ไร้การป้องกัน", unaware: "ไม่รู้ตัว", simple: "เรียบง่าย",
  klutz: "ซุ่มซ่าม", "tangled-feet": "เท้าพันกัน", "own-tempo": "จังหวะตัวเอง",
  "inner-focus": "สมาธิ", insomnia: "นอนไม่หลับ", "vital-spirit": "จิตใจแกร่ง",
  immunity: "ภูมิคุ้มกัน", limber: "ตัวอ่อน", "water-veil": "ม่านน้ำ",
  "magma-armor": "เกราะหินหลอม", oblivious: "เรื่อยเปื่อย", soundproof: "กันเสียง",
  filter: "ตัวกรอง", "solid-rock": "หินแข็ง", "battle-armor": "เกราะรบ",
  "shell-armor": "เกราะเปลือก", "wonder-guard": "เกราะมหัศจรรย์",
  pressure: "กดดัน", "marvel-scale": "เกล็ดมหัศจรรย์", "clear-body": "กายใส",
  "white-smoke": "ควันขาว", "big-pecks": "อกผาย", "sheer-force": "พลังล้วน",
  reckless: "บ้าระห่ำ", defiant: "ท้าทาย", competitive: "ไม่ยอมแพ้",
  moxie: "ได้ใจ", "speed-boost": "เร่งความเร็ว", regenerator: "ฟื้นฟู",
  "poison-heal": "พิษบำบัด", "magic-guard": "เกราะเวทมนตร์", unburden: "ปลดภาระ",
  "flame-body": "กายเพลิง", "effect-spore": "สปอร์พิเศษ", illuminate: "เปล่งแสง",
  pickup: "เก็บของ", "honey-gather": "เก็บน้ำผึ้ง", frisk: "ค้นตัว",
  anticipation: "ลางสังหรณ์", forewarn: "เตือนล่วงหน้า", "super-luck": "โชคดีสุดๆ",
  sniper: "มือปืนแม่น", analytic: "วิเคราะห์", prankster: "จอมกลั่นแกล้ง",
  infiltrator: "แทรกซึม", justified: "ธรรมะชนะ", rattled: "ขวัญเสีย",
  "weak-armor": "เกราะเปราะ", "heavy-metal": "โลหะหนัก", "light-metal": "โลหะเบา",
  multiscale: "เกล็ดหลายชั้น", "toxic-boost": "พิษเสริมพลัง",
  "flare-boost": "ไฟเสริมพลัง", harvest: "เก็บเกี่ยว", telepathy: "โทรจิต",
  moody: "อารมณ์แปรปรวน", overcoat: "เสื้อคลุม", "poison-touch": "สัมผัสพิษ",
  "sand-rush": "พุ่งในทราย", "slush-rush": "พุ่งในหิมะ", "wonder-skin": "ผิวมหัศจรรย์",
  "sap-sipper": "ดูดยางพืช", "cursed-body": "กายต้องสาป", healer: "นักเยียวยา",
  "friend-guard": "ปกป้องเพื่อน", "iron-barbs": "หนามเหล็ก", "zen-mode": "โหมดเซน",
  "victory-star": "ดาวแห่งชัยชนะ", turboblaze: "เทอร์โบเบลซ", teravolt: "เทราโวลต์",
  "aroma-veil": "ม่านกลิ่น", "flower-veil": "ม่านดอกไม้", "cheek-pouch": "กระพุ้งแก้ม",
  protean: "เปลี่ยนธาตุ", "fur-coat": "ขนหนา", magician: "นักมายากล",
  bulletproof: "กันกระสุน", "strong-jaw": "ขากรรไกรแข็ง", refrigerate: "แช่แข็ง",
  "sweet-veil": "ม่านหวาน", "stance-change": "เปลี่ยนท่า", "gale-wings": "ปีกลมกรรโชก",
  "mega-launcher": "เมกาลันเชอร์", "grass-pelt": "ขนหญ้า", symbiosis: "พึ่งพากัน",
  "tough-claws": "เล็บแข็ง", pixilate: "แปลงร่างแฟรี่", gooey: "เหนียวเหนอะ",
  aerilate: "แปลงร่างบิน", "parental-bond": "สายใยแม่ลูก", "dark-aura": "ออร่ามืด",
  "fairy-aura": "ออร่าแฟรี่", "aura-break": "ทำลายออร่า",
  "primordial-sea": "ทะเลดึกดำบรรพ์", "desolate-land": "ดินแดนแห้งแล้ง",
  "delta-stream": "กระแสเดลตา", "water-bubble": "ฟองน้ำ", "beast-boost": "พลังอสูร",
  "grassy-surge": "สนามหญ้า", "misty-surge": "สนามหมอก",
  "electric-surge": "สนามไฟฟ้า", "psychic-surge": "สนามพลังจิต",
  "queenly-majesty": "ราชินีสง่างาม", dazzling: "พร่างพราว", merciless: "ไร้ปรานี",
  "water-compaction": "อัดตัวด้วยน้ำ", "long-reach": "ระยะไกล", "triage": "ปฐมพยาบาล",
  "galvanize": "ชุบไฟฟ้า", "libero": "ลิเบโร", "screen-cleaner": "ล้างกำบัง",
  "ice-scales": "เกล็ดน้ำแข็ง", "punk-rock": "พังก์ร็อก", "sand-spit": "พ่นทราย",
  "intrepid-sword": "ดาบอาจหาญ", "dauntless-shield": "โล่ไม่ย่อท้อ",
  "unseen-fist": "หมัดล่องหน", "quick-draw": "ชักไว", "mirror-armor": "เกราะกระจก",
  "steam-engine": "เครื่องจักรไอน้ำ", "ripen": "สุกงอม", "gorilla-tactics": "กลยุทธ์กอริลลา",
  "sharpness": "คมกริบ", "supreme-overlord": "จ้าวผู้ยิ่งใหญ่",
  "good-as-gold": "แกร่งดั่งทอง", "purifying-salt": "เกลือชำระ",
  "well-baked-body": "กายอบเกรียม", "wind-rider": "ผู้ขี่ลม", "guard-dog": "สุนัขเฝ้าบ้าน",
  "thermal-exchange": "แลกเปลี่ยนความร้อน", "toxic-debris": "เศษพิษ",
  "armor-tail": "หางเกราะ", "earth-eater": "กินดิน", "protosynthesis": "โปรโตซินเทซิส",
  "quark-drive": "ควาร์กไดรฟ์",
};

export const abilityName = (key, lang) =>
  (lang === "th" ? ABILITY_TH[key] : null) ?? title(key);

// ─── Species genus (Thai) ───────────────────────────────────────────────────
// PokéAPI's genus arrives as English ("Seed", "Lizard", "Flame"). These are
// the recurring ones; anything else keeps the English word.
const GENUS_TH = {
  "Seed": "เมล็ดพืช", "Lizard": "กิ้งก่า", "Flame": "เปลวไฟ",
  "Tiny Turtle": "เต่าน้อย", "Turtle": "เต่า", "Shellfish": "หอย",
  "Worm": "หนอน", "Cocoon": "ดักแด้", "Butterfly": "ผีเสื้อ",
  "Hairy Bug": "แมลงมีขน", "Poison Bee": "ผึ้งพิษ", "Tiny Bird": "นกน้อย",
  "Bird": "นก", "Mouse": "หนู", "Rat": "หนู", "Beak": "จมูกยาว",
  "Snake": "งู", "Cobra": "งูเห่า", "Poison Pin": "เข็มพิษ", "Drill": "สว่าน",
  "Fairy": "นางฟ้า", "Fox": "จิ้งจอก", "Balloon": "ลูกโป่ง", "Bat": "ค้างคาว",
  "Weed": "วัชพืช", "Flower": "ดอกไม้", "Mushroom": "เห็ด", "Insect": "แมลง",
  "Poison": "พิษ", "Poison Moth": "ผีเสื้อพิษ", "Mole": "ตัวตุ่น",
  "Scratch": "ข่วน", "Cat": "แมว", "Duck": "เป็ด", "Pig Monkey": "ลิงหมู",
  "Monkey": "ลิง", "Dog": "สุนัข", "Puppy": "ลูกสุนัข", "Goldfish": "ปลาทอง",
  "Tadpole": "ลูกอ๊อด", "Psi": "พลังจิต", "Superpower": "พลังเหนือมนุษย์",
  "Flycatcher": "จับแมลง", "Jellyfish": "แมงกะพรุน", "Rock": "หิน",
  "Megaton": "เมกะตัน", "Fire Horse": "ม้าไฟ", "Dopey": "เชื่องช้า",
  "Magnet": "แม่เหล็ก", "Wild Duck": "เป็ดป่า", "Twin Bird": "นกคู่",
  "Triple Bird": "นกสามหัว", "Sea Lion": "สิงโตทะเล", "Sludge": "ของเสีย",
  "Bivalve": "หอยสองฝา", "Gas": "ก๊าซ", "Shadow": "เงา", "Rock Snake": "งูหิน",
  "Hypnosis": "สะกดจิต", "River Crab": "ปูแม่น้ำ", "Pincer": "ก้ามหนีบ",
  "Ball": "ลูกบอล", "Egg": "ไข่", "Coconut": "มะพร้าว", "Lonely": "เดียวดาย",
  "Bone Keeper": "ผู้ถือกระดูก", "Kickboxing": "คิกบ็อกซิ่ง", "Punching": "หมัด",
  "Licking": "เลีย", "Poison Gas": "แก๊สพิษ", "Spikes": "หนาม", "Vine": "เถาวัลย์",
  "Parent": "พ่อแม่", "Dragon": "มังกร", "Star Shape": "รูปดาว",
  "Mysterious": "ลึกลับ", "Barrier": "กำแพง", "Mantis": "ตั๊กแตน",
  "Utensil": "ภาชนะ", "Electric": "ไฟฟ้า", "Spitfire": "พ่นไฟ",
  "Stag Beetle": "ด้วงกว่าง", "Wild Bull": "วัวป่า", "Fish": "ปลา",
  "Atrocious": "ดุร้าย", "Transport": "ขนส่ง", "Transform": "แปลงร่าง",
  "Evolution": "วิวัฒนาการ", "Lightning": "สายฟ้า", "Bubble Jet": "พ่นฟอง",
  "Virtual": "เสมือน", "Spiral": "เกลียว", "Fossil": "ฟอสซิล", "Sea": "ทะเล",
  "Freeze": "แช่แข็ง", "Genetic": "พันธุกรรม", "Guardian": "ผู้พิทักษ์",
  "Aquamouse": "หนูน้ำ", "Long Neck": "คอยาว", "Sun": "ดวงอาทิตย์",
  "Moon": "ดวงจันทร์", "Thunder": "ฟ้าผ่า", "Volcano": "ภูเขาไฟ",
  "Legendary": "ในตำนาน", "Rainbow": "สายรุ้ง", "Aurora": "แสงเหนือ",
  "Time Travel": "ข้ามเวลา", "DNA": "ดีเอ็นเอ", "Mythical": "เทพนิยาย",
  "Wish": "คำอธิษฐาน", "Gratitude": "ความกตัญญู", "Renegade": "ผู้ทรยศ",
  "Alpha": "อัลฟ่า", "Sea Otter": "นากทะเล", "Water": "น้ำ", "Grass": "หญ้า",
  "Fire": "ไฟ", "Ice": "น้ำแข็ง", "Steel": "เหล็ก", "Ghost": "ผี",
  "Sound Wave": "คลื่นเสียง", "Iron Armor": "เกราะเหล็ก",
};

export const genusName = (genus, lang) => {
  if (!genus) return null;
  if (lang !== "th") return genus;
  return GENUS_TH[genus] ?? genus;
};
