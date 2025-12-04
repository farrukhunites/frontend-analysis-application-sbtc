import { decryptText, encryptText } from "./Encryption";

const updateUserStates = (setUserData, setUserToken) => {
  const localStorageItems = localStorage;
  const obj = {};
  if (localStorageItems.length !== 0) {
    for (let key in localStorageItems) {
      if (localStorageItems[key] && decryptText(key) === "user") {
        obj.user =
          localStorageItems[key] &&
          JSON.parse(decryptText(localStorageItems[key]));
      }

      if (localStorageItems[key] && decryptText(key) === "token") {
        obj.token =
          localStorageItems[key] &&
          JSON.parse(decryptText(localStorageItems[key]));
      }
    }
  }
  setUserData(obj.user);
  setUserToken(obj.token);
  return obj;
};

const getToken = () => {
  const localStorageItems = localStorage;

  if (localStorageItems.length !== 0) {
    for (let key in localStorageItems) {
      if (localStorageItems[key] && decryptText(key) === "token") {
        return JSON.parse(decryptText(localStorageItems[key])).access;
      }
    }
  }
};

const getRefreshToken = () => {
  const localStorageItems = localStorage;

  if (localStorageItems.length !== 0) {
    for (let key in localStorageItems) {
      if (localStorageItems[key] && decryptText(key) === "token") {
        return JSON.parse(decryptText(localStorageItems[key])).refresh;
      }
    }
  }
};

const getUser = async () => {
  const localStorageItems = localStorage;

  if (localStorageItems.length !== 0) {
    for (let key in localStorageItems) {
      if (localStorageItems[key] && decryptText(key) === "user") {
        return JSON.parse(decryptText(localStorageItems[key]));
      }
    }
  }
};

const handleLogout = (setUserData, setUserToken, setUserPages) => {
  const localStorageItems = localStorage;

  if (localStorageItems.length !== 0) {
    for (let key in localStorageItems) {
      if (localStorageItems[key] && decryptText(key) === "user") {
        localStorage.removeItem(key);
      }

      if (localStorageItems[key] && decryptText(key) === "token") {
        localStorage.removeItem(key);
      }
    }
    setUserData({});
    setUserToken({ access: "", refresh: "" });
    setUserPages([]);
  }
};

const handleUpdateUser = (setUserData, userData) => {
  const localStorageItems = localStorage;

  for (let key in localStorageItems) {
    if (localStorageItems[key] && decryptText(key) === "user") {
      localStorage.removeItem(key);
    }
  }
  localStorage.setItem(
    encryptText("user"),
    encryptText(JSON.stringify(userData))
  );
  setUserData(userData);
};

export { handleLogout, getToken, getUser, getRefreshToken, handleUpdateUser };
export default updateUserStates;
