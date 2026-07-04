import { DatePicker } from "antd";
import dayjs from "dayjs";

// Presets used across every month-range picker in the app. Kept in one place
// so adding/renaming a preset (e.g. "Last 12 months") propagates everywhere.
const buildPresets = () => {
  const thisMonth = dayjs().startOf("month");
  const startOfYear = dayjs().startOf("year");
  return [
    { label: "This month",     value: [thisMonth, thisMonth] },
    { label: "Last month",     value: [thisMonth.subtract(1, "month"), thisMonth.subtract(1, "month")] },
    { label: "Last 3 months",  value: [thisMonth.subtract(2, "month"),  thisMonth] },
    { label: "Last 6 months",  value: [thisMonth.subtract(5, "month"),  thisMonth] },
    { label: "Last 12 months", value: [thisMonth.subtract(11, "month"), thisMonth] },
    { label: "YTD",            value: [startOfYear, thisMonth] },
    {
      label: "Last year",
      value: [
        dayjs().subtract(1, "year").startOf("year"),
        dayjs().subtract(1, "year").endOf("year").startOf("month"),
      ],
    },
  ];
};

/**
 * MonthRangePicker — thin wrapper around antd's DatePicker.RangePicker configured
 * for month granularity with the app's standard preset list.
 *
 * Props: value=[from,to] as dayjs pair, onChange({from,to} dayjs pair or nulls),
 * plus any extra props are forwarded to the underlying RangePicker.
 */
const MonthRangePicker = ({ value, onChange, ...rest }) => (
  <DatePicker.RangePicker
    picker="month"
    value={value}
    onChange={(v) => {
      if (v && v[0] && v[1]) onChange?.([v[0], v[1]]);
    }}
    format="MMM YYYY"
    allowClear={false}
    placeholder={["From month", "To month"]}
    presets={buildPresets()}
    {...rest}
  />
);

export default MonthRangePicker;
