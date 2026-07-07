import { DateFilterProvider } from "./Contexts/DateFilterContext";
import { ProductProvider } from "./Contexts/ProductContext";
import { UnitValueProvider } from "./Contexts/UnitValueContext";
import { createContext, useEffect, useState } from "react";
import updateUserStates, {
  getRefreshToken,
  handleLogout,
} from "./Utils/UpdateUserState";
import { refresh, getCurrentUser } from "./API/Auth";
import { decryptText, encryptText } from "./Utils/Encryption";
import axios from "axios";
import { Spin, ConfigProvider } from "antd";
import AppRoutes from "./Routes/AppRoutes";
import CellSelectionOverlay from "./Components/CellSelectionOverlay";

const appTheme = {
  token: {
    colorPrimary: "#3B82F6",
    colorBgContainer: "#FFFFFF",
    colorBgLayout: "#F0F4F8",
    borderRadius: 8,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    colorBorderSecondary: "#E2E8F0",
    colorText: "#1E293B",
    colorTextSecondary: "#64748B",
  },
  components: {
    Table: {
      headerBg: "#1E3A5F",
      headerColor: "#FFFFFF",
    },
    Menu: {
      darkItemBg: "transparent",
      darkItemSelectedBg: "rgba(59, 130, 246, 0.15)",
      darkItemSelectedColor: "#3B82F6",
      darkItemHoverBg: "rgba(59, 130, 246, 0.08)",
    },
    Button: { borderRadius: 8 },
    Select: { borderRadius: 8 },
  },
};

const UserContext = createContext();

function App() {
  const [userData, setUserData] = useState({
    name: "",
    employee_code: "",
    position: "",
    allowed_branches: "",
    allowed_products: "",
    allowed_channels: "",
    role: "",
  });
  const [userToken, setUserToken] = useState({ access: "", refresh: "" });
  const [loading, setLoading] = useState(true);

  const refreshAccessToken = async (token) => {
    let myRefreshToken = token?.refresh;
    if (!myRefreshToken) {
      myRefreshToken = getRefreshToken();
    }
    const res = await refresh(myRefreshToken);
    // Backend flags a kicked-out session with code "session_replaced" (see
    // core/authentication.py). Stash a flag the Login page reads to show a
    // friendlier notice than a generic "session expired".
    const errCode =
      res?.response?.data?.code || res?.data?.code;
    if (errCode === "session_replaced") {
      try {
        localStorage.setItem("auth_notice", "session_replaced");
      } catch {}
    }
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
          }),
        ),
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
    },
  );

  useEffect(() => {
    const initializeUserState = async () => {
      setLoading(true);
      updateUserStates(setUserData, setUserToken);

      const localToken = getRefreshToken();
      if (localToken) {
        await refreshAccessToken({ refresh: localToken });
        // Re-fetch access metadata from server so denied_pages / denied_reports
        // reflect any admin changes made after the last login. Merge with the
        // localStorage copy so we keep fields the /me endpoint doesn't return.
        const fresh = await getCurrentUser();
        if (fresh && !fresh.error) {
          const stored = updateUserStates(setUserData, setUserToken)?.user || {};
          const merged = { ...stored, ...fresh };
          localStorage.setItem(
            encryptText("user"),
            encryptText(JSON.stringify(merged)),
          );
          setUserData(merged);
        }
      }

      setLoading(false);
    };

    initializeUserState();
  }, []);

  return (
    <ConfigProvider theme={appTheme}>
      <UnitValueProvider>
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
                <>
                  <AppRoutes />
                  <CellSelectionOverlay />
                </>
              )}
            </UserContext.Provider>
          </ProductProvider>
        </DateFilterProvider>
      </UnitValueProvider>
    </ConfigProvider>
  );
}

export default App;
export { UserContext };
