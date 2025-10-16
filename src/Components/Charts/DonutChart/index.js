import React from "react";
import Chart from "react-apexcharts";
import GraphLayout from "../../GraphLayout";

const DonutChart = ({
  graphTitle,
  labels,
  colourTheme,
  series,
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
        return val.toFixed(1) + "%"; // show percentage
      },
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val.toLocaleString() + " %"; // tooltip shows absolute values
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
