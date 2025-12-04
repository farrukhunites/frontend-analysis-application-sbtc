import React, { useContext } from "react";
import { BrowserRouter } from "react-router-dom";
import UserRoutes from "./UserRoutes";
import PublicRoutes from "./PublicRoutes.js";
import AppLayout from "../Layout/index.js";
import { UserContext } from "../App";

const AppRoutes = () => {
  const { userData } = useContext(UserContext);

  let routesComponent;

  switch (userData?.role) {
    case "user":
      routesComponent = (
        <AppLayout userType={"user"} contents={<UserRoutes />} />
      );
      break;
    default:
      routesComponent = <PublicRoutes />;
      break;
  }

  return <BrowserRouter>{routesComponent}</BrowserRouter>;
};

export default AppRoutes;
