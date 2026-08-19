#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const readText = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const parseJsonFile = (relativePath) => {
  try {
    JSON.parse(readText(relativePath));
  } catch (error) {
    throw new Error(`${relativePath} is not valid JSON: ${error.message}`);
  }
};

const jsonFiles = [
  "package.json",
  "package-lock.json",
  "app.json",
  "firebase.json",
  "database.rules.json",
];

jsonFiles.forEach(parseJsonFile);

const packageJson = JSON.parse(readText("package.json"));
const packageLock = JSON.parse(readText("package-lock.json"));
const packageLockRoot = packageLock.packages?.[""];
assert(packageLock.name === packageJson.name, "package-lock.json name mismatch");
assert(
  packageLock.version === packageJson.version,
  "package-lock.json version mismatch",
);
assert(packageLockRoot, "package-lock.json missing root package entry");

for (const section of ["dependencies", "devDependencies"]) {
  const packageJsonEntries = packageJson[section] ?? {};
  const packageLockEntries = packageLockRoot[section] ?? {};
  for (const [name, version] of Object.entries(packageJson[section] ?? {})) {
    assert(
      packageLockEntries[name] === version,
      `package-lock.json root ${section} missing ${name}@${version}`,
    );
  }
  for (const name of Object.keys(packageLockEntries)) {
    assert(
      packageJsonEntries[name] === packageLockEntries[name],
      `package-lock.json root ${section} has stale ${name}`,
    );
  }
}

const firebaseJson = JSON.parse(readText("firebase.json"));
assert(
  firebaseJson.database?.rules === "database.rules.json",
  "firebase.json must reference database.rules.json",
);
assert(
  firebaseJson.storage?.rules === "storage.rules",
  "firebase.json must reference storage.rules",
);

const databaseRules = JSON.parse(readText("database.rules.json"));
const roomCodeRules = databaseRules.rules?.roomCodes?.$code;
assert(roomCodeRules?.[".read"] === "auth != null", "database.rules.json roomCodes must require auth reads");
assert(
  roomCodeRules?.[".write"] ===
    "auth != null && ((!data.exists() && newData.exists() && newData.isString() && $code.length === 6 && root.child('rooms').child(newData.val()).child('ownerId').val() === auth.uid) || (data.exists() && !newData.exists() && (!root.child('rooms').child(data.val()).exists() || root.child('rooms').child(data.val()).child('ownerId').val() === auth.uid)) || (data.exists() && newData.exists() && newData.isString() && $code.length === 6 && root.child('rooms').child(data.val()).child('ownerId').val() === auth.uid && root.child('rooms').child(newData.val()).child('ownerId').val() === auth.uid))",
  "database.rules.json roomCodes must be owner-scoped six-character code maps",
);
assert(
  roomCodeRules?.[".validate"] === "!newData.exists() || newData.isString()",
  "database.rules.json roomCodes must store string room ids",
);
const postCleanupRule =
  "auth != null && !newData.exists() && (!data.exists() || root.child('communityPosts').child($postId).child('authorId').val() === auth.uid)";
for (const pathName of ["communityPostCheers", "communityPostComments"]) {
  assert(
    databaseRules.rules?.[pathName]?.$postId?.[".write"] === postCleanupRule,
    `database.rules.json missing post cleanup rule for ${pathName}`,
  );
}

const storageRules = readText("storage.rules");
for (const expected of [
  "service firebase.storage",
  "/profileImages/{userId}/avatar.jpg",
  "request.auth.uid == userId",
]) {
  assert(storageRules.includes(expected), `storage.rules missing ${expected}`);
}

const envExample = readText(".env.example");
const requiredEnvKeys = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_DATABASE_URL",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
  "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
  "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID",
  "EXPO_PUBLIC_KAKAO_REST_API_KEY",
];

for (const key of requiredEnvKeys) {
  assert(
    new RegExp(`^${key}=`, "m").test(envExample),
    `.env.example missing ${key}`,
  );
}

const textScanTargets = [
  ".env.example",
  ".github",
  "__tests__",
  "app",
  "app.json",
  "constants",
  "database.rules.json",
  "docs",
  "eas.json",
  "features",
  "firebase.json",
  "jest.config.js",
  "jest.setup.ts",
  "package.json",
  "README.md",
  "storage.rules",
  "utils",
];

const ignoredDirectories = new Set([
  ".expo",
  ".git",
  "coverage",
  "dist",
  "node_modules",
  "web-build",
]);

const binaryExtensions = new Set([
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
]);

const collectTextFiles = (target) => {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) return [];

  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    return binaryExtensions.has(path.extname(target).toLowerCase())
      ? []
      : [target];
  }

  if (stat.isDirectory()) {
    const entries = fs.readdirSync(absolute, { withFileTypes: true });
    return entries.flatMap((entry) => {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
        return [];
      }
      return collectTextFiles(path.join(target, entry.name));
    });
  }

  return [];
};

const sensitivePatterns = [
  {
    label: "Firebase Web API key",
    pattern: /AIza[0-9A-Za-z_-]{35}/,
  },
  {
    label: "Google OAuth client ID",
    pattern: /\b\d{6,}-[a-z0-9-]+\.apps\.googleusercontent\.com\b/,
  },
  {
    label: "private key block",
    pattern: /-----BEGIN (?:RSA )?PRIVATE KEY-----/,
  },
];

for (const relativePath of textScanTargets.flatMap(collectTextFiles)) {
  const content = readText(relativePath);
  for (const { label, pattern } of sensitivePatterns) {
    assert(
      !pattern.test(content),
      `${relativePath} contains a hardcoded ${label}`,
    );
  }
}

const forbiddenTestPatterns = [
  {
    label: "focused test",
    pattern: /\b(?:describe|it|test)\.only\s*\(/,
  },
  {
    label: "skipped test",
    pattern: /\b(?:describe|it|test)\.skip\s*\(/,
  },
  {
    label: "focused test alias",
    pattern: /\b(?:fit|fdescribe)\s*\(/,
  },
];

for (const relativePath of collectTextFiles("__tests__")) {
  const content = readText(relativePath);
  for (const { label, pattern } of forbiddenTestPatterns) {
    assert(!pattern.test(content), `${relativePath} contains a ${label}`);
  }
}

console.log("config ok");
