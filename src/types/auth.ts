export type UserType = 'farmer' | 'fpo' | 'consumer' | 'buyer';

export type AuthMethod = 'digilocker' | 'aadhaar' | 'firebase-mobile' | 'firebase-email';

export interface UserProfile {
  name: string;
  mobile: string;
  email?: string;
  userType: UserType;
  village: string;
  district: string;
  state: string;
  farmSize: string;
  mainCrops: string[];
  bankStatus: 'dbt_linked' | 'jan_dhan_active' | 'aeps_ready' | 'pending';
  authMethod: AuthMethod;
  verifiedAt: string;
  verificationBadge: string;
  isDemo: boolean;
}

export interface AuthUser {
  uid: string;
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  userType?: UserType;
  authMethod: AuthMethod;
  verified: boolean;
  verificationMessage?: string;
  profile?: UserProfile | null;
  isDemo: boolean;
}
