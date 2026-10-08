import React, { useState } from 'react';
import { Smartphone, Mail, KeyRound, CheckCircle2, ArrowLeft, Loader2, Sparkles, AlertCircle, Lock } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import type { AuthUser } from '../../types/auth';

interface MobileOTPProps {
  initialMode?: 'mobile' | 'email';
  onSuccess: (user: AuthUser) => void;
  onCancel: () => void;
}

export const MobileOTP: React.FC<MobileOTPProps> = ({
  initialMode = 'mobile',
  onSuccess,
  onCancel,
}) => {
  const { sendMobileOtpCode, verifyMobileOtpCode, loginWithEmail, isFirebaseConfigured } = useAuth();
  const [authMode, setAuthMode] = useState<'mobile' | 'email'>(initialMode);

  // Mobile state
  const [mobileNumber, setMobileNumber] = useState('9876543210');
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileStep, setMobileStep] = useState<'phone' | 'otp' | 'submitting'>('phone');
  const [demoOtpNotice, setDemoOtpNotice] = useState<string | null>(null);

  // Email state
  const [email, setEmail] = useState('farmer.test@farmdirect.ai');
  const [password, setPassword] = useState('kisan@12345');
  const [farmerName, setFarmerName] = useState('Demo Farmer');
  const [isSignUp, setIsSignUp] = useState(false);

  // General state
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle Mobile Send OTP
  const handleSendMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsProcessing(true);
    try {
      const fullPhone = `+91${cleanMobile}`;
      const res = await sendMobileOtpCode(fullPhone);
      setMobileStep('otp');
      if (res.demoCode) {
        setDemoOtpNotice(res.demoCode);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send OTP. Please check your connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Mobile Verify OTP
  const handleVerifyMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (mobileOtp.length !== 6) {
      setErrorMsg('Please enter the full 6-digit OTP.');
      return;
    }

    setIsProcessing(true);
    try {
      const fullPhone = `+91${mobileNumber.replace(/\D/g, '')}`;
      const user = await verifyMobileOtpCode(mobileOtp, fullPhone);
      onSuccess(user);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid OTP code. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Email Login / Register
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsProcessing(true);
    try {
      const user = await loginWithEmail(email, password, isSignUp, farmerName);
      onSuccess(user);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div id="recaptcha-container" />

      {/* Back button */}
      <button
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Authentication Options
      </button>

      {/* Card Wrapper */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-md relative overflow-hidden">
        {/* Firebase Status Badge */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              {authMode === 'mobile' ? <Smartphone className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                Firebase Authentication Gateway
              </h3>
              <p className="text-xs text-slate-500">
                {authMode === 'mobile' ? 'Mobile Number + OTP Flow' : 'Email & Password Flow'}
              </p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            isFirebaseConfigured
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}>
            {isFirebaseConfigured ? 'FIREBASE CONNECTED' : 'IN-MEMORY DEMO MODE'}
          </span>
        </div>

        {/* Tab switch between Mobile and Email */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setAuthMode('mobile');
              setErrorMsg('');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'mobile'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Mobile OTP
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('email');
              setErrorMsg('');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'email'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5" /> Email & Password
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mobile OTP View */}
        {authMode === 'mobile' && (
          <div className="mt-5">
            {mobileStep === 'phone' && (
              <form onSubmit={handleSendMobileOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Enter 10-Digit Mobile Number
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-600 font-bold text-sm">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      autoFocus
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Pre-filled with test number. An SMS OTP will be dispatched via Firebase.
                  </span>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  type="submit"
                  disabled={isProcessing || mobileNumber.length !== 10}
                  icon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isProcessing ? 'Sending OTP...' : 'Send Mobile OTP'}
                </Button>
              </form>
            )}

            {mobileStep === 'otp' && (
              <form onSubmit={handleVerifyMobileOtp} className="space-y-4">
                {demoOtpNotice && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Simulated Demo Code: <strong>{demoOtpNotice}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileOtp(demoOtpNotice)}
                      className="px-2 py-0.5 bg-emerald-600 text-white text-[11px] font-bold rounded"
                    >
                      Fill
                    </button>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Enter 6-Digit OTP sent to +91 {mobileNumber}
                    </label>
                    <button
                      type="button"
                      onClick={() => setMobileStep('phone')}
                      className="text-[11px] font-semibold text-emerald-600 hover:underline"
                    >
                      Change Number
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={mobileOtp}
                    onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 text-center text-xl font-mono tracking-widest font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="md"
                    type="button"
                    onClick={() => setMobileStep('phone')}
                    className="flex-1 py-3"
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    disabled={isProcessing || mobileOtp.length !== 6}
                    icon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
                  >
                    {isProcessing ? 'Verifying...' : 'Confirm & Login'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Email & Password View */}
        {authMode === 'email' && (
          <form onSubmit={handleEmailAuth} className="mt-5 space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name / Organization
                </label>
                <input
                  type="text"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  placeholder="e.g. Ramesh Singh / Green FPO"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@farmdirect.ai"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-bold text-teal-700 hover:underline"
              >
                {isSignUp ? 'Already have an account? Sign In' : 'New user? Create an account'}
              </button>
            </div>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              disabled={isProcessing}
              icon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-xl shadow-md shadow-teal-700/20 disabled:opacity-50"
            >
              {isProcessing ? 'Authenticating...' : isSignUp ? 'Create Firebase Account' : 'Sign In with Firebase'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
