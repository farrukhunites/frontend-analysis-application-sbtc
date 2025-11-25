import React, { createContext, useContext, useState } from "react";

const DateFilterContext = createContext();

export const DateFilterProvider = ({ children }) => {
  // holds only single month in YYYYMM
  const [selectedMonth, setSelectedMonth] = useState("");

  return (
    <DateFilterContext.Provider value={{ selectedMonth, setSelectedMonth }}>
      {children}
    </DateFilterContext.Provider>
  );
};

export const useDateFilter = () => useContext(DateFilterContext);
