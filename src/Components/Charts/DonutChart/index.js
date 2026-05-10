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

  return (
    <GraphLayout
      title={graphTitle}
      labels={labels}
      series={series}
      extraCols={extraCols}
      showTable={showTable}
    >
      <Chart options={options} series={series} type="donut" height={310} />
    </GraphLayout>
  );
};

export default DonutChart;
