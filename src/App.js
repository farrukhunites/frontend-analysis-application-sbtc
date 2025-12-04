import { DateFilterProvider } from "./Contexts/DateFilterContext";
import { ProductProvider } from "./Contexts/ProductContext";
import { createContext, useEffect, useState } from "react";
import updateUserStates, {
  getRefreshToken,
  handleLogout,
} from "./Utils/UpdateUserState";
import { refresh } from "./API/Auth";
import { decryptText, encryptText } from "./Utils/Encryption";
import axios from "axios";
import { Spin } from "antd";
import AppRoutes from "./Routes/AppRoutes";

const UserContext = createContext();

function App() {
  const [userData, setUserData] = useState({
    name: "",
    employee_code: "",
    position: "",
    allowed_branches: "",
    allowed_products: "",
  });
  const [userToken, setUserToken] = useState({ access: "", refresh: "" });
  const [loading, setLoading] = useState(false);

  const refreshAccessToken = async (token) => {
    let myRefreshToken = token?.refresh;
    if (!myRefreshToken) {
      myRefreshToken = getRefreshToken();
    }
    const res = await refresh(myRefreshToken);
    if (res?.status === 200) {
      const localStorageItems = localStorage;
      if (localStorageItems.length !== 0) {
        for (let key in localStorageItems) {
          if (localStorageItems[key] && decryptText(key) === "token") {
            localStorage.removeItem(key);
          }
        }
      }
      localStorage.setItem(
        encryptText("token"),
        encryptText(
          JSON.stringify({
            access: res?.data?.access,
            refresh: res?.data?.refresh,
          })
        )
      );
      updateUserStates(setUserData, setUserToken);

      return res?.data?.access;
    } else {
      handleLogout(setUserData, setUserToken);
      window.location.href = "/login";
      return null;
    }
  };

  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      if (
        error?.response?.status === 401 &&
        error.config.url !== `${process.env.REACT_APP_BACKEND_URL}token/` &&
        error.config.url !==
          `${process.env.REACT_APP_BACKEND_URL}token/refresh/`
      ) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          error.config.headers["Authorization"] = "Bearer " + newToken;
          return axios(error.config);
        } else {
          handleLogout(setUserData, setUserToken);
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }
  );

  useEffect(() => {
    const initializeUserState = async () => {
      setLoading(true);
      const updatedStates = updateUserStates(setUserData, setUserToken);
      if (
        updatedStates?.token?.access &&
        updatedStates?.token?.refresh &&
        loading
      ) {
        await refreshAccessToken(updatedStates.token);
      }
      setLoading(false);
    };

    if (
      userData.name === "" &&
      userToken.access === "" &&
      userToken.refresh === "" &&
      loading
    ) {
      initializeUserState();
    } else {
      setLoading(false);
    }
  }, [loading, userToken?.refresh, userData?.name, userToken?.access]);

  return (
    <DateFilterProvider>
      <ProductProvider>
        <UserContext.Provider
          value={{
            userData,
            setUserData,
            userToken,
            setUserToken,
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                width: "100%",
              }}
            >
              <Spin size="large" />
            </div>
          ) : (
            <AppRoutes />
          )}
        </UserContext.Provider>
      </ProductProvider>
    </DateFilterProvider>
  );
}

export default App;
export { UserContext };
