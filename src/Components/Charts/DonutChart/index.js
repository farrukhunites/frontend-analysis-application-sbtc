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
            total: {
              show: true,
              label: "Total",
              color: CHART_LEGEND_COLOR,
              fontSize: "13px",
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
        formatter: function (val, { seriesIndex }) {
          const actual = seriesValues[seriesIndex]?.toLocaleString() || "0";
          return `${val.toFixed(1)}% (${actual})`;
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
