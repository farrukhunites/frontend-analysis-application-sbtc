import Chart from "react-apexcharts";
import GraphLayout from "../../GraphLayout";

const DonutChart = ({
  graphTitle,
  labels,
  colourTheme,
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
