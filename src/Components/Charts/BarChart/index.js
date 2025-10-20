import { Empty } from "antd";
import ReactApexChart from "react-apexcharts";
import GraphLayout from "../../GraphLayout";

const BarChart = ({
  labels,
  series,
  colourTheme = ["#000", "#fff"],
  graphTitle = "Undefined",
  units = [],
  dottedline = [],
  extraCols = [],
  addOnComponent = null,
  onClickFunction = null,
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
      type: "bar",
      toolbar: { show: false },
    },
    colors: colourTheme,
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "vertical",
        gradientToColors: [colourTheme[0]],
        inverseColors: false,
      },
      colors: colourTheme,
    },
    dataLabels: {
      enabled: false,
    },
    yaxis: {
      labels: {
        show: true,
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
      show: true,
      position: "top",
      fontSize: "12px",
      labels: {
        colors: "#000",
        style: {
          fontFamily: "Inter",
          fontSize: "12px",
          fontWeight: 400,
        },
      },
    },
    annotations: {
      yaxis: dottedline.map((d) => ({
        y: d.value, // horizontal line position
        borderColor: d.color || "#000",
        strokeDashArray: d.dashArray || 5,
        strokeWidth: d.width || 2,
        label: {
          borderColor: "transparent",
          style: { color: d.color || "#000", background: "transparent" },
          text: d.label || "",
        },
      })),
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
      },
    },
    xaxis: {
      categories: labels,
      labels: {
        show: true,
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
    grid: {
      borderColor: "#ccc",
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
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
      onClickFunction={onClickFunction}
    >
      <ReactApexChart
        height={300}
        options={options}
        series={series}
        type="bar"
      />
    </GraphLayout>
  );
};

export default BarChart;
