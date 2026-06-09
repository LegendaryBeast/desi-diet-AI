import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-ink text-cream px-6 md:px-12 lg:px-24 py-8 lg:py-12">
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 mb-8 lg:mb-10 pb-8 lg:pb-10 border-b border-white/10">
        <div className="lg:w-1/3">
          <Link to="/" className="font-bn text-[1.2rem] lg:text-[1.3rem] font-bold tracking-[0.02em] text-cream mb-2 block">
            দেশি<span className="text-accent-light">ডায়েট</span> এআই
          </Link>
          <p className="font-bn text-[0.8rem] leading-[1.6] text-white/50 max-w-[280px]">
            বাংলাদেশের মানুষের জন্য, বাংলাদেশের বিজ্ঞান দিয়ে তৈরি একটি পুষ্টি সহায়ক।
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 lg:w-2/3">
          <div>
            <h4 className="text-[0.6rem] lg:text-[0.65rem] tracking-[0.15em] uppercase text-white/40 mb-3 font-body">প্রোডাক্ট</h4>
            <ul className="flex flex-col gap-2">
              <li><a href="#features" className="font-bn text-[0.8rem] text-white/60 hover:text-white transition-colors">বৈশিষ্ট্য</a></li>
              <li><Link to="/meal-plan" className="font-bn text-[0.8rem] text-white/60 hover:text-white transition-colors">খাবার পরিকল্পনা</Link></li>
              <li><Link to="/health-log" className="font-bn text-[0.8rem] text-white/60 hover:text-white transition-colors">স্বাস্থ্য লগ</Link></li>
              <li><a href="#" className="font-bn text-[0.8rem] text-white/60 hover:text-white transition-colors">রিপোর্ট</a></li>
              <li><Link to="/conditions" className="font-bn text-[0.8rem] text-white/60 hover:text-white transition-colors">শর্তাবলী ও ডিসক্লেমার</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[0.6rem] lg:text-[0.65rem] tracking-[0.15em] uppercase text-white/40 mb-3 font-body">বিজ্ঞান</h4>
            <ul className="flex flex-col gap-2">
              <li><a href="#" className="font-bn text-[0.8rem] text-white/60 hover:text-white transition-colors">NDG 2025</a></li>
              <li><a href="#" className="font-bn text-[0.8rem] text-white/60 hover:text-white transition-colors">GraphRAG</a></li>
              <li><a href="#" className="font-bn text-[0.8rem] text-white/60 hover:text-white transition-colors">Neo4j</a></li>
              <li><a href="#" className="font-bn text-[0.8rem] text-white/60 hover:text-white transition-colors">LLM Layer</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[0.6rem] lg:text-[0.65rem] tracking-[0.15em] uppercase text-white/40 mb-3 font-body">যোগাযোগ</h4>
            <ul className="flex flex-col gap-2">
              <li><a href="#" className="font-bn text-[0.8rem] text-white/60 hover:text-white transition-colors">সাপোর্ট</a></li>
              <li><a href="#" className="font-bn text-[0.8rem] text-white/60 hover:text-white transition-colors">API</a></li>
              <li><a href="#" className="font-bn text-[0.8rem] text-white/60 hover:text-white transition-colors">GitHub</a></li>
              <li><a href="#" className="font-bn text-[0.8rem] text-white/60 hover:text-white transition-colors">Blog</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="font-bn text-[0.7rem] lg:text-[0.75rem] text-white/30">
          © 2026 দেশিডায়েট এআই · NDG 2025 ভিত্তিক
        </div>
        <div className="font-bn text-[0.68rem] lg:text-[0.72rem] text-white/30 max-w-[450px] lg:text-right leading-[1.6]">
          ⚠️ এটি একটি এআই পুষ্টি সহায়ক। গুরুতর স্বাস্থ্য সমস্যায় অবশ্যই একজন নিবন্ধিত পুষ্টিবিদ বা চিকিৎসকের পরামর্শ নিন।
        </div>
      </div>
    </footer>
  );
};
