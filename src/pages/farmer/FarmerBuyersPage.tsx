import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { BuyerCard } from '../../components/BuyerCard/BuyerCard';
import { mockBuyers } from '../../data/mockData';
import { ArrowLeft, Volume2 } from 'lucide-react';

export const FarmerBuyersPage: React.FC = () => {
  const { language, buyerMatchResults, parsedIntent, assistantResponse } = useDemo();
  const navigate = useNavigate();

  const displayBuyers = useMemo(() => {
    if (buyerMatchResults.length > 0) {
      return buyerMatchResults.map((r) => r.buyer);
    }
    return mockBuyers;
  }, [buyerMatchResults]);

  const handleConnectBuyer = () => {
    navigate('/farmer/connection');
  };

  const productLabel = parsedIntent?.product ?? 'produce';
  const quantityLabel = parsedIntent?.quantity !== null && parsedIntent?.unit
    ? `${parsedIntent.quantity} ${parsedIntent.unit}`
    : '';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/farmer/voice')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft size={14} />
            <span>{language === 'hi' ? 'वॉयस पर वापस जाएं' : 'Back to Farmer Voice'}</span>
          </button>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <span>{language === 'hi' ? 'सत्यापित खरीदार मिलान' : 'Matched Verified Buyers'}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 font-semibold">
              {displayBuyers.length} {language === 'hi' ? 'सक्रिय मांग' : 'Active Buyer Demands'}
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {quantityLabel
              ? (language === 'hi'
                  ? `${quantityLabel} ${productLabel} के लिए मिलान किए गए खरीदार।`
                  : `Buyers matched for your ${quantityLabel} ${productLabel}.`)
              : (language === 'hi'
                  ? 'आपकी फसल के लिए तैयार थोक खरीदार।'
                  : 'Bulk buyers looking for your harvest with ready advance commitments.')}
          </p>
        </div>
      </div>

      {/* Assistant Response */}
      {assistantResponse && (
        <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Volume2 size={18} className="text-teal-400 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-200 leading-relaxed">{assistantResponse}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayBuyers.map((buyer) => (
          <BuyerCard
            key={buyer.id}
            buyer={buyer}
            onConnect={handleConnectBuyer}
          />
        ))}
      </div>
    </div>
  );
};
