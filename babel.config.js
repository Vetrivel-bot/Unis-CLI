module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      '@react-native/babel-preset', // Required for React Native 0.81
      'nativewind/babel', // If using NativeWind
    ],
    plugins: [
      [
        'react-native-worklets/plugin',
        { processNestedWorklets: true },
        'react-native-reanimated/plugin',
      ], // Correct syntax
    ],
  };
};
