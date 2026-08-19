describe("firebase config", () => {
  const originalEnv = process.env;
  const firebaseEnv = {
    EXPO_PUBLIC_FIREBASE_API_KEY: "test-api-key",
    EXPO_PUBLIC_FIREBASE_APP_ID: "test-app-id",
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
    EXPO_PUBLIC_FIREBASE_DATABASE_URL:
      "https://test-default-rtdb.region.firebasedatabase.app",
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "test-sender-id",
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: "test-project",
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: "test.firebasestorage.app",
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv, ...firebaseEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("initializes Firebase services from Expo public environment variables", () => {
    const { initializeApp } = require("firebase/app") as {
      initializeApp: jest.Mock;
    };
    const { getAuth } = require("firebase/auth") as { getAuth: jest.Mock };
    const { getDatabase } = require("firebase/database") as {
      getDatabase: jest.Mock;
    };
    const { getStorage } = require("firebase/storage") as {
      getStorage: jest.Mock;
    };

    const { app, firebaseConfig } = require("../../utils/firebaseConfig") as typeof import("../../utils/firebaseConfig");

    expect(firebaseConfig).toEqual({
      apiKey: "test-api-key",
      appId: "test-app-id",
      authDomain: "test.firebaseapp.com",
      databaseURL: "https://test-default-rtdb.region.firebasedatabase.app",
      messagingSenderId: "test-sender-id",
      projectId: "test-project",
      storageBucket: "test.firebasestorage.app",
    });
    expect(initializeApp).toHaveBeenCalledWith(firebaseConfig);
    expect(getDatabase).toHaveBeenCalledWith(app);
    expect(getAuth).toHaveBeenCalledWith(app);
    expect(getStorage).toHaveBeenCalledWith(app);
  });

  it("fails fast when a required Firebase environment variable is missing or blank", () => {
    const { initializeApp } = require("firebase/app") as {
      initializeApp: jest.Mock;
    };

    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = "";
    expect(() => require("../../utils/firebaseConfig")).toThrow(
      /EXPO_PUBLIC_FIREBASE_API_KEY/,
    );
    expect(initializeApp).not.toHaveBeenCalled();

    jest.resetModules();
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      ...firebaseEnv,
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: "   ",
    };
    const { initializeApp: initializeAppAfterReset } = require("firebase/app") as {
      initializeApp: jest.Mock;
    };

    expect(() => require("../../utils/firebaseConfig")).toThrow(
      /EXPO_PUBLIC_FIREBASE_PROJECT_ID/,
    );
    expect(initializeAppAfterReset).not.toHaveBeenCalled();
  });
});
