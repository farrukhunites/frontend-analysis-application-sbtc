import { useState, useEffect } from "react";
import { Button, DatePicker, Space } from "antd";
import dayjs from "dayjs";
import { useDateFilter } from "../../Contexts/DateFilterContext";
import { UndoOutlined, DownOutlined, FilterFilled } from "@ant-design/icons";
import "./style.css";

const DateFilter = () => {
  const { selectedMonth, setSelectedMonth } = useDateFilter();

  // If selectedMonth is empty, default to current month
  const defaultMonth = selectedMonth ? dayjs(selectedMonth, "YYYYMM") : dayjs();
  const [monthValue, setMonthValue] = useState(defaultMonth);

  // whenever component mounts, set the default in context if empty
  useEffect(() => {
    if (!selectedMonth) {
      const currentYM = dayjs().format("YYYYMM");
      setSelectedMonth(currentYM);
    }
  }, [selectedMonth, setSelectedMonth]);

  const handleChange = (value) => {
    if (!value) {
      setSelectedMonth("");
      setMonthValue(null);
      return;
    }
    const ym = value.format("YYYYMM"); // "202511"
    setSelectedMonth(ym);
    setMonthValue(value);
  };

  const handleReset = () => {
    const now = dayjs();
    const ym = now.format("YYYYMM");
    setSelectedMonth(ym);
    setMonthValue(now);
  };

  return (
    <div className="date-filter">
      <Space>
        <FilterFilled style={{ fontSize: 16, padding: 8, color: "#A2A8B0" }} />

        <DatePicker
          picker="month"
          value={monthValue}
          placeholder="Month"
          suffixIcon={<DownOutlined style={{ color: "#2662D9" }} />}
          onChange={handleChange}
        />

        <Button danger icon={<UndoOutlined />} onClick={handleReset}>
          Reset
        </Button>
      </Space>
    </div>
  );
};

export default DateFilter;
