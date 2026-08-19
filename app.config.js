const appJson = require("./app.json");
const fs = require("fs");
const path = require("path");

const expo = appJson.expo;
const googleServicesEnv = process.env.GOOGLE_SERVICES_JSON?.trim();

const resolveGoogleServicesFile = () => {
  if (!googleServicesEnv) return expo.android.googleServicesFile;

  if (googleServicesEnv.endsWith(".json") || googleServicesEnv.includes("/")) {
    return googleServicesEnv;
  }

  const outputPath = path.join(__dirname, "google-services.generated.json");
  const content = googleServicesEnv.startsWith("{")
    ? googleServicesEnv
    : Buffer.from(googleServicesEnv, "base64").toString("utf8");
  JSON.parse(content);
  fs.writeFileSync(outputPath, content);
  return "./google-services.generated.json";
};

module.exports = {
  ...expo,
  android: {
    ...expo.android,
    googleServicesFile: resolveGoogleServicesFile(),
  },
};
