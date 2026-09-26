import React, { useState } from 'react';
import { ShieldAlert, KeyRound, CheckCircle2, ArrowLeft, Loader2, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface AadhaarDemoProps {
  onSuccess: (farmerName: string) => void;
  onCancel: () => void;
}

export const AadhaarDemo: React.FC<AadhaarDemoProps> = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState<'request' | 'otp' | 'verifying'>('request');
  const [maskedAadhaar] = useState('XXXX - XXXX - 9012 (Demo Identifier)');
  const [farmerName, setFarmerName] = useState('Demo Farmer');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');

  const handleSendDemoOtp = () => {
    setOtpSent(true);
    setStep('otp');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    if (otp.trim() !== '123456') {
      setOtpError('Invalid OTP code. Please enter the demo OTP: 123456');
      return;
    }

    setStep('verifying');
    setTimeout(() => {
      onSuccess(farmerName.trim() || 'Demo Farmer');
    }, 1500);
  };

  const handleQuickFillOtp = () => {
    setOtp('123456');
    setOtpError('');
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Back button */}
      <button
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Authentication Options
      </button>

      {/* Aadhaar Demo Card */}
      <div className="bg-white border-2 border-amber-500/40 rounded-2xl p-6 shadow-md relative overflow-hidden">
        {/* Top saffron & green accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-white to-emerald-600" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mt-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-black text-sm shadow-inner">
              UIDAI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-700 tracking-wider uppercase">
                  Aadhaar e-KYC
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                  DEMO MODE
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                Simulated Aadhaar Identity Verification
              </h3>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            <span>Prototype Sandbox</span>
          </div>
        </div>

        {/* Security & Prototype Notice */}
        <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Demo Authentication — No real government credentials are processed.</span>
            <p className="text-amber-800 text-[11px] mt-0.5">
              Do NOT enter real Aadhaar numbers or OTPs. A masked mock value is provided below for safe testing.
            </p>
          </div>
        </div>

        {step === 'request' && (
          <div className="mt-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Demo Farmer Name
              </label>
              <input
                type="text"
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                placeholder="Enter demo name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Masked Demo Identifier
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={maskedAadhaar}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-sm font-mono font-medium select-none cursor-not-allowed"
                />
                <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded">
                  [Aadhaar Redacted]
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                No real 12-digit number is requested or accepted.
              </span>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleSendDemoOtp}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-lg shadow-amber-600/20 py-3 rounded-xl"
            >
              Send Demo OTP
            </Button>
          </div>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-5">
            {/* Demo OTP Banner Alert */}
            {otpSent && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Simulated SMS:</span>
                    <p className="text-sm font-black text-emerald-950">Demo OTP: 123456</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleQuickFillOtp}
                  className="px-2.5 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Auto-Fill
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enter 6-Digit Demo OTP
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 text-center text-xl font-mono tracking-widest font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  autoFocus
                />
              </div>
              {otpError ? (
                <p className="text-xs text-rose-600 font-semibold mt-1.5">{otpError}</p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-1">
                  Type <strong>123456</strong> to simulate successful biometric OTP verification.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                type="button"
                onClick={() => setStep('request')}
                className="flex-1 py-3 border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
              >
                Change Details
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={otp.length !== 6}
                icon={<CheckCircle2 className="w-4 h-4" />}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-600/20 disabled:opacity-50"
              >
                Verify & Proceed
              </Button>
            </div>
          </form>
        )}

        {step === 'verifying' && (
          <div className="mt-8 mb-6 text-center space-y-4 py-6">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
              <Lock className="w-6 h-6 text-amber-600 absolute inset-0 m-auto" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Verifying OTP with e-KYC Sandbox...
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Matching cryptographic key credentials...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
