import { useState } from "react";
import { Button, DatePicker, Space } from "antd";
import dayjs from "dayjs";
import { useDateFilter } from "../../Contexts/DateFilterContext";
import { UndoOutlined, DownOutlined, FilterFilled } from "@ant-design/icons";
import "./style.css";

const DateFilter = () => {
  const { selectedMonth, setSelectedMonth } = useDateFilter();
  const [monthValue, setMonthValue] = useState(null);

  const handleChange = (value) => {
    if (!value) {
      setSelectedMonth("");
      setMonthValue(null);
      return;
    }

    const ym = value.format("YYYYMM"); // convert to 202511 format
    setSelectedMonth(ym);
    setMonthValue(value);
  };

  const handleReset = () => {
    setSelectedMonth("");
    setMonthValue(null);
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
