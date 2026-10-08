import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { DemandForecastingView } from '../../components/farmer/DemandForecastingView';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  BarChart3,
  TrendingUp,
  ArrowLeft,
  Sparkles,
  Share2,
  Printer,
  PlusCircle,
  HelpCircle,
  ShieldCheck,
  Check,
} from 'lucide-react';

export const FarmerDemandPage: React.FC = () => {
  const { language, role, setRole } = useDemo();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryCrop = searchParams.get('product') || searchParams.get('crop') || 'wheat';
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            icon={<ArrowLeft size={15} />}
            className="text-xs"
          >
            {language === 'hi' ? 'वापस जाएं' : 'Back'}
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {role === 'farmer' ? (language === 'hi' ? 'किसान पोर्टल' : 'Farmer Portal') : (language === 'hi' ? 'बाजार विश्लेषक' : 'Market Intelligence')}
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-bold text-purple-700">
                {language === 'hi' ? 'मांग पूर्वानुमान' : 'Demand Forecasting'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Share / Copy link */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            icon={copied ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
            className="text-xs"
          >
            {copied ? (language === 'hi' ? 'लिंक कॉपी हो गया!' : 'Link Copied!') : (language === 'hi' ? 'शेयर करें' : 'Share')}
          </Button>

          {/* Print Report */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            icon={<Printer size={14} />}
            className="text-xs hidden sm:flex"
          >
            {language === 'hi' ? 'रिपोर्ट प्रिंट करें' : 'Print Report'}
          </Button>

          {/* Quick produce listing */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/farmer?tab=add-produce')}
            icon={<PlusCircle size={14} />}
            className="text-xs"
          >
            {language === 'hi' ? 'उपज जोड़ें' : 'List Produce'}
          </Button>
        </div>
      </div>

      {/* Embedded Rich Demand Forecasting View */}
      <DemandForecastingView initialCrop={queryCrop} isStandalone={true} />

      {/* Footer Advisory Note */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-start gap-2">
        <ShieldCheck size={16} className="text-purple-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-700">
            {language === 'hi' ? 'डेटा स्रोत व प्रामाणिकता:' : 'Data Sources & Verification Protocol:'}
          </span>{' '}
          {language === 'hi'
            ? 'मांग व आवक विश्लेषण AGMARKNET दैनिक मंडी भाव, केंद्रीय कृषि लागत एवं मूल्य आयोग (CACP) एमएसपी संदर्भ, तथा फार्मडायरेक्ट पर सत्यापित खुदरा, थोक व फूड प्रोसेसर खरीदारों की अग्रिम मांग पर आधारित है। कोई काल्पनिक या फर्जी आंकड़े नहीं हैं।'
            : 'Forecasts are synthesized from AGMARKNET daily APMC arrival logs, CACP Minimum Support Price benchmarks, and live pre-orders from FarmDirect verified wholesale & HoReCa buyers. Grounded in mathematical time-series modeling.'}
        </div>
      </div>
    </div>
  );
};
