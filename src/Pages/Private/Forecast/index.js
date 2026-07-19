import { useContext, useEffect, useMemo, useState } from "react";
import {
  Select,
  Skeleton,
  Segmented,
  Slider,
  Tag,
  Tooltip,
  message,
  Empty,
  Space,
  Button,
} from "antd";
import {
  ThunderboltOutlined,
  RiseOutlined,
  ExperimentOutlined,
  BulbOutlined,
  ReloadOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import ReactApexChart from "react-apexcharts";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { getAllBranches } from "../../../API/Branches";
import { getAllProducts } from "../../../API/Products";
import { getAllChannels } from "../../../API/Channels";
import { getYEForecast } from "../../../API/Forecast";
import RiyalIcon from "../../../Utils/RiyalIcon";
import "./style.css";

const YM_MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const ymLabel  = (ym) => `${YM_MONTH[(ym % 100) - 1]} ${String(ym).slice(2, 4)}`;
const ymToDate = (ym) => new Date(Math.floor(ym / 100), (ym % 100) - 1, 1).getTime();

const fmt = (v) =>
  v == null || !isFinite(v)
    ? "—"
    : Math.abs(v) >= 1_000_000
    ? (v / 1_000_000).toFixed(2) + "M"
    : Math.abs(v) >= 1_000
    ? (v / 1_000).toFixed(1) + "K"
    : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtFull = (v) =>
  v == null || !isFinite(v)
    ? "—"
    : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

const shortBranch = (n) =>
  n && n.toUpperCase().startsWith("SBTC ") ? n.slice(5) : n;

const Forecast = () => {
  const { unitType, valueType, effectiveUnitType, mode } = useContext(UnitValueContext);
  const isValueMode = mode === "val";
  const unitLabel   = isValueMode ? "SAR" : (unitType || "ctn").toUpperCase();

  const currentYear = new Date().getFullYear();

  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);

  const [year, setYear]           = useState(currentYear);
  const [method, setMethod]       = useState("holt_winters");
  const [whatifPct, setWhatifPct] = useState(0);

  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState(null);

  useEffect(() => {
    getAllBranches().then((r) => setBranches(r?.results || []));
    getAllChannels().then((r) => setChannels(r?.results || []));
    getAllProducts().then((r) => {
      const list = r?.results || [];
      // Match Navbar behaviour: inject the two Indomie virtual codes so users
      // can forecast the whole family in one shot. The backend expands them
      // in _expand_products() before hitting the DB.
      const hasIndomie = list.some((p) => (p.name || "").toLowerCase().includes("indomie"));
      const specials = hasIndomie
        ? [
            { code: "9999901", name: "INDOMIE PILLOW (All)" },
            { code: "9999902", name: "INDOMIE CUP (All)" },
          ].filter((s) => !list.some((p) => p.code === s.code))
        : [];
      setProducts([...specials, ...list]);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    getYEForecast({
      method,
      year,
      unitType:  effectiveUnitType,
      valueType,
      branchCodes:  selectedBranches,
      productCodes: selectedProducts,
      channels:     selectedChannels,
      whatifPct,
    }).then((res) => {
      if (res?.error) {
        message.error("Failed to load forecast: " + (res?.error?.detail || res?.error));
        setData(null);
      } else setData(res);
      setLoading(false);
    });
  }, [
    method, year, effectiveUnitType, valueType,
    selectedBranches, selectedProducts, selectedChannels, whatifPct,
  ]);

  // ── Chart series prep ─────────────────────────────────────────────────
  const { chartSeries, hasGaps } = useMemo(() => {
    if (!data) return { chartSeries: [], hasGaps: false };
    // Treat any 0-value month inside the history as a data gap and draw as
    // null so the line breaks cleanly instead of spiking to the floor.
    const rawHist = data.history || [];
    let gaps = false;
    const history = rawHist.map((r) => {
      const isGap = !r.actual || r.actual === 0;
      if (isGap) gaps = true;
      return { x: ymToDate(r.ym), y: isGap ? null : r.actual };
    });
    const forecast = (data.forecast || []).map((r) => ({ x: ymToDate(r.ym), y: r.forecast }));
    const band     = (data.forecast || []).map((r) => ({ x: ymToDate(r.ym), y: [r.lower, r.upper] }));

    // Bridge: prepend last non-null history point to forecast so line is continuous.
    const lastReal = [...history].reverse().find((p) => p.y != null);
    if (lastReal && forecast.length) {
      forecast.unshift({ x: lastReal.x, y: lastReal.y });
      band.unshift({ x: lastReal.x, y: [lastReal.y, lastReal.y] });
    }
    const series = [
      { name: "68% Confidence", type: "rangeArea", data: band,     color: "#8B5CF6" },
      { name: "Actuals",        type: "line",     data: history,  color: "#3B82F6" },
      { name: "Forecast",       type: "line",     data: forecast, color: "#8B5CF6" },
    ];
    return { chartSeries: series, hasGaps: gaps };
  }, [data]);

  const chartOptions = useMemo(() => {
    const monthName = (ts) => {
      const d = new Date(ts);
      return `${YM_MONTH[d.getMonth()]} ${d.getFullYear()}`;
    };
    const seriesColors = { actuals: "#3B82F6", forecast: "#8B5CF6", band: "#8B5CF6" };

    return {
      chart: {
        type: "line",
        toolbar: { show: false },
        zoom: { enabled: true, type: "x" },
        animations: { enabled: true, speed: 350 },
        background: "transparent",
        fontFamily: "'Inter', sans-serif",
      },
      stroke: {
        curve: "smooth",
        width: [0, 3, 3],
        dashArray: [0, 0, 6],
      },
      fill: {
        type: ["solid", "solid", "solid"],
        opacity: [0.18, 1, 1],
      },
      markers: {
        size: [0, 4, 4],
        strokeWidth: 0,
        hover: { size: 7 },
      },
      xaxis: {
        type: "datetime",
        labels: {
          style: { colors: "#64748B", fontSize: "11px" },
          datetimeFormatter: { year: "yyyy", month: "MMM 'yy", day: "dd MMM" },
        },
        axisBorder: { color: "#E2E8F0" },
        axisTicks: { color: "#E2E8F0" },
      },
      yaxis: {
        labels: {
          style: { colors: "#64748B", fontSize: "11px" },
          formatter: (v) => fmt(v),
        },
        forceNiceScale: true,
      },
      grid: {
        borderColor: "#EEF2F7",
        strokeDashArray: 3,
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } },
        padding: { top: 0, right: 16, bottom: 0, left: 8 },
      },
      legend: {
        position: "top",
        horizontalAlign: "right",
        offsetY: -6,
        markers: { width: 10, height: 10, radius: 3 },
        itemMargin: { horizontal: 10, vertical: 0 },
        labels: { colors: "#475569" },
        onItemHover: { highlightDataSeries: false },
      },
      tooltip: {
        shared: true,
        intersect: false,
        // Custom tooltip so we can render actuals / forecast / band / target
        // properly across mixed series (rangeArea + line).
        custom: ({ dataPointIndex, w }) => {
          const s = w.config.series;
          // Prefer a real timestamp from any non-empty series at this index.
          let ts = null;
          for (const ser of s) {
            const pt = ser.data && ser.data[dataPointIndex];
            if (pt) { ts = pt.x ?? pt[0]; break; }
          }
          if (ts == null) return "";

          const findVal = (name, transform = (v) => v) => {
            const ser = s.find((x) => x.name === name);
            const pt  = ser?.data?.[dataPointIndex];
            if (!pt) return null;
            const y = pt.y ?? pt[1];
            return transform(y);
          };

          const row = (label, val, color, extra = "") => {
            if (val == null || (Array.isArray(val) && val[0] == null)) return "";
            const shown = Array.isArray(val)
              ? `${fmtFull(val[0])} – ${fmtFull(val[1])}`
              : fmtFull(val);
            return `
              <div style="display:flex;align-items:center;gap:8px;padding:3px 0;">
                <span style="width:8px;height:8px;border-radius:2px;background:${color};display:inline-block;"></span>
                <span style="flex:1;color:#64748B;font-size:11px;">${label}${extra}</span>
                <span style="color:#0F172A;font-weight:600;font-size:12px;">${shown} <span style="color:#94A3B8;font-weight:500;">${unitLabel}</span></span>
              </div>`;
          };

          const actuals  = findVal("Actuals");
          const forecast = findVal("Forecast");
          const band     = findVal("68% Confidence");

          return `
            <div style="padding:10px 12px;min-width:220px;font-family:Inter,sans-serif;">
              <div style="color:#0F172A;font-weight:700;font-size:12px;margin-bottom:6px;letter-spacing:-0.01em;">${monthName(ts)}</div>
              ${row("Actuals",  actuals,  seriesColors.actuals)}
              ${row("Forecast", forecast, seriesColors.forecast)}
              ${row("68% band", band,     seriesColors.band)}
            </div>`;
        },
      },
      annotations: {
        xaxis: data?.anchor_ym
          ? [{
              x: ymToDate(data.anchor_ym) + 15 * 24 * 3600 * 1000,
              borderColor: "#8B5CF6",
              strokeDashArray: 4,
              label: {
                text: "Forecast starts",
                borderColor: "#8B5CF6",
                orientation: "horizontal",
                offsetY: -4,
                style: { color: "#fff", background: "#8B5CF6", fontSize: "10px" },
              },
            }]
          : [],
      },
    };
  }, [data, unitLabel]);

  // ── Metadata for the model selector ───────────────────────────────────
  const methodOptions = useMemo(() => {
    const meta = data?.available_methods || [
      { key: "seasonal_naive", label: "Seasonal Naive (baseline)", available: true },
      { key: "trailing_avg",   label: "Trailing Average",         available: true },
      { key: "holt_winters",   label: "Holt-Winters",              available: true },
      { key: "prophet",        label: "Prophet",                   available: true },
    ];
    return meta.map((m) => {
      const cleanLabel = m.label
        .replace(" (baseline)", "")
        .replace(" (statsmodels)", "")
        .replace(" (Meta)", "");
      const tipContent = (
        <div style={{ maxWidth: 280, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{cleanLabel}</div>
          {m.available ? (
            <div style={{ fontSize: 12 }}>{m.description || m.label}</div>
          ) : (
            <div style={{ fontSize: 12, color: "#FCA5A5" }}>
              Unavailable: {m.reason || "not installed"}
            </div>
          )}
          {m.min_history ? (
            <div style={{ marginTop: 6, fontSize: 11, opacity: 0.75 }}>
              Needs ≥ {m.min_history} months of history.
            </div>
          ) : null}
        </div>
      );
      return {
        label: (
          <Tooltip title={tipContent} placement="top">
            <span style={{ opacity: m.available ? 1 : 0.45 }}>{cleanLabel}</span>
          </Tooltip>
        ),
        value: m.key,
        disabled: !m.available,
      };
    });
  }, [data]);

  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYear - 2; y <= currentYear + 1; y++) years.push({ value: y, label: String(y) });
    return years;
  }, [currentYear]);

  // ── KPI band ──────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!data) return null;
    const { ytd_actual, projected_ye, accuracy_stats: acc } = data;
    const forecastTail = (projected_ye || 0) - (ytd_actual || 0);
    const yoyGrowth = (() => {
      const hist = data.history || [];
      const prevYear = year - 1;
      const prev = hist
        .filter((r) => Math.floor(r.ym / 100) === prevYear)
        .reduce((s, r) => s + (r.actual || 0), 0);
      if (!prev) return null;
      return ((projected_ye - prev) / prev) * 100;
    })();
    return {
      ytd_actual,
      projected_ye,
      forecastTail,
      yoy: yoyGrowth,
      accuracy: acc || null,
    };
  }, [data, year]);

  const yoyColor = kpis?.yoy == null
    ? "#64748B"
    : kpis.yoy >= 0 ? "#10B981" : "#EF4444";

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="forecast-page">
      {/* Header + toolbar */}
      <div className="forecast-header">
        <div className="forecast-header__title">
          <div className="forecast-header__icon"><ThunderboltOutlined /></div>
          <div>
            <div className="forecast-header__h1">
              Forecast Studio
              <Tag className="forecast-header__tag">AI · Beta</Tag>
            </div>
            <div className="forecast-header__sub">
              Predictive year-end projection with confidence bands, model comparison and what-if scenarios.
            </div>
          </div>
        </div>
        <Space size={8} wrap>
          <Select
            value={year}
            onChange={setYear}
            options={yearOptions}
            style={{ width: 100 }}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder="All Branches"
            value={selectedBranches}
            onChange={setSelectedBranches}
            style={{ minWidth: 200 }}
            maxTagCount={1}
            showSearch
            optionFilterProp="label"
            options={branches.map((b) => ({ value: b.code, label: shortBranch(b.name) || b.code }))}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder="All Products"
            value={selectedProducts}
            onChange={setSelectedProducts}
            style={{ minWidth: 200 }}
            maxTagCount={1}
            showSearch
            optionFilterProp="label"
            options={products.map((p) => ({ value: p.code, label: p.name || p.code }))}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder="All Channels"
            value={selectedChannels}
            onChange={setSelectedChannels}
            style={{ minWidth: 180 }}
            maxTagCount={1}
            showSearch
            optionFilterProp="label"
            options={channels.map((c) => ({ value: c.name, label: c.name }))}
          />
          <Tooltip title="Reload">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => setWhatifPct((v) => v)}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Hero — projection vs target */}
      <div className="forecast-hero">
        <div className="forecast-hero__glow" />
        {loading && !data ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : !data ? (
          <Empty description="No forecast data" />
        ) : (
          <>
            <div className="forecast-hero__row">
              <div className="forecast-kpi forecast-kpi--primary">
                <div className="forecast-kpi__label">Projected Year-End · {year}</div>
                <div className="forecast-kpi__value">
                  {fmt(kpis.projected_ye)}
                  <span className="forecast-kpi__unit">
                    {isValueMode ? <RiyalIcon width={14} height={14} color="#0f172a" /> : unitLabel}
                  </span>
                </div>
                <div className="forecast-kpi__delta">
                  YTD actual: <strong>{fmt(kpis.ytd_actual)}</strong> · Forecast tail:{" "}
                  <strong>{fmt(kpis.forecastTail)}</strong>
                </div>
              </div>

              <div className="forecast-kpi">
                <div className="forecast-kpi__label">
                  <RiseOutlined /> YoY Growth
                </div>
                <div className="forecast-kpi__value" style={{ color: yoyColor }}>
                  {kpis.yoy == null ? "—" : `${kpis.yoy >= 0 ? "+" : ""}${kpis.yoy.toFixed(1)}%`}
                </div>
                <div className="forecast-kpi__delta">
                  vs. {year - 1} full-year actuals
                </div>
              </div>

              <div className="forecast-kpi">
                <div className="forecast-kpi__label">
                  <ExperimentOutlined /> Model Accuracy
                  <Tooltip
                    placement="topRight"
                    title={
                      <div style={{ maxWidth: 300, lineHeight: 1.55, fontSize: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>How we measure accuracy</div>
                        We hide the most recent {kpis.accuracy?.holdout_months || "few"} months of real sales,
                        ask the model to forecast them from scratch, then compare its
                        guess to what actually happened. Lower error = better.
                      </div>
                    }
                  >
                    <QuestionCircleOutlined className="forecast-kpi__help" />
                  </Tooltip>
                </div>
                <div className="forecast-kpi__value">
                  {kpis.accuracy?.mape_pct == null ? "—" : `${kpis.accuracy.mape_pct.toFixed(1)}%`}
                  <Tooltip
                    title={
                      <div style={{ maxWidth: 260, fontSize: 12, lineHeight: 1.5 }}>
                        <strong>MAPE</strong> = Mean Absolute Percentage Error.
                        On average, how far the forecast was off in % terms.
                        &lt; 10% is excellent, 10–20% is solid, &gt; 30% is unreliable.
                      </div>
                    }
                  >
                    <span className="forecast-kpi__unit" style={{ fontSize: 11, cursor: "help" }}>
                      MAPE
                    </span>
                  </Tooltip>
                </div>
                <div className="forecast-kpi__stats">
                  <Tooltip title={<span>Mean Absolute Error — average miss in raw units.</span>}>
                    <div className="forecast-kpi__stat">
                      <span>MAE</span>
                      <strong>{kpis.accuracy?.mae == null ? "—" : `${fmt(kpis.accuracy.mae)} ${unitLabel}`}</strong>
                    </div>
                  </Tooltip>
                  <Tooltip title={<span>Root Mean Squared Error — penalises big misses more heavily.</span>}>
                    <div className="forecast-kpi__stat">
                      <span>RMSE</span>
                      <strong>{kpis.accuracy?.rmse == null ? "—" : `${fmt(kpis.accuracy.rmse)} ${unitLabel}`}</strong>
                    </div>
                  </Tooltip>
                  <Tooltip title={<span>Bias — positive = model over-forecasts; negative = under-forecasts.</span>}>
                    <div className="forecast-kpi__stat">
                      <span>Bias</span>
                      <strong style={{ color: kpis.accuracy?.bias_pct == null ? "#64748B" : Math.abs(kpis.accuracy.bias_pct) < 5 ? "#10B981" : "#F59E0B" }}>
                        {kpis.accuracy?.bias_pct == null
                          ? "—"
                          : `${kpis.accuracy.bias_pct >= 0 ? "+" : ""}${kpis.accuracy.bias_pct.toFixed(1)}%`}
                      </strong>
                    </div>
                  </Tooltip>
                  {/* Coverage stat hidden for now — revisit later.
                  <Tooltip title={<span>How reliable the shaded confidence band is. During backtesting we hide the last few real months and check how many landed inside the band. A trustworthy band scores near 68% (matching its confidence level). Below 68% = band too narrow (model over-confident); above 68% = band too wide (model under-confident).</span>}>
                    <div className="forecast-kpi__stat">
                      <span>Coverage</span>
                      <strong>
                        {kpis.accuracy?.band_coverage_pct == null
                          ? "—"
                          : `${kpis.accuracy.band_coverage_pct.toFixed(0)}%`}
                      </strong>
                    </div>
                  </Tooltip>
                  */}
                </div>
              </div>
            </div>

          </>
        )}
      </div>

      {/* Model + what-if controls */}
      <div className="forecast-controls">
        <div className="forecast-controls__group">
          <div className="forecast-controls__label">
            <ExperimentOutlined /> Forecast Model
          </div>
          <Segmented
            value={method}
            onChange={setMethod}
            options={methodOptions}
            size="middle"
          />
          {data?.model_notes && (
            <div className="forecast-controls__notes">{data.model_notes}</div>
          )}
        </div>

        <div className="forecast-controls__group forecast-controls__group--slider">
          <div className="forecast-controls__label">
            <ThunderboltOutlined /> What-if scenario
            <span className="forecast-controls__value">
              {whatifPct >= 0 ? "+" : ""}{whatifPct}%
            </span>
          </div>
          <Slider
            min={-50}
            max={50}
            step={1}
            value={whatifPct}
            onChange={setWhatifPct}
            marks={{ "-50": "-50%", 0: "0%", 50: "+50%" }}
            tooltip={{ formatter: (v) => `${v >= 0 ? "+" : ""}${v}%` }}
          />
        </div>
      </div>

      {/* Chart */}
      <div className="forecast-chart">
        {loading && !data ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : chartSeries.length === 0 ? (
          <Empty description="No history in the selected scope" />
        ) : (
          <>
            <ReactApexChart
              height={420}
              options={chartOptions}
              series={chartSeries}
              type="line"
            />
            {hasGaps && (
              <div className="forecast-chart__hint">
                <BulbOutlined /> Some months had no sales in this scope — the actuals line breaks over those gaps.
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer meta */}
      <div className="forecast-footer">
        <span>Unit: <strong>{unitLabel}</strong></span>
        <span>· Value type: <strong>{valueType.toUpperCase()}</strong></span>
        {data?.anchor_ym && (
          <span>· Anchor month: <strong>{ymLabel(data.anchor_ym)}</strong></span>
        )}
        <span>· Engine family: <strong>{data?.available_methods?.find((m) => m.key === method)?.family || "—"}</strong></span>
      </div>
    </div>
  );
};

export default Forecast;
