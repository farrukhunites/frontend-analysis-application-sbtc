import React, { createContext, useContext, useState } from "react";

const DateFilterContext = createContext();

export const DateFilterProvider = ({ children }) => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <DateFilterContext.Provider value={{ from, to, setFrom, setTo }}>
      {children}
    </DateFilterContext.Provider>
  );
};

export const useDateFilter = () => useContext(DateFilterContext);
