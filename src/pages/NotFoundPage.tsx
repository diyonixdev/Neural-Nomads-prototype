import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-2xl font-black text-emerald-600">
        404
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Page Not Found</h1>
      <p className="text-slate-500 text-sm max-w-sm">
        The requested agricultural route does not exist in the prototype.
      </p>
      <Button variant="primary" icon={<Home size={16} />} onClick={() => navigate('/')}>
        Return Home
      </Button>
    </div>
  );
};


