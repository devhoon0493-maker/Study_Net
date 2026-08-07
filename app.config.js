const appJson = require("./app.json");

const expo = appJson.expo;

module.exports = {
  ...expo,
  android: {
    ...expo.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? expo.android.googleServicesFile,
  },
};
