import type { ParamListBase } from '@react-navigation/native';
import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Ref to root `NavigationContainer` — use for deep links from overlays (e.g. AI
 * results). User routes only exist in `UserAppNavigator` when the user role is
 * `user` or equivalent customer stack.
 */
export const navigationRef = createNavigationContainerRef<ParamListBase>();
