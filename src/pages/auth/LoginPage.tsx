import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Home, Building2, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthMethodSelector } from '../../components/auth/AuthMethodSelector';
import { DigiLockerDemo } from '../../components/auth/DigiLockerDemo';
import { AadhaarDemo } from '../../components/auth/AadhaarDemo';
import { MobileOTP } from '../../components/auth/MobileOTP';
import { ProfileSetup } from '../../components/auth/ProfileSetup';
import { FarmerDashboard } from '../../components/auth/FarmerDashboard';
import type { AuthMethod, AuthUser, UserProfile } from '../../types/auth';

export const LoginPage: React.FC = () => {
  const {
    user,
    isAuthenticated,
    isFirebaseConfigured,
    loginWithDigiLockerDemo,
    loginWithAadhaarDemo,
    updateUserProfile,
  } = useAuth();

  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod | null>(null);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);

  // Handle successful DigiLocker authentication
  const handleDigiLockerSuccess = async (farmerName: string) => {
    await loginWithDigiLockerDemo(farmerName);
    setSelectedMethod(null);
  };

  // Handle successful Aadhaar verification
  const handleAadhaarSuccess = async (farmerName: string) => {
    await loginWithAadhaarDemo(farmerName);
    setSelectedMethod(null);
  };

  // Handle successful Firebase auth
  const handleFirebaseAuthSuccess = (authUser: AuthUser) => {
    setSelectedMethod(null);
  };

  // Handle profile setup completion
  const handleProfileComplete = (profile: UserProfile) => {
    updateUserProfile(profile);
    setHasCompletedProfile(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800">
      {/* Official Government of India Header Bar */}
      <div className="bg-slate-900 text-slate-200 text-[11px] py-1.5 px-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold tracking-wide text-white">
              भारत सरकार | Government of India
            </span>
            <span className="hidden sm:inline text-slate-400">•</span>
            <span className="hidden sm:inline text-slate-300">
              Ministry of Agriculture & Farmers Welfare
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-semibold">
            <button
              onClick={() => navigate('/')}
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              <Store className="w-3 h-3 text-emerald-400" />
              <span>Back to Marketplace</span>
            </button>
            <span className="hidden md:inline px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
              PROTOTYPE ENVIRONMENT
            </span>
          </div>
        </div>
      </div>

      {/* Tricolor Accent Stripe */}
      <div className="h-1 bg-gradient-to-r from-amber-500 via-white to-emerald-600 shadow-sm" />

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        {/* If user is already authenticated and has completed profile, show the FarmerDashboard */}
        {isAuthenticated && user && hasCompletedProfile ? (
          <FarmerDashboard />
        ) : isAuthenticated && user ? (
          /* User is authenticated, now showing Profile Setup */
          <ProfileSetup user={user} onComplete={handleProfileComplete} />
        ) : (
          /* User is not yet authenticated -> show auth flow */
          <div>
            {selectedMethod === 'digilocker' ? (
              <DigiLockerDemo
                onSuccess={handleDigiLockerSuccess}
                onCancel={() => setSelectedMethod(null)}
              />
            ) : selectedMethod === 'aadhaar' ? (
              <AadhaarDemo
                onSuccess={handleAadhaarSuccess}
                onCancel={() => setSelectedMethod(null)}
              />
            ) : selectedMethod === 'firebase-mobile' ? (
              <MobileOTP
                initialMode="mobile"
                onSuccess={handleFirebaseAuthSuccess}
                onCancel={() => setSelectedMethod(null)}
              />
            ) : selectedMethod === 'firebase-email' ? (
              <MobileOTP
                initialMode="email"
                onSuccess={handleFirebaseAuthSuccess}
                onCancel={() => setSelectedMethod(null)}
              />
            ) : (
              <div className="max-w-3xl mx-auto">
                <AuthMethodSelector
                  onSelectMethod={(method) => setSelectedMethod(method)}
                  isFirebaseConfigured={isFirebaseConfigured}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
