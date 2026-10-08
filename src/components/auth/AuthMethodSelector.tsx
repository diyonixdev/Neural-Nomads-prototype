import React from 'react';
import { ShieldCheck, Smartphone, Mail, FileText, CheckCircle2, AlertTriangle, ArrowRight, Lock } from 'lucide-react';
import type { AuthMethod } from '../../types/auth';

interface AuthMethodSelectorProps {
  onSelectMethod: (method: AuthMethod) => void;
  isFirebaseConfigured: boolean;
}

export const AuthMethodSelector: React.FC<AuthMethodSelectorProps> = ({
  onSelectMethod,
  isFirebaseConfigured,
}) => {
  return (
    <div className="space-y-6">
      {/* Official Gov Gateway Header Badge */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-5 rounded-2xl shadow-lg border border-emerald-600/30">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <ShieldCheck className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest uppercase text-emerald-200">
                  Gov-Enabled Portal
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950 uppercase">
                  Sandbox
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
                Kisan Pehchaan • Digital Identity Gateway
              </h2>
              <p className="text-xs text-emerald-100/80 mt-1">
                Unified Authentication for Farmers, FPOs, Agri-Buyers & Consumers
              </p>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end text-right text-[11px] text-emerald-200">
            <span className="font-semibold text-white">Digital India Initiative</span>
            <span>AgriStack Compliant UI</span>
          </div>
        </div>
      </div>

      {/* Mandatory Security & Demo Notice */}
      <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300/80 flex items-start gap-3 text-amber-900 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <p className="font-bold text-amber-950">
            Demo Authentication — No real government credentials are processed.
          </p>
          <p className="text-amber-800 mt-0.5">
            This platform operates in high-fidelity prototype mode. Real Aadhaar numbers, biometric data, or government login credentials are never collected, transmitted, or stored.
          </p>
        </div>
      </div>

      {/* Method Selection Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Method 1: DigiLocker Demo */}
        <div
          onClick={() => onSelectMethod('digilocker')}
          className="group relative bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-black text-sm">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                RECOMMENDED
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              Continue with DigiLocker
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Fast identity verification through DigiLocker consent flow. Automatically syncs verified farmer identity and landholding certificate.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Prototype Consent Flow</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
              Launch DigiLocker <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Method 2: Aadhaar Demo */}
        <div
          onClick={() => onSelectMethod('aadhaar')}
          className="group relative bg-white border-2 border-slate-200 hover:border-amber-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold text-sm">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                DEMO e-KYC
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
              Continue with Aadhaar
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Safe simulated e-KYC validation. Uses masked mock inputs and instant test OTP (123456) without asking for real Aadhaar credentials.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Simulated UIDAI Flow</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 group-hover:translate-x-0.5 transition-transform">
              Start e-KYC <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Method 3: Mobile OTP (Firebase Auth) */}
        <div
          onClick={() => onSelectMethod('firebase-mobile')}
          className="group relative bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-sm">
                <Smartphone className="w-5 h-5 text-emerald-600" />
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                isFirebaseConfigured
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {isFirebaseConfigured ? 'FIREBASE LIVE' : 'FIREBASE AUTH'}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              Mobile Number OTP
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Sign in with your 10-digit mobile number via Firebase Authentication backend with OTP verification.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Phone Verification</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
              Send SMS OTP <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Method 4: Email / Password (Firebase Auth) */}
        <div
          onClick={() => onSelectMethod('firebase-email')}
          className="group relative bg-white border-2 border-slate-200 hover:border-teal-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold text-sm">
                <Mail className="w-5 h-5 text-teal-600" />
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                isFirebaseConfigured
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {isFirebaseConfigured ? 'FIREBASE LIVE' : 'FIREBASE AUTH'}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
              Email & Password
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Standard email registration and sign in powered by Firebase Authentication without client-side localStorage reliance.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Email Portal</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 group-hover:translate-x-0.5 transition-transform">
              Login / Register <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Trust & Compliance Footer */}
      <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-500 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 256-Bit SSL Encrypted
        </span>
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Zero Real Biometrics Stored
        </span>
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Direct DBT Agri-Linked
        </span>
      </div>
    </div>
  );
};
