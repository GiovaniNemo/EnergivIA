/**
 * Energivia Mobile
 * React Native app - scaffold prepared for future development.
 * API-first: consume @energivia/api with tenantId and auth.
 */
import { AppRegistry } from "react-native";
import App from "./src/App";
import { name as appName } from "./app.json";

AppRegistry.registerComponent(appName, () => App);
