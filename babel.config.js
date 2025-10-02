module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      '@react-native/babel-preset',
      'nativewind/babel',
    ],
    plugins: [
      // Plugin for environment variables
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
        },
      ],

      // This is now the ONLY plugin needed for both Worklets and Reanimated.
      // It should generally be the last plugin in the array.
      'react-native-worklets/plugin', 
    ],
  };
};