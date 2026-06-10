import { ShoppingCart, X } from 'lucide-react';

interface GroceryPromptCardProps {
  isBn: boolean;
  onYes: () => void;
  onNo: () => void;
  isLoading?: boolean;
}

export function GroceryPromptCard({ isBn, onYes, onNo, isLoading }: GroceryPromptCardProps) {
  return (
    <div className="mt-3 p-3 bg-white border border-emerald-100 rounded-xl shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 text-[#128C7E] flex items-center justify-center shrink-0">
          <ShoppingCart size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.75rem] md:text-xs text-ink font-bn leading-relaxed">
            {isBn
              ? 'এই খাবারগুলোর কাছাকাছি দোকান ও দামের তুলনা দেখতে চান?'
              : 'Want grocery price comparisons & nearby shops for these items?'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={onYes}
              disabled={isLoading}
              className="px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white text-[0.65rem] md:text-xs font-bold font-bn rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading
                ? (isBn ? 'লোড হচ্ছে...' : 'Loading...')
                : (isBn ? 'হ্যাঁ, দেখান' : 'Yes, show me')}
            </button>
            <button
              onClick={onNo}
              disabled={isLoading}
              className="px-3 py-1.5 bg-cream text-ink-muted hover:bg-ink-muted/10 text-[0.65rem] md:text-xs font-bold font-bn rounded-lg transition-colors disabled:opacity-50"
            >
              {isBn ? 'না, ধন্যবাদ' : 'No, thanks'}
            </button>
          </div>
        </div>
        <button
          onClick={onNo}
          className="p-1 text-ink-faint hover:text-ink rounded-md transition-colors"
          aria-label={isBn ? 'বন্ধ করুন' : 'Close'}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
