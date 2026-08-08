// Horizontal, horizontally-scrollable underline tab bar — replaces the
// dropdown selector to match the reference "About | Base Stats | Evolution
// | Moves" detail-page style. Scrolls instead of wrapping/cramping since
// this modal has 9 tabs (vs. the reference's 4) and some labels run long
// in Thai — that's the exact problem TabDropdown was built to avoid.
export default function TabBar({ tabs, tab, setTab }) {
  return (
    <div className="detail-tabbar">
      {tabs.map((label, i) => (
        <button
          key={i}
          type="button"
          className={`detail-tab${tab === i ? " active" : ""}`}
          onClick={() => setTab(i)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
