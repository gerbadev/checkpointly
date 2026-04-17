const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname)

// Add gesture handler transformer for Android
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

config.resolver.alias = {
  'react-native-gesture-handler': 'react-native-gesture-handler/index',
};
 
module.exports = withNativeWind(config, { input: './app/globals.css' })