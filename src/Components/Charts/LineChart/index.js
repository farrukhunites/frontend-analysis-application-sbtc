import { Empty } from "antd";
import ReactApexChart from "react-apexcharts";
import GraphLayout from "../../GraphLayout";

const LineChart = ({
  labels,
  series,
  colourTheme = ["#000", "#fff"],
  graphTitle = "Undefined",
  units = [],
  extraCols = [],
  addOnComponent = null,
}) => {
  if (labels.length < 1) {
    return (
      <GraphLayout title={graphTitle}>
        <Empty
          style={{
            height: "300px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
          description={
            <span style={{ color: "#FB3748" }}>
              {`No ${graphTitle} data available`}
            </span>
          }
        />
      </GraphLayout>
    );
  }

  const options = {
    chart: {
      type: "line",
      toolbar: {
        show: false,
      },
    },
    fill: {
      type: "none",
    },
    colors: colourTheme,
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    markers: {
      size: 3,
      colors: colourTheme,
      strokeColors: colourTheme,
      strokeWidth: 2,
      hover: {
        size: 5,
      },
    },
    xaxis: {
      categories: labels,
      labels: {
        offsetX: 10,
      },
      axisBorder: {
        show: true,
        color: "#ccc",
      },
      axisTicks: {
        show: true,
        color: "#ccc",
      },
    },
    yaxis: {
      labels: {
        formatter: function (value) {
          return value ? value.toFixed(2) : "0.00";
        },
      },
      axisBorder: {
        show: true,
        color: "#ccc",
      },
      axisTicks: {
        show: true,
        color: "#ccc",
      },
    },
    legend: {
      position: "bottom",
      horizontalAlign: "center",
      offsetY: 8,
      labels: {
        colors: "#000",
        useSeriesColors: false,
        style: {
          fontFamily: "Inter",
          fontSize: "12px",
          fontWeight: 400,
        },
      },
    },
    grid: {
      borderColor: "#ccc",
      strokeDashArray: 0,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    tooltip: {
      enabled: true,
      y: units.map((unit) => ({
        formatter: function (val) {
          if (val === undefined || val === null) return "";
          const formattedVal = val.toLocaleString(); // <-- adds thousand separators
          return unit === "$"
            ? `${unit} ${formattedVal}`
            : `${formattedVal} ${unit}`;
        },
      })),
    },
  };

  return (
    <GraphLayout
      title={graphTitle}
      labels={labels}
      series={series}
      extraCols={extraCols}
      addOnComponent={addOnComponent}
    >
      <ReactApexChart
        height={300}
        options={options}
        series={series}
        type="line"
      />
    </GraphLayout>
  );
};

export default LineChart;
