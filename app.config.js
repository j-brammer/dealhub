const appJson = require('./app.json');

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
      dealhubApiUrl: process.env.EXPO_PUBLIC_DEALHUB_API_URL || '',
    },
  },
};
