import { describe, it, expect } from "vitest";
import {
  statColor,
  padId,
  getLocalName,
  flattenEvo,
  buildEvoTree,
  getDailyPokemonId,
  calculateCatchChance,
} from "./utils.js";

describe("statColor", () => {
  it("คืนสีตามช่วงของค่า stat", () => {
    expect(statColor(150)).toBe("#22c55e"); // เขียว >=120
    expect(statColor(90)).toBe("#84cc16");  // เขียวอ่อน >=80
    expect(statColor(60)).toBe("#eab308");  // เหลือง >=50
    expect(statColor(35)).toBe("#f97316");  // ส้ม >=30
    expect(statColor(10)).toBe("#ef4444");  // แดง <30
  });

  it("เช็คขอบเขตพอดี (boundary)", () => {
    expect(statColor(120)).toBe("#22c55e");
    expect(statColor(119)).toBe("#84cc16");
  });
});

describe("padId", () => {
  it("เติม 0 ให้ครบ 4 หลัก พร้อมนำหน้าด้วย #", () => {
    expect(padId(1)).toBe("#0001");
    expect(padId(25)).toBe("#0025");
    expect(padId(1025)).toBe("#1025");
  });
});

describe("getLocalName", () => {
  const thaiArr = ["ฟุชิงิดาเนะ", "ฟุชิงิโซ"];
  const jpArr = ["フシギダネ", "フシギソウ"];

  it("คืนชื่อภาษาไทยเมื่อ lang=th", () => {
    expect(getLocalName(1, "th", thaiArr, jpArr)).toBe("ฟุชิงิดาเนะ");
  });

  it("คืนชื่อภาษาญี่ปุ่นเมื่อ lang=ja", () => {
    expect(getLocalName(2, "ja", thaiArr, jpArr)).toBe("フシギソウ");
  });

  it("คืน null เมื่อ lang เป็นอื่น (เช่น en)", () => {
    expect(getLocalName(1, "en", thaiArr, jpArr)).toBeNull();
  });

  it("คืน null เมื่อ id เกินขอบเขตของ array", () => {
    expect(getLocalName(99, "th", thaiArr, jpArr)).toBeNull();
  });
});

describe("flattenEvo", () => {
  it("แปลง chain เป็น array เรียงตามลำดับวิวัฒนาการ", () => {
    const chain = {
      species: { name: "charmander", url: "/pokemon-species/4/" },
      evolves_to: [
        {
          species: { name: "charmeleon", url: "/pokemon-species/5/" },
          evolves_to: [
            {
              species: { name: "charizard", url: "/pokemon-species/6/" },
              evolves_to: [],
            },
          ],
        },
      ],
    };
    expect(flattenEvo(chain)).toEqual([
      { name: "charmander", id: 4 },
      { name: "charmeleon", id: 5 },
      { name: "charizard", id: 6 },
    ]);
  });
});

describe("buildEvoTree", () => {
  it("สร้าง tree แบบแตกกิ่ง (รองรับวิวัฒนาการหลายสาย เช่น อีวุย)", () => {
    const chain = {
      species: { name: "eevee", url: "/pokemon-species/133/" },
      evolution_details: [],
      evolves_to: [
        {
          species: { name: "vaporeon", url: "/pokemon-species/134/" },
          evolution_details: [{ trigger: { name: "use-item" }, item: { name: "water-stone" } }],
          evolves_to: [],
        },
        {
          species: { name: "jolteon", url: "/pokemon-species/135/" },
          evolution_details: [{ trigger: { name: "use-item" }, item: { name: "thunder-stone" } }],
          evolves_to: [],
        },
      ],
    };
    const tree = buildEvoTree(chain);
    expect(tree.id).toBe(133);
    expect(tree.name).toBe("eevee");
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0].name).toBe("vaporeon");
    expect(tree.children[0].item).toBe("water-stone");
    expect(tree.children[1].trigger).toBe("use-item");
  });
});

describe("getDailyPokemonId", () => {
  it("คืนค่าอยู่ในช่วง 1..maxId", () => {
    const id = getDailyPokemonId(1025);
    expect(id).toBeGreaterThanOrEqual(1);
    expect(id).toBeLessThanOrEqual(1025);
  });

  it("ให้ค่าเดิมเสมอภายในวันเดียวกัน (deterministic)", () => {
    expect(getDailyPokemonId(1025)).toBe(getDailyPokemonId(1025));
  });
});

describe("calculateCatchChance", () => {
  it("Master Ball (ballMult>=255) จับติด 100% เสมอ", () => {
    expect(calculateCatchChance(3, 255)).toBe(100);
  });

  it("ผลลัพธ์อยู่ในช่วง 1..100 เสมอ", () => {
    const chance = calculateCatchChance(45, 1.5);
    expect(chance).toBeGreaterThanOrEqual(1);
    expect(chance).toBeLessThanOrEqual(100);
  });

  it("berry boost ทำให้โอกาสจับสูงขึ้น", () => {
    const base = calculateCatchChance(45, 1.5, 0);
    const boosted = calculateCatchChance(45, 1.5, 50);
    expect(boosted).toBeGreaterThanOrEqual(base);
  });

  it("captureRate ที่ว่าง/0 ใช้ค่า default แทน (ไม่พัง)", () => {
    expect(calculateCatchChance(0, 1)).toBeGreaterThanOrEqual(1);
  });
});
