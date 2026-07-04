import { useEffect, useRef, useState } from "react";
import "./style.css";

const HIGHLIGHT_CLASS = "cell-selected";
const BADGE_CLASS = "cell-selection-badge";
const INTERACTIVE_SELECTOR =
  "a, button, input, select, textarea, .ant-checkbox-wrapper, .ant-radio-wrapper, .ant-select, .ant-picker, .ant-btn, .report-clickable-name, .ant-table-row-expand-icon";

// Parse a cell's textContent as a number. Strip commas, currency symbols,
// trailing "%", leading "+". Treat empty/dash/"—"/"N/A" as null so grand-total
// dashes don't skew averages.
const parseCellNumber = (raw) => {
  if (!raw) return null;
  const t = raw.trim();
  if (!t || t === "-" || t === "—" || t === "N/A" || t === "-%") return null;
  const cleaned = t
    .replace(/[,\s]/g, "")
    .replace(/^\+/, "")
    .replace(/%$/, "")
    .replace(/^SAR/i, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

// Cell coordinate within its table body. Rows use position in tbody, columns
// use position in tr. Rejects header cells and summary rows (they aren't in a
// tbody). Returns null if the element isn't a body cell in an antd table.
const getCellCoords = (td) => {
  const tr = td.parentElement;
  if (!tr || tr.tagName !== "TR") return null;
  const tbody = tr.parentElement;
  if (!tbody || tbody.tagName !== "TBODY") return null;
  if (!tbody.closest(".ant-table")) return null;
  const row = Array.prototype.indexOf.call(tbody.children, tr);
  const col = Array.prototype.indexOf.call(tr.children, td);
  return { tbody, row, col };
};

const CellSelectionOverlay = () => {
  const [stats, setStats] = useState(null);
  const selectedRef = useRef(new Set());
  const anchorRef = useRef(null);
  const draggingRef = useRef(false);

  const recompute = () => {
    const cells = selectedRef.current;
    if (cells.size === 0) {
      setStats(null);
      return;
    }
    let sum = 0, min = Infinity, max = -Infinity, numeric = 0;
    cells.forEach((td) => {
      const v = parseCellNumber(td.textContent);
      if (v == null) return;
      numeric++;
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    });
    setStats({
      count: cells.size,
      numeric,
      sum,
      avg: numeric ? sum / numeric : 0,
      min: numeric ? min : 0,
      max: numeric ? max : 0,
    });
  };

  const clearSelection = () => {
    selectedRef.current.forEach((td) => td.classList.remove(HIGHLIGHT_CLASS));
    selectedRef.current.clear();
    anchorRef.current = null;
    setStats(null);
  };

  const addCell = (td) => {
    td.classList.add(HIGHLIGHT_CLASS);
    selectedRef.current.add(td);
  };

  const selectRectangle = (anchor, current) => {
    if (!anchor || !current || anchor.tbody !== current.tbody) return;
    selectedRef.current.forEach((td) => td.classList.remove(HIGHLIGHT_CLASS));
    selectedRef.current.clear();
    const rMin = Math.min(anchor.row, current.row);
    const rMax = Math.max(anchor.row, current.row);
    const cMin = Math.min(anchor.col, current.col);
    const cMax = Math.max(anchor.col, current.col);
    for (let r = rMin; r <= rMax; r++) {
      const tr = anchor.tbody.children[r];
      if (!tr) continue;
      for (let c = cMin; c <= cMax; c++) {
        const td = tr.children[c];
        if (td && td.classList.contains("ant-table-cell")) addCell(td);
      }
    }
    recompute();
  };

  useEffect(() => {
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      const badge = e.target.closest?.(`.${BADGE_CLASS}`);
      if (badge) return;

      const td = e.target.closest?.(".ant-table-cell");
      if (!td) {
        clearSelection();
        return;
      }
      // Preserve clicks on drill-down links, buttons, form controls, etc.
      if (e.target.closest?.(INTERACTIVE_SELECTOR)) return;

      const coords = getCellCoords(td);
      if (!coords) return;

      if (e.shiftKey && anchorRef.current) {
        selectRectangle(anchorRef.current, coords);
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        if (selectedRef.current.has(td)) {
          td.classList.remove(HIGHLIGHT_CLASS);
          selectedRef.current.delete(td);
        } else {
          addCell(td);
        }
        anchorRef.current = coords;
        recompute();
        return;
      }
      clearSelection();
      anchorRef.current = coords;
      addCell(td);
      recompute();
      draggingRef.current = true;
    };

    const onMouseMove = (e) => {
      if (!draggingRef.current || !anchorRef.current) return;
      // Safety net: if the mouse button is no longer held (a mouseup was
      // missed — happens when the user releases outside the window or a
      // child handler stops propagation), abort the drag so we don't wipe
      // the current selection on the next hover.
      if (e.buttons === 0) {
        draggingRef.current = false;
        return;
      }
      const td = e.target.closest?.(".ant-table-cell");
      if (!td) return;
      const coords = getCellCoords(td);
      if (!coords || coords.tbody !== anchorRef.current.tbody) return;
      selectRectangle(anchorRef.current, coords);
    };

    const onMouseUp = () => { draggingRef.current = false; };
    // Extra safety: dragging out of the window and releasing there.
    const onWindowBlur = () => { draggingRef.current = false; };

    const onKeyDown = (e) => {
      if (e.key === "Escape") clearSelection();
    };

    // Bulletproof safety net: if anything strips the highlight class from a
    // tracked cell (React re-render, antd DOM manipulation, whatever), the
    // observer re-applies it synchronously so the user never sees the
    // selection flicker. Scoped to the class attribute for cheap filtering.
    const restoreObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type !== "attributes" || m.attributeName !== "class") continue;
        const el = m.target;
        if (
          selectedRef.current.has(el) &&
          !el.classList.contains(HIGHLIGHT_CLASS)
        ) {
          el.classList.add(HIGHLIGHT_CLASS);
        }
      }
    });
    restoreObserver.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    // Capture phase so a child's stopPropagation can't hide the release from us.
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onWindowBlur);
      restoreObserver.disconnect();
    };
  }, []);

  if (!stats || stats.count === 0) return null;

  const fmt = (n) =>
    Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

  return (
    <div className={BADGE_CLASS}>
      <span className="csb-item"><span className="csb-label">Count</span><b>{stats.count}</b></span>
      <span className="csb-sep" />
      <span className="csb-item"><span className="csb-label">Sum</span><b>{fmt(stats.sum)}</b></span>
      <span className="csb-sep" />
      <span className="csb-item"><span className="csb-label">Avg</span><b>{fmt(stats.avg)}</b></span>
      <span className="csb-sep" />
      <span className="csb-item"><span className="csb-label">Min</span><b>{fmt(stats.min)}</b></span>
      <span className="csb-sep" />
      <span className="csb-item"><span className="csb-label">Max</span><b>{fmt(stats.max)}</b></span>
      {stats.numeric !== stats.count && (
        <>
          <span className="csb-sep" />
          <span className="csb-hint">{stats.count - stats.numeric} non-numeric</span>
        </>
      )}
      <button
        type="button"
        className="csb-close"
        title="Clear (Esc)"
        onClick={clearSelection}
      >
        ✕
      </button>
    </div>
  );
};

export default CellSelectionOverlay;
