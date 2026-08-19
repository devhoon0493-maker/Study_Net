(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.setTimeout(15_000);

process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??= "test-api-key";
process.env.EXPO_PUBLIC_FIREBASE_APP_ID ??= "test-app-id";
process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ??= "test.firebaseapp.com";
process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ??=
  "https://test-default-rtdb.region.firebasedatabase.app";
process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??= "test-sender-id";
process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ??= "test-project";
process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ??= "test.firebasestorage.app";
process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??=
  "test-web-client-id.apps.googleusercontent.com";

jest.mock("react-native", () => {
  const reactNative = jest.requireActual("react-native");

  Object.defineProperty(reactNative, "useWindowDimensions", {
    configurable: true,
    value: jest.fn(() => ({
      fontScale: 1,
      height: 844,
      scale: 1,
      width: 390,
    })),
  });

  return reactNative;
});

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(() => ({})),
}));

jest.mock("firebase/auth", () => ({
  EmailAuthProvider: {
    credential: jest.fn((email: string, password: string) => ({
      email,
      password,
    })),
  },
  createUserWithEmailAndPassword: jest.fn(() =>
    Promise.resolve({
      user: {
        uid: "created-user",
        email: "created@example.com",
        displayName: null,
        photoURL: null,
        emailVerified: false,
      },
    }),
  ),
  deleteUser: jest.fn(() => Promise.resolve()),
  getAuth: jest.fn(() => ({ currentUser: null })),
  GoogleAuthProvider: {
    credential: jest.fn((idToken: string) => ({ idToken })),
  },
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(null);
    return jest.fn();
  }),
  reauthenticateWithCredential: jest.fn(() => Promise.resolve()),
  reload: jest.fn(() => Promise.resolve()),
  sendEmailVerification: jest.fn(() => Promise.resolve()),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
  signInWithCredential: jest.fn(() =>
    Promise.resolve({
      user: {
        uid: "social-user",
        email: "social@example.com",
        displayName: "Social User",
        photoURL: null,
        emailVerified: true,
      },
    }),
  ),
  signInWithEmailAndPassword: jest.fn(() =>
    Promise.resolve({
      user: {
        uid: "email-user",
        email: "user@example.com",
        displayName: "Email User",
        photoURL: null,
        emailVerified: true,
      },
    }),
  ),
  signOut: jest.fn(() => Promise.resolve()),
  updatePassword: jest.fn(() => Promise.resolve()),
  updateProfile: jest.fn(() => Promise.resolve()),
}));

jest.mock("firebase/database", () => ({
  equalTo: jest.fn((value) => ({ type: "equalTo", value })),
  get: jest.fn(() =>
    Promise.resolve({
      exists: () => false,
      val: () => null,
    }),
  ),
  getDatabase: jest.fn(() => ({})),
  limitToLast: jest.fn((value) => ({ type: "limitToLast", value })),
  onValue: jest.fn(),
  orderByChild: jest.fn((value) => ({ type: "orderByChild", value })),
  query: jest.fn((baseRef, ...constraints) => ({
    ...baseRef,
    constraints,
  })),
  ref: jest.fn((db, path) => ({ db, path })),
  set: jest.fn(() => Promise.resolve()),
  update: jest.fn(() => Promise.resolve()),
}));

jest.mock("firebase/storage", () => ({
  deleteObject: jest.fn(() => Promise.resolve()),
  getDownloadURL: jest.fn(() => Promise.resolve("https://cdn.example.com/avatar.jpg")),
  getStorage: jest.fn(() => ({})),
  ref: jest.fn((storage, path) => ({ path, storage })),
  uploadString: jest.fn(() => Promise.resolve()),
}));
