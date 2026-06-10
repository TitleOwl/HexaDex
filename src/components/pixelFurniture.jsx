// ─── pixelFurniture — hand-authored 8-bit furniture (CC0, in-house) ───
//
// A tiny pixel-art engine: each piece is a grid of palette chars rendered as
// crisp SVG rects. No network, no license worries, scales cleanly. Organized
// into Sims-style categories so you can furnish the buddy's room.

// Shared palette — keep cohesive across all pieces
const PAL = {
  ".": "none",
  o: "#2b2030", // outline
  W: "#6b4226", w: "#9c6b3f", k: "#c2925e", // wood: dark / mid / light
  F: "#f4f4f4", g: "#aeb6c2", D: "#3a3f4b", // white / gray / dark
  r: "#e2574c", R: "#b23b32",               // red / dark red
  b: "#4a90d9", B: "#2f6cb0",               // blue / dark blue
  G: "#5bbf6a", N: "#3a8a47",               // green / dark green
  y: "#f6d65b",                              // yellow
  p: "#f4a0c0", P: "#d96f9c",               // pink / dark pink
  u: "#9b6bd6",                              // purple
  c: "#6fdccb",                              // cyan
  e: "#9bd6ff",                              // glass / sky
  K: "#21232b",                              // near-black
};

// Render a pixel grid as crisp SVG. Rows may be ragged; width = longest row.
export function PixelArt({ rows, scale = 4, pixel = 1, style, className }) {
  const h = rows.length;
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const rects = [];
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const c = PAL[row[x]];
      if (c && c !== "none") {
        rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={pixel} height={pixel} fill={c} />);
      }
    }
  }
  return (
    <svg
      width={w * scale} height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      className={className}
      style={{ display: "block", ...style }}
    >
      {rects}
    </svg>
  );
}

// ─── Furniture catalog ───
// cat: living | bed | plant | decor    pos: room placement    z: depth
export const FURNITURE = [
  // ── Living room ──
  { id: "sofa", cat: "living", th: "โซฟา", en: "Sofa", scale: 4, z: 2, pos: { left: "2%", bottom: "8px" }, rows: [
    "..oooooooooo..",
    ".orrrrrrrrrro.",
    "orrrrrrrrrrrro",
    "orRRRRRRRRRRRo",
    "orRRRRRRRRRRRo",
    "orrrrrrrrrrrro",
    ".W........W..",
  ]},
  { id: "tv", cat: "living", th: "ทีวี", en: "TV", scale: 4, z: 2, pos: { left: "30%", bottom: "8px" }, rows: [
    "oooooooooo",
    "oDDDDDDDDo",
    "oDeeeeeeDo",
    "oDeeeeeeDo",
    "oDDDDDDDDo",
    "oooooooooo",
    "..oo..oo..",
  ]},
  { id: "table", cat: "living", th: "โต๊ะ", en: "Table", scale: 4, z: 4, pos: { right: "30%", bottom: "8px" }, rows: [
    ".kkkkkkkk.",
    "kkkkkkkkkk",
    "oooooooooo",
    "..W....W..",
    "..W....W..",
    "..o....o..",
  ]},
  { id: "lamp", cat: "living", th: "โคมไฟ", en: "Lamp", scale: 4, z: 2, pos: { right: "16%", bottom: "8px" }, rows: [
    "..yyyy..",
    ".yyyyyy.",
    "yyyyyyyy",
    "..oooo..",
    "...WW...",
    "...WW...",
    "...WW...",
    "..oooo..",
  ]},
  { id: "shelf", cat: "living", th: "ชั้นหนังสือ", en: "Bookshelf", scale: 4, z: 2, pos: { right: "2%", bottom: "8px" }, rows: [
    "oooooooo",
    "oWWWWWWo",
    "orbGyrbo",
    "oWWWWWWo",
    "oGyrbGyo",
    "oWWWWWWo",
    "obrGybro",
    "oWWWWWWo",
  ]},
  { id: "rug", cat: "living", th: "พรม", en: "Rug", scale: 5, z: 1, pos: { left: "50%", bottom: "3px", transform: "translateX(-50%)" }, rows: [
    ".pPPPPPPPPp.",
    "pPpppppppppP",
    "PppPPPPPPppP",
    "pPpppppppppP",
    ".pPPPPPPPPp.",
  ]},

  // ── Bedroom ──
  { id: "bed", cat: "bed", th: "เตียง", en: "Bed", scale: 4, z: 2, pos: { left: "2%", bottom: "8px" }, rows: [
    ".oooooooooooo.",
    "oFFFobbbbbbbbo",
    "oFFFobbbbbbbbo",
    "obbbbbbbbbbbbo",
    "obbbbbbbbbbbbo",
    ".W..........W.",
  ]},
  { id: "dresser", cat: "bed", th: "ตู้ลิ้นชัก", en: "Dresser", scale: 4, z: 2, pos: { right: "4%", bottom: "8px" }, rows: [
    "oooooooo",
    "owwwwwwo",
    "owKwwKwo",
    "owwwwwwo",
    "owKwwKwo",
    "owwwwwwo",
    "o.o..o.o",
  ]},
  { id: "plush", cat: "bed", th: "ตุ๊กตา", en: "Plushie", scale: 4, z: 4, pos: { left: "38%", bottom: "8px" }, rows: [
    "..oooo..",
    ".oyyyyo.",
    "oyKyyKyo",
    "oyyyyyyo",
    "oprKKrpo",
    ".oyyyyo.",
    "..oooo..",
  ]},

  // ── Plants ──
  { id: "plant", cat: "plant", th: "ต้นไม้", en: "Plant", scale: 4, z: 2, pos: { left: "20%", bottom: "8px" }, rows: [
    "..GNG..",
    ".GNGNG.",
    "GNGNGNG",
    ".GNGNG.",
    "..ooo..",
    "..wkw..",
    "..www..",
    "..ooo..",
  ]},
  { id: "flower", cat: "plant", th: "ดอกไม้", en: "Flower", scale: 4, z: 4, pos: { right: "24%", bottom: "8px" }, rows: [
    ".p.p.",
    "ppppp",
    ".pyp.",
    "..G..",
    ".NGN.",
    "..G..",
    ".ooo.",
    ".wkw.",
    ".ooo.",
  ]},
  { id: "cactus", cat: "plant", th: "กระบองเพชร", en: "Cactus", scale: 4, z: 2, pos: { left: "38%", bottom: "8px" }, rows: [
    "..G....",
    "..G.G..",
    "G.G.G..",
    "G.GGG..",
    "GGG.G..",
    "..G....",
    ".ooo...",
    ".wkw...",
    ".ooo...",
  ]},

  // ── Decor (wall) ──
  { id: "painting", cat: "decor", th: "ภาพวาด", en: "Painting", scale: 4, z: 1, pos: { left: "8%", top: "12px" }, rows: [
    "oooooo",
    "oeybeo",
    "obeyeo",
    "oyebeo",
    "oooooo",
  ]},
  { id: "clock", cat: "decor", th: "นาฬิกา", en: "Clock", scale: 4, z: 1, pos: { right: "10%", top: "10px" }, rows: [
    ".oooo.",
    "oFFFFo",
    "oFKFFo",
    "oFKKFo",
    "oFFFFo",
    ".oooo.",
  ]},
  { id: "window", cat: "decor", th: "หน้าต่าง", en: "Window", scale: 4, z: 1, pos: { left: "42%", top: "10px" }, rows: [
    "ooooooo",
    "oeeoeeo",
    "oeeoeeo",
    "ooooooo",
    "oeeoeeo",
    "oeeoeeo",
    "ooooooo",
  ]},
  { id: "balloon", cat: "decor", th: "ลูกโป่ง", en: "Balloon", scale: 4, z: 2, pos: { right: "32%", top: "8px" }, rows: [
    ".rrr.",
    "rrrrr",
    "rrrrr",
    ".rrr.",
    "..r..",
    "..o..",
    "..o..",
  ]},
  { id: "armchair", cat: "living", th: "เก้าอี้นวม", en: "Armchair", scale: 4, z: 2, pos: { right: "16%", bottom: "8px" }, rows: [
    ".oooooo.",
    "oRRRRRRo",
    "orrrrrro",
    "orrrrrro",
    "oRRRRRRo",
    ".W....W.",
  ]},
  { id: "fireplace", cat: "living", th: "เตาผิง", en: "Fireplace", scale: 4, z: 2, pos: { left: "16%", bottom: "8px" }, rows: [
    "oooooooo",
    "oWWWWWWo",
    "oWKKKKWo",
    "oWKyrKWo",
    "oWKrrKWo",
    "oWKKKKWo",
    "oWWWWWWo",
    "oooooooo",
  ]},
  { id: "aquarium", cat: "living", th: "ตู้ปลา", en: "Aquarium", scale: 4, z: 2, pos: { right: "2%", bottom: "8px" }, rows: [
    "oooooooo",
    "oeebeeeo",
    "oeeeeyeo",
    "oebeeeeo",
    "oeeeebeo",
    "oNeNeNeo",
    "oooooooo",
    ".W....W.",
  ]},

  // ── Bedroom ──
  { id: "nightstand", cat: "bed", th: "ตู้หัวเตียง", en: "Nightstand", scale: 4, z: 4, pos: { right: "20%", bottom: "8px" }, rows: [
    "oooooo",
    "owwwwo",
    "owKKwo",
    "owwwwo",
    "owKKwo",
    "o.oo.o",
  ]},
  { id: "toybox", cat: "bed", th: "กล่องของเล่น", en: "Toy Box", scale: 4, z: 4, pos: { left: "24%", bottom: "8px" }, rows: [
    "oooooo",
    "oryGbo",
    "oWWWWo",
    "obGyro",
    "oWWWWo",
    "oooooo",
  ]},

  // ── Kitchen ──
  { id: "fridge", cat: "kitchen", th: "ตู้เย็น", en: "Fridge", scale: 4, z: 2, pos: { left: "2%", bottom: "8px" }, rows: [
    "oooooo",
    "oFFFFo",
    "oFFFKo",
    "oFFFFo",
    "oooooo",
    "oFFFFo",
    "oFFFKo",
    "oFFFFo",
    "oooooo",
  ]},
  { id: "stove", cat: "kitchen", th: "เตา", en: "Stove", scale: 4, z: 2, pos: { left: "20%", bottom: "8px" }, rows: [
    "oooooooo",
    "oKoKoKKo",
    "oDDDDDDo",
    "oDKKKKDo",
    "oDKKKKDo",
    "oDDDDDDo",
    "oooooooo",
  ]},
  { id: "sink", cat: "kitchen", th: "อ่างล้างจาน", en: "Sink", scale: 4, z: 2, pos: { right: "18%", bottom: "8px" }, rows: [
    "oooooooo",
    "okkkkkko",
    "okFFFFko",
    "okFggFko",
    "oooooooo",
    "ok....ko",
    "ok....ko",
  ]},
  { id: "diningtable", cat: "kitchen", th: "โต๊ะอาหาร", en: "Dining Table", scale: 4, z: 4, pos: { right: "2%", bottom: "8px" }, rows: [
    ".kkkkkk.",
    "kkkkkkkk",
    "oooooooo",
    "..W..W..",
    "..W..W..",
    "..o..o..",
  ]},

  // ── Plants ──
  { id: "bonsai", cat: "plant", th: "บอนไซ", en: "Bonsai", scale: 4, z: 2, pos: { right: "12%", bottom: "8px" }, rows: [
    ".GGGG.",
    "GGGGGG",
    ".GwwG.",
    "..ww..",
    ".wwww.",
    ".oooo.",
    ".wkkw.",
    ".oooo.",
  ]},
  { id: "tulip", cat: "plant", th: "ทิวลิป", en: "Tulip", scale: 4, z: 4, pos: { left: "30%", bottom: "8px" }, rows: [
    ".p.p.",
    ".ppp.",
    ".ppp.",
    "..G..",
    ".NGN.",
    "..G..",
    ".ooo.",
    ".wkw.",
  ]},

  // ── Decor ──
  { id: "aqua-mirror", cat: "decor", th: "กระจก", en: "Mirror", scale: 4, z: 1, pos: { right: "26%", top: "10px" }, rows: [
    "oooooo",
    "oeeeeo",
    "oeFeeo",
    "oeeeeo",
    "oeeFeo",
    "oeeeeo",
    "oooooo",
  ]},
  { id: "trophy", cat: "decor", th: "ถ้วยรางวัล", en: "Trophy", scale: 4, z: 4, pos: { left: "30%", bottom: "8px" }, rows: [
    "y.y.y",
    ".yyy.",
    "yyyyy",
    ".yyy.",
    "..y..",
    ".ooo.",
    ".ksk.",
  ]},
  { id: "poster", cat: "decor", th: "โปสเตอร์บอล", en: "Poster", scale: 4, z: 1, pos: { left: "26%", top: "8px" }, rows: [
    "oooooo",
    "oFrrFo",
    "orrrro",
    "oKKKKo",
    "oFKKFo",
    "oFFFFo",
    "oooooo",
  ]},

  // ── More living ──
  { id: "coffeetable", cat: "living", th: "โต๊ะกาแฟ", en: "Coffee Table", scale: 4, rows: [
    "kkkkkkkk",
    "oooooooo",
    ".W....W.",
    ".o....o.",
  ]},
  { id: "floorlamp", cat: "living", th: "โคมไฟตั้งพื้น", en: "Floor Lamp", scale: 4, rows: [
    ".yyyy.",
    "yyyyyy",
    ".oooo.",
    "..WW..",
    "..WW..",
    "..WW..",
    "..WW..",
    ".oooo.",
  ]},
  { id: "guitar", cat: "living", th: "กีตาร์", en: "Guitar", scale: 4, rows: [
    "..W..",
    "..W..",
    "..W..",
    ".kkk.",
    "kkkkk",
    "kkKkk",
    "kkkkk",
    ".kkk.",
  ]},

  // ── More bedroom ──
  { id: "wardrobe", cat: "bed", th: "ตู้เสื้อผ้า", en: "Wardrobe", scale: 4, rows: [
    "oooooo",
    "owwwwo",
    "owKKwo",
    "owKKwo",
    "owKKwo",
    "owKKwo",
    "owwwwo",
    "oooooo",
  ]},
  { id: "pillow", cat: "bed", th: "หมอน", en: "Pillow", scale: 4, rows: [
    ".oooo.",
    "oFFFFo",
    "oFFFFo",
    ".oooo.",
  ]},

  // ── More kitchen ──
  { id: "microwave", cat: "kitchen", th: "ไมโครเวฟ", en: "Microwave", scale: 4, rows: [
    "oooooooo",
    "oDDDDDKo",
    "oDeeeDKo",
    "oDeeeDKo",
    "oDDDDDKo",
    "oooooooo",
  ]},
  { id: "kettle", cat: "kitchen", th: "กาน้ำ", en: "Kettle", scale: 4, rows: [
    ".oooo..",
    "oggggo.",
    "oggggoo",
    "oggggKo",
    "oggggo.",
    ".oooo..",
  ]},
  { id: "fruitbowl", cat: "kitchen", th: "ชามผลไม้", en: "Fruit Bowl", scale: 4, rows: [
    ".r.G.y.",
    "rrGGyy.",
    "oFFFFFo",
    ".oFFFo.",
    "..ooo..",
  ]},

  // ── More plants ──
  { id: "sunflower", cat: "plant", th: "ทานตะวัน", en: "Sunflower", scale: 4, rows: [
    ".yyy.",
    "yyKyy",
    "yKKKy",
    "yyKyy",
    ".yGy.",
    "..G..",
    ".NGN.",
    "..G..",
    ".ooo.",
  ]},
  { id: "palm", cat: "plant", th: "ปาล์ม", en: "Palm", scale: 4, rows: [
    "G..G..G",
    ".GGGGG.",
    "..GwG..",
    "...w...",
    "...w...",
    "..www..",
    "..ooo..",
    "..wkw..",
    "..ooo..",
  ]},

  // ── More decor ──
  { id: "candle", cat: "decor", th: "เทียน", en: "Candle", scale: 4, rows: [
    "..y..",
    "..r..",
    ".FFF.",
    ".FFF.",
    ".FFF.",
    ".ooo.",
  ]},
  { id: "gift", cat: "decor", th: "กล่องของขวัญ", en: "Gift", scale: 4, rows: [
    ".y.y.",
    "ryyyr",
    "oooooo",
    "oryro",
    "oryro",
    "ooooo",
  ]},
];

export const FURNITURE_BY_ID = Object.fromEntries(FURNITURE.map(f => [f.id, f]));

export const FURNITURE_CATS = [
  { id: "living",  th: "ห้องนั่งเล่น", en: "Living" },
  { id: "bed",     th: "ห้องนอน",     en: "Bedroom" },
  { id: "kitchen", th: "ครัว",        en: "Kitchen" },
  { id: "plant",   th: "ต้นไม้",       en: "Plants" },
  { id: "decor",   th: "ของแต่ง",      en: "Decor" },
];
