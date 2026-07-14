import Chart from "react-apexcharts";
import GraphLayout from "../../GraphLayout";
import { CHART_COLORS, CHART_LEGEND_COLOR } from "../chartConfig";

const DonutChart = ({
  graphTitle,
  labels,
  colourTheme = CHART_COLORS,
  series,
  seriesValues = [],
  units = [],
  extraCols = [],
  showTable = true,
}) => {
  const options = {
    chart: {
      type: "donut",
    },
    labels: labels,
    colors: colourTheme,
    legend: {
      position: "bottom",
      labels: {
        colors: CHART_LEGEND_COLOR,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            value: {
              // val is the raw series value on hover; compute % using series closure
              formatter: (val) => {
                const total = series.reduce((a, b) => a + b, 0) || 1;
                return `${((parseFloat(val) / total) * 100).toFixed(1)}%`;
              },
            },
            total: {
              show: true,
              label: "Total",
              color: CHART_LEGEND_COLOR,
              fontSize: "13px",
              formatter: () => "100%",
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function (val) {
        return `${val.toFixed(1)}% `;
      },
    },
    tooltip: {
      y: {
        // val is the raw series value; compute % from series closure
        formatter: function (val, { seriesIndex }) {
          const total = series.reduce((a, b) => a + b, 0) || 1;
          const pct = ((val / total) * 100).toFixed(1);
          const actual = (seriesValues[seriesIndex] ?? val).toLocaleString();
          return `${pct}% (${actual})`;
        },
      },
    },
  };

  // GraphLayout's table modal expects series as [{name, data}, ...] (bar/line
  // shape). Donut passes a flat numeric array, so adapt here: one virtual
  // series holds raw values, plus a computed "%" extraCol. Some call sites
  // (e.g. Dashboard "Channel Sales Contribution") pass series as already-
  // computed percentages and seriesValues as raw amounts; others pass raw in
  // both. Detect the split so the table doesn't end up with two "%" columns.
  const rawValues = seriesValues.length ? seriesValues : series;
  const seriesIsPercent =
    seriesValues.length > 0 &&
    seriesValues.some((v, i) => v !== series[i]);
  const percentages = seriesIsPercent
    ? series.map((v) => Number((+v).toFixed(1)))
    : (() => {
        const total = rawValues.reduce((a, b) => a + b, 0) || 1;
        return rawValues.map(
          (v) => Number(((v / total) * 100).toFixed(1))
        );
      })();
  // "%" as a unit refers to the slice size, not to the values themselves —
  // fall back to a generic "Value" header in that case so the raw-amount
  // column isn't mislabelled.
  const valueLabel = units[0] && units[0] !== "%" ? units[0] : "Value";
  const tableSeries = [{ name: valueLabel, data: rawValues }];
  const tableExtraCols = [...extraCols, { name: "%", data: percentages }];

  return (
    <GraphLayout
      title={graphTitle}
      labels={labels}
      series={tableSeries}
      extraCols={tableExtraCols}
      showTable={showTable}
    >
      <Chart options={options} series={series} type="donut" height={310} />
    </GraphLayout>
  );
};

export default DonutChart;
