import { createContext, useEffect, useState } from "react";

export const UnitValueContext = createContext();

const STORAGE_KEY = "sbtc.unitValueMode";

const readMode = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "val" ? "val" : "qty";
  } catch {
    return "qty";
  }
};

export const UnitValueProvider = ({ children }) => {
  const [unitType, setUnitType] = useState("ctn");
  const [valueType, setValueType] = useState("net");
  const [mode, setModeState] = useState(readMode);

  const setMode = (next) => {
    const v = next === "val" ? "val" : "qty";
    setModeState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore quota errors */
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  // What every API call should send for unit_type.
  // In value mode, override CTN/PCS and ask the backend for the value column.
  const effectiveUnitType = mode === "val" ? "val" : unitType;

  return (
    <UnitValueContext.Provider
      value={{
        unitType,
        setUnitType,
        valueType,
        setValueType,
        mode,
        setMode,
        effectiveUnitType,
      }}
    >
      {children}
    </UnitValueContext.Provider>
  );
};
