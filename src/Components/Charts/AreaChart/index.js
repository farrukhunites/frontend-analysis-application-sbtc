import { Empty } from "antd";
import ReactApexChart from "react-apexcharts";
import GraphLayout from "../../GraphLayout";
import { CHART_COLORS, CHART_AXIS_COLOR, CHART_LEGEND_COLOR } from "../chartConfig";

const AreaChart = ({
  labels,
  series,
  colourTheme = CHART_COLORS,
  graphTitle = "Undefined",
  units = [],
  extraCols = [],
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
      type: "area",
      stacked: false,
      toolbar: {
        show: false,
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        type: "vertical",
        shadeIntensity: 0,
        gradientToColors: ["rgba(59, 130, 246, 0.04)"],
        inverseColors: false,
        opacityFrom: 0.48,
        opacityTo: 0.06,
        stops: [5, 95],
      },
    },
    colors: colourTheme,
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },

    xaxis: {
      categories: labels,
      labels: {
        offsetX: 10,
      },
      axisBorder: {
        show: true,
        color: CHART_AXIS_COLOR,
      },
      axisTicks: {
        show: true,
        color: CHART_AXIS_COLOR,
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
        color: CHART_AXIS_COLOR,
      },
      axisTicks: {
        show: true,
        color: CHART_AXIS_COLOR,
      },
    },
    legend: {
      position: "bottom",
      horizontalAlign: "center",
      offsetY: 8,
      labels: {
        colors: CHART_LEGEND_COLOR,
        useSeriesColors: false,
        style: {
          fontFamily: "Inter",
          fontSize: "12px",
          fontWeight: 400,
        },
      },
    },
    grid: {
      borderColor: CHART_AXIS_COLOR,
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
    >
      <ReactApexChart
        height={300}
        options={options}
        series={series}
        type="area"
      />
    </GraphLayout>
  );
};

export default AreaChart;
