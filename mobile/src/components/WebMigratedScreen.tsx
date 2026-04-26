import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useLayoutEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { AIChatModal } from '@/components/ai/AIChatModal';
import { FloatingChatButton } from '@/components/ai/FloatingChatButton';
import { MigratedContent } from '@/components/MigratedContent';

import type { UserStackParamList } from '@/navigation/types';

const PAGE_MAP: Record<
  keyof UserStackParamList,
  { title: string; sourceHtml: string } | undefined
> = {
  UserTabs: undefined,
  HomeHtml: { title: 'Home', sourceHtml: 'home.html' },
  StadiumBooking: { title: 'Stadium booking', sourceHtml: 'stadium-booking.html' },
  StadiumBooking3D: {
    title: '3D booking',
    sourceHtml: 'stadium-booking-3d.html',
  },
  StadiumManagement: {
    title: 'Stadium management',
    sourceHtml: 'stadium-management.html',
  },
  Directory: { title: 'Directory', sourceHtml: 'directory.html' },
  Vendors: { title: 'Vendors', sourceHtml: 'vendors.html' },
  VendorDetail: { title: 'Vendor', sourceHtml: 'vendor-detail.html' },
  VendorCompare: { title: 'Compare', sourceHtml: 'vendor-compare.html' },
  VendorManagement: {
    title: 'Vendor management',
    sourceHtml: 'vendor-management.html',
  },
  BookingForm: { title: 'Booking', sourceHtml: 'booking-form.html' },
  Bookings: { title: 'Bookings', sourceHtml: 'bookings.html' },
  BookingAnalytics: {
    title: 'Booking analytics',
    sourceHtml: 'booking-analytics.html',
  },
  Payment: undefined,
  BookingConfirmed: undefined,
  Notifications: undefined,
  UPIPayment: undefined,
  BookingTracking: undefined,
  Wishlist: { title: 'Wishlist', sourceHtml: 'wishlist.html' },
  Support: { title: 'Support', sourceHtml: 'support.html' },
  Profile: { title: 'Profile', sourceHtml: 'profile.html' },
  Analytics: { title: 'Analytics', sourceHtml: 'analytics.html' },
  EventPlanner: { title: 'Event planner', sourceHtml: 'event-planner.html' },
  AgentManagement: {
    title: 'Agent management',
    sourceHtml: 'agent-management.html',
  },
  Dashboard: { title: 'Customer dashboard', sourceHtml: 'dashboard.html' },
  MigratedFromWeb: { title: 'Page', sourceHtml: 'index.html' },
};

/**
 * One component for all stack screens that are still being ported from a `.html` file.
 * The stack `name` must exist in the map above.
 */
export function WebMigratedScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<UserStackParamList, keyof UserStackParamList>>();
  const name = route.name;
  const [aiOpen, setAiOpen] = useState(false);
  const meta = useMemo(() => {
    if (name === 'MigratedFromWeb' && 'params' in route && route.params) {
      const p = route.params as { title: string; sourceHtml: string };
      return { title: p.title, sourceHtml: p.sourceHtml };
    }
    const m = PAGE_MAP[name];
    if (m) {
      return m;
    }
    return { title: String(name), sourceHtml: 'unknown.html' };
  }, [name, route]);

  useLayoutEffect(() => {
    nav.setOptions({ title: meta.title, headerBackTitle: 'Back' });
  }, [meta.title, nav]);

  if (name === 'HomeHtml') {
    return (
      <View style={{ flex: 1 }}>
        <MigratedContent
          title={meta.title}
          sourceHtml={meta.sourceHtml}
          routeName={name}
        />
        <FloatingChatButton onPress={() => setAiOpen(true)} />
        <AIChatModal visible={aiOpen} onClose={() => setAiOpen(false)} />
      </View>
    );
  }

  return (
    <MigratedContent
      title={meta.title}
      sourceHtml={meta.sourceHtml}
      routeName={name}
    />
  );
}
