import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthUser, AuthMethod, UserProfile, UserType } from '../types/auth';
import {
  initFirebase,
  subscribeAuthState,
  signInEmail,
  signUpEmail,
  sendPhoneOtp,
  verifyPhoneOtp,
  setupPhoneRecaptcha,
  signOutAll,
  isFirebaseReady,
} from '../services/firebaseAuth';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFirebaseConfigured: boolean;
  loginWithDigiLockerDemo: (farmerName?: string) => Promise<AuthUser>;
  loginWithAadhaarDemo: (farmerName?: string) => Promise<AuthUser>;
  loginWithEmail: (email: string, pass: string, isSignUp?: boolean, name?: string) => Promise<AuthUser>;
  sendMobileOtpCode: (mobile: string) => Promise<{ success: boolean; demoCode?: string }>;
  verifyMobileOtpCode: (code: string, mobile: string) => Promise<AuthUser>;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const { isConfigured } = await initFirebase();
      if (!mounted) return;
      setIsFirebaseConfigured(isConfigured);

      // Subscribe to real or in-memory Firebase Auth state
      const unsubscribe = subscribeAuthState((fbUser) => {
        if (!mounted) return;
        if (fbUser) {
          // If already in demo mode with rich profile, don't overwrite with bare fb user unless needed
          setUser((prev) => {
            if (prev && prev.isDemo) return prev;
            return {
              uid: fbUser.uid,
              name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Farmer'),
              email: fbUser.email,
              phoneNumber: fbUser.phoneNumber,
              userType: 'farmer',
              authMethod: fbUser.phoneNumber ? 'firebase-mobile' : 'firebase-email',
              verified: true,
              verificationMessage: fbUser.phoneNumber
                ? '✓ Mobile number verified via Firebase Auth'
                : '✓ Email verified via Firebase Auth',
              isDemo: !isConfigured,
              profile: prev?.profile || {
                name: fbUser.displayName || 'Farmer',
                mobile: fbUser.phoneNumber || '',
                email: fbUser.email || '',
                userType: 'farmer',
                village: 'Dasna',
                district: 'Ghaziabad',
                state: 'Uttar Pradesh',
                farmSize: '3.5 Acres',
                mainCrops: ['Tomatoes', 'Wheat', 'Mustard'],
                bankStatus: 'dbt_linked',
                authMethod: fbUser.phoneNumber ? 'firebase-mobile' : 'firebase-email',
                verifiedAt: new Date().toISOString(),
                verificationBadge: 'Firebase Auth Verified',
                isDemo: !isConfigured,
              },
            };
          });
        } else {
          // If user logged out of firebase, clear if not demo or if explicit logout
          setUser((prev) => (prev?.authMethod.startsWith('firebase') ? null : prev));
        }
        setIsLoading(false);
      });

      return () => {
        unsubscribe();
      };
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const loginWithDigiLockerDemo = async (farmerName: string = 'Demo Farmer'): Promise<AuthUser> => {
    const demoUser: AuthUser = {
      uid: `digilocker_demo_${Date.now()}`,
      name: farmerName,
      userType: 'farmer',
      authMethod: 'digilocker',
      verified: true,
      verificationMessage: '✓ DigiLocker verification successful (Prototype)',
      isDemo: true,
      profile: {
        name: farmerName,
        mobile: '+91 98765 43210',
        email: 'farmer.demo@digilocker.gov.in',
        userType: 'farmer',
        village: 'Rampur',
        district: 'Meerut',
        state: 'Uttar Pradesh',
        farmSize: '4.2 Acres',
        mainCrops: ['Wheat', 'Basmati Rice', 'Sugarcane'],
        bankStatus: 'dbt_linked',
        authMethod: 'digilocker',
        verifiedAt: new Date().toISOString(),
        verificationBadge: 'DigiLocker Verified (Prototype)',
        isDemo: true,
      },
    };
    setUser(demoUser);
    return demoUser;
  };

  const loginWithAadhaarDemo = async (farmerName: string = 'Demo Farmer'): Promise<AuthUser> => {
    const demoUser: AuthUser = {
      uid: `aadhaar_demo_${Date.now()}`,
      name: farmerName,
      userType: 'farmer',
      authMethod: 'aadhaar',
      verified: true,
      verificationMessage: '✓ Identity verified successfully',
      isDemo: true,
      profile: {
        name: farmerName,
        mobile: '+91 98111 22334',
        userType: 'farmer',
        village: 'Sonipat Khurd',
        district: 'Sonipat',
        state: 'Haryana',
        farmSize: '5.0 Acres',
        mainCrops: ['Mustard', 'Potatoes', 'Paddy'],
        bankStatus: 'aeps_ready',
        authMethod: 'aadhaar',
        verifiedAt: new Date().toISOString(),
        verificationBadge: 'Aadhaar e-KYC (Prototype)',
        isDemo: true,
      },
    };
    setUser(demoUser);
    return demoUser;
  };

  const loginWithEmail = async (
    email: string,
    pass: string,
    isSignUp: boolean = false,
    name?: string
  ): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const fbUser = isSignUp ? await signUpEmail(email, pass, name) : await signInEmail(email, pass);
      const authUser: AuthUser = {
        uid: fbUser.uid,
        name: name || fbUser.displayName || email.split('@')[0],
        email: fbUser.email,
        phoneNumber: fbUser.phoneNumber,
        userType: 'farmer',
        authMethod: 'firebase-email',
        verified: true,
        verificationMessage: '✓ Email authenticated securely',
        isDemo: !isFirebaseReady(),
        profile: {
          name: name || fbUser.displayName || email.split('@')[0],
          mobile: '',
          email: fbUser.email || email,
          userType: 'farmer',
          village: 'Kalyanpur',
          district: 'Kanpur',
          state: 'Uttar Pradesh',
          farmSize: '2.5 Acres',
          mainCrops: ['Vegetables', 'Pulses'],
          bankStatus: 'jan_dhan_active',
          authMethod: 'firebase-email',
          verifiedAt: new Date().toISOString(),
          verificationBadge: isFirebaseReady() ? 'Firebase Email Verified' : 'Email Auth (Demo)',
          isDemo: !isFirebaseReady(),
        },
      };
      setUser(authUser);
      return authUser;
    } finally {
      setIsLoading(false);
    }
  };

  const sendMobileOtpCode = async (mobile: string) => {
    let verifier = null;
    const recaptchaEl = document.getElementById('recaptcha-container');
    if (recaptchaEl) {
      verifier = await setupPhoneRecaptcha('recaptcha-container');
    }
    return sendPhoneOtp(mobile, verifier);
  };

  const verifyMobileOtpCode = async (code: string, mobile: string): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const fbUser = await verifyPhoneOtp(code, mobile);
      const authUser: AuthUser = {
        uid: fbUser.uid,
        name: fbUser.displayName || 'Farmer ' + mobile.slice(-4),
        phoneNumber: mobile,
        email: fbUser.email,
        userType: 'farmer',
        authMethod: 'firebase-mobile',
        verified: true,
        verificationMessage: '✓ Mobile number verified successfully',
        isDemo: !isFirebaseReady(),
        profile: {
          name: fbUser.displayName || 'Farmer ' + mobile.slice(-4),
          mobile,
          userType: 'farmer',
          village: 'Dasna',
          district: 'Ghaziabad',
          state: 'Uttar Pradesh',
          farmSize: '3.0 Acres',
          mainCrops: ['Tomatoes', 'Wheat'],
          bankStatus: 'dbt_linked',
          authMethod: 'firebase-mobile',
          verifiedAt: new Date().toISOString(),
          verificationBadge: isFirebaseReady() ? 'Firebase Phone Verified' : 'Mobile OTP Verified',
          isDemo: !isFirebaseReady(),
        },
      };
      setUser(authUser);
      return authUser;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = (updatedProfile: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const currentProfile: UserProfile = prev.profile || {
        name: prev.name,
        mobile: prev.phoneNumber || '',
        email: prev.email || '',
        userType: (updatedProfile.userType as UserType) || prev.userType || 'farmer',
        village: '',
        district: '',
        state: '',
        farmSize: '2-5 Acres',
        mainCrops: [],
        bankStatus: 'dbt_linked',
        authMethod: prev.authMethod,
        verifiedAt: new Date().toISOString(),
        verificationBadge: prev.authMethod,
        isDemo: prev.isDemo,
      };

      const newProfile: UserProfile = {
        ...currentProfile,
        ...updatedProfile,
        userType: updatedProfile.userType || currentProfile.userType,
      };

      return {
        ...prev,
        name: newProfile.name || prev.name,
        userType: newProfile.userType,
        profile: newProfile,
      };
    });
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOutAll();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isFirebaseConfigured,
        loginWithDigiLockerDemo,
        loginWithAadhaarDemo,
        loginWithEmail,
        sendMobileOtpCode,
        verifyMobileOtpCode,
        updateUserProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
