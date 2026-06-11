import React from 'react';
import { Rocket } from 'lucide-react';

interface ComingSoonPageProps {
  title: string;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-6">
        <Rocket size={32} className="text-indigo-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-slate-500 text-sm max-w-md">
        This feature is coming soon. We're building it to align with the DesiDiet ecosystem. Check back for updates!
      </p>
    </div>
  );
};
