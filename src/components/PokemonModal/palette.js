// Pastel type palette for the Pokémon detail view (the list keeps the
// app-wide TYPE_COLORS) — grass/fire/water/electric hexes come straight
// from the reference spec, the rest match its tone.
export const PASTEL_TYPE_COLORS = {
  grass:    "#48D0B0",
  fire:     "#FB6C6C",
  water:    "#77BDFE",
  electric: "#FFCE4B",
  bug:      "#8BD674",
  dark:     "#6F6E78",
  dragon:   "#7383B9",
  fairy:    "#EBA8C3",
  fighting: "#EB6C8B",
  flying:   "#83A2E3",
  ghost:    "#8571BE",
  ground:   "#F78551",
  ice:      "#91D8DF",
  normal:   "#B5B9C4",
  poison:   "#9F6E97",
  psychic:  "#FF6568",
  rock:     "#D4C294",
  steel:    "#4C91B2",
};

export const pastelTypeColor = (t, fallback = "#B5B9C4") =>
  PASTEL_TYPE_COLORS[t] ?? fallback;

// White text fails WCAG on the light types (Electric yellow above all).
// Measuring perceived luminance handles those cases as a rule instead of
// a hardcoded exception list.
export const needsDarkText = (hex) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 186;
};
