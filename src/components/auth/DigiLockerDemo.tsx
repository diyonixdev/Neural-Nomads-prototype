import React, { useState } from 'react';
import { Shield, FileCheck, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Lock, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';

interface DigiLockerDemoProps {
  onSuccess: (farmerName: string) => void;
  onCancel: () => void;
}

export const DigiLockerDemo: React.FC<DigiLockerDemoProps> = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState<'initial' | 'consent' | 'authorizing'>('initial');
  const [farmerName, setFarmerName] = useState('Demo Farmer');
  const [documentType] = useState('Identity Document (Kisan Identity / Landholding)');

  const handleStartConsent = () => {
    setStep('consent');
  };

  const handleAllowAndContinue = () => {
    setStep('authorizing');
    // Simulate secure government gateway handshake
    setTimeout(() => {
      onSuccess(farmerName.trim() || 'Demo Farmer');
    }, 1800);
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

      {/* Official Government / DigiLocker Header */}
      <div className="bg-white border-2 border-blue-600/30 rounded-2xl p-6 shadow-md overflow-hidden relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-blue-500/25">
              DL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-blue-700 tracking-wider uppercase">DigiLocker</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">PROTOTYPE</span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                Digital Identity Consent Gateway
              </h3>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            <span>Govt. of India</span>
          </div>
        </div>

        {/* Security / Prototype Notice */}
        <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Demo Authentication — No real government credentials are processed.</span>
            <p className="text-blue-800 text-[11px] mt-0.5">
              This DigiLocker consent flow is simulated for presentation purposes.
            </p>
          </div>
        </div>

        {step === 'initial' && (
          <div className="mt-6 space-y-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Requesting Organization:</span>
                <span className="font-bold text-slate-900">FarmDirect AI (Agri-Marketplace)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Verification Purpose:</span>
                <span className="font-bold text-emerald-700">Kisan Marketplace Direct Onboarding</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Required Document:</span>
                <span className="font-bold text-slate-900">Identity Document</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Demo Farmer Name
              </label>
              <input
                type="text"
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                placeholder="Enter demo name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Pre-filled with "Demo Farmer" as requested for presentation.
              </span>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleStartConsent}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 py-3 rounded-xl"
            >
              Continue with DigiLocker
            </Button>
          </div>
        )}

        {step === 'consent' && (
          <div className="mt-6 space-y-5">
            <div className="text-center py-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-blue-600 mb-3 shadow-inner">
                <FileCheck className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                FarmDirect AI is requesting permission to verify your identity.
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Please review the demo authorization details below before proceeding.
              </p>
            </div>

            {/* Display Demo Info Box */}
            <div className="rounded-xl border-2 border-blue-100 bg-blue-50/50 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs border-b border-blue-100 pb-2">
                <span className="text-slate-500 font-medium">Name:</span>
                <span className="font-extrabold text-slate-900">{farmerName}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-blue-100 pb-2">
                <span className="text-slate-500 font-medium">Document:</span>
                <span className="font-extrabold text-blue-900">{documentType}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Issuer:</span>
                <span className="font-medium text-slate-700">Digital Document Authority (Demo Sandbox)</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={onCancel}
                className="flex-1 py-3 border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleAllowAndContinue}
                icon={<CheckCircle2 className="w-4 h-4" />}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20"
              >
                Allow & Continue
              </Button>
            </div>
          </div>
        )}

        {step === 'authorizing' && (
          <div className="mt-8 mb-6 text-center space-y-4 py-6">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
              <Lock className="w-6 h-6 text-blue-600 absolute inset-0 m-auto" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Connecting securely...
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Verifying digital identity via DigiLocker Sandbox API...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
