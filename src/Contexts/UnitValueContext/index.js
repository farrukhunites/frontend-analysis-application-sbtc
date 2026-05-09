import { createContext, useState } from "react";

export const UnitValueContext = createContext();

export const UnitValueProvider = ({ children }) => {
  const [unitType, setUnitType] = useState("ctn");
  const [valueType, setValueType] = useState("net");

  return (
    <UnitValueContext.Provider value={{ unitType, setUnitType, valueType, setValueType }}>
      {children}
    </UnitValueContext.Provider>
  );
};
