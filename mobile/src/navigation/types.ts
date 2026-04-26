import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppRole } from '@/types/roles';

export type UserTabParamList = {
  HomeTab: undefined;
  ExploreTab: undefined;
  BookingsTab: undefined;
  ProfileTab: undefined;
};

export type AuthStackParamList = {
  Landing: undefined;
  UserLogin: undefined;
  UserRegister: undefined;
  /** Firestore `users/{uid}.role` must match `role` */
  RoleLogin: { role: AppRole; title: string };
};

export type UserStackParamList = {
  UserTabs: NavigatorScreenParams<UserTabParamList>;
  HomeHtml: { title?: string };
  StadiumBooking: undefined;
  StadiumBooking3D: undefined;
  StadiumManagement: undefined;
  Directory: { title?: string };
  Vendors: undefined;
  VendorDetail: { id?: string };
  VendorCompare: undefined;
  VendorManagement: undefined;
  BookingForm: { stadiumId?: string; vendorId?: string };
  Bookings: undefined;
  BookingAnalytics: undefined;
  Payment: {
    vendorId?: string;
    vendorName?: string;
    amount?: number;
    service?: string;
    eventDate?: string;
    category?: string;
  };
  BookingConfirmed: {
    bookingId: string;
    paymentId: string;
    orderId: string;
    vendorName: string;
    amount: number;
    vendorId: string;
  };
  Notifications: undefined;
  UPIPayment: {
    bookingId?: string;
    stageIndex?: number;
    totalAmount?: number;
    vendorId?: string;
    vendorName?: string;
    service?: string;
    eventDate?: string;
    category?: string;
  };
  BookingTracking: { bookingId?: string };
  Wishlist: undefined;
  Support: undefined;
  Profile: undefined;
  Analytics: undefined;
  EventPlanner: undefined;
  AgentManagement: undefined;
  Dashboard: undefined;
  /** Use while porting a specific HTML file */
  MigratedFromWeb: { title: string; sourceHtml: string };
};

export type AdminStackParamList = {
  AdminDrawer: undefined;
  AdminHome: undefined;
  AdminVendors: undefined;
  VendorManagement: undefined;
  EventPlanner: undefined;
  AgentManagement: undefined;
  Analytics: undefined;
  StadiumManagement: undefined;
};

export type GenericRoleStack = {
  Main: undefined;
  Feature: { name: string; sourceHtml: string };
};

export type RootStackParamList = {
  Auth: undefined;
  UserApp: undefined;
  AdminApp: undefined;
  OwnerApp: undefined;
  AgentApp: undefined;
  DeveloperApp: undefined;
  VendorApp: undefined;
  SuperAdminApp: undefined;
};

export type RootStackProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type UserStackProps<T extends keyof UserStackParamList> =
  NativeStackScreenProps<UserStackParamList, T>;

export type UserTabProps<T extends keyof UserTabParamList> =
  NativeStackScreenProps<UserTabParamList, T>;

export type AuthStackProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;
