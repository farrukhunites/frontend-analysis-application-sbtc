import { Navigate, Route, Routes } from "react-router-dom";
import Login from "../Pages/Public/Login";

const PublicRoutes = ({ setUserType }) => {
  return (
    <Routes>
      <Route path="/login" element={<Login setUserType={setUserType} />} />
      <Route path="*" element={<Navigate to={"/login"} />} />
    </Routes>
  );
};

export default PublicRoutes;
