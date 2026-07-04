import React, { createContext, useContext, useState } from "react";
import dayjs from "dayjs";

const DateFilterContext = createContext();

// Default to the current month so reports that fetch on mount don't get
// stuck behind a `!month` guard in their API layer (Daily Sales, Channel
// Achievement, etc.). Users can still change it via DateFilter.
const currentMonthYYYYMM = () => dayjs().format("YYYYMM");

export const DateFilterProvider = ({ children }) => {
  // holds only single month in YYYYMM
  const [selectedMonth, setSelectedMonth] = useState(currentMonthYYYYMM);

  return (
    <DateFilterContext.Provider value={{ selectedMonth, setSelectedMonth }}>
      {children}
    </DateFilterContext.Provider>
  );
};

export const useDateFilter = () => useContext(DateFilterContext);
