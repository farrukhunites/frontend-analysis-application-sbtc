import { useEffect, useRef, useState } from "react";
import { Button, DatePicker, Space, message } from "antd";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";
import { useDateFilter } from "../../Contexts/DateFilterContext";
import { UndoOutlined, DownOutlined, FilterFilled } from "@ant-design/icons";
import "./style.css";

dayjs.extend(customParseFormat);
dayjs.extend(isBetween);

const { RangePicker } = DatePicker;

const DateFilter = () => {
  const { setFrom, setTo } = useDateFilter();
  const [type, setType] = useState(null);
  const [dateValue, setDateValue] = useState(null);
  const [weekValue, setWeekValue] = useState(null);
  const [monthValue, setMonthValue] = useState(null);
  const [rangeValue, setRangeValue] = useState([]);

  const defaultDates = useRef({ from: "", to: "" });

  const formatDate = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")} ${String(
      date.getHours()
    ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(
      date.getSeconds()
    ).padStart(2, "0")}`;

  const handleSetRange = (fromDate, toDate) => {
    const from = dayjs(fromDate).startOf("day").format("YYYY-MM-DD HH:mm:ss");
    const to = dayjs(toDate).endOf("day").format("YYYY-MM-DD HH:mm:ss");
    setFrom(from);
    setTo(to);
  };

  const handleChange = (value, dateString, pickerType) => {
    setType(pickerType);

    setDateValue(null);
    setWeekValue(null);
    setMonthValue(null);
    setRangeValue([]);

    let from, to;

    if (!value) {
      const today = dayjs();
      from = today.startOf("day");
      to = today.endOf("day");
      setDateValue(today); // set current date back
      setFrom(from.format("YYYY-MM-DD HH:mm:ss"));
      setTo(to.format("YYYY-MM-DD HH:mm:ss"));
      return;
    }

    switch (pickerType) {
      case "date":
        setDateValue(value);
        from = dayjs(value).startOf("day");
        to = dayjs(value).endOf("day");
        break;
      case "week":
        setWeekValue(value);
        from = dayjs(value).startOf("week");
        to = dayjs(value).endOf("week");
        break;
      case "month":
        setMonthValue(value);
        from = dayjs(value).startOf("month");
        to = dayjs(value).endOf("month");
        break;
      case "custom":
        if (!value || value.length !== 2) return;

        const diff = dayjs(value[1]).diff(dayjs(value[0]), "day");
        if (diff > 30) {
          message.error("You cannot select a range longer than 30 days.");
          return;
        }
        setRangeValue(value);
        from = dayjs(value[0]).startOf("day");
        to = dayjs(value[1]).endOf("day");
        break;
      default:
        return;
    }

    setFrom(from.format("YYYY-MM-DD HH:mm:ss"));
    setTo(to.format("YYYY-MM-DD HH:mm:ss"));
  };

  const handleReset = () => {
    setType(null);
    setDateValue(null);
    setWeekValue(null);
    setMonthValue(null);
    setRangeValue([]);
    setFrom(defaultDates.current.from);
    setTo(defaultDates.current.to);
  };

  useEffect(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0
    );
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    );

    const from = formatDate(todayStart);
    const to = formatDate(todayEnd);

    defaultDates.current = { from, to };

    setFrom(from);
    setTo(to);
  }, [setFrom, setTo]);

  return (
    <div className="date-filter">
      <Space>
        <FilterFilled
          style={{ fontSize: "16px", padding: "8px", color: "#A2A8B0" }}
        />

        <DatePicker
          value={monthValue}
          suffixIcon={<DownOutlined style={{ color: "#2662D9" }} />}
          placeholder="Month"
          picker="month"
          onChange={(value, dateString) =>
            handleChange(value, dateString, "month")
          }
        />

        <Button danger icon={<UndoOutlined />} onClick={handleReset}>
          Reset
        </Button>
      </Space>
    </div>
  );
};

export default DateFilter;
