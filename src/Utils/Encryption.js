import CryptoJS from "crypto-js";

const encryptText = (text) => {
  try {
    if (!text) throw new Error("No text provided for encryption");
    return CryptoJS.AES.encrypt(
      text,
      process.env.REACT_APP_ENCRYPTION_SECRET
    ).toString();
  } catch (e) {
    return null;
  }
};

const decryptText = (text) => {
  try {
    if (!text) throw new Error("No text provided for decryption");
    const decryptedBytes = CryptoJS.AES.decrypt(
      text,
      process.env.REACT_APP_ENCRYPTION_SECRET
    );
    const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) throw new Error("Decryption failed");
    return decryptedText;
  } catch (e) {
    return null;
  }
};

export { encryptText, decryptText };
