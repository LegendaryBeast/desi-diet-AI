export const MarqueeStrip = () => {
  const foods = [
    "ইলিশ মাছ", "পালং শাক", "মসুর ডাল", "রুই মাছ", 
    "ঢেঁকি ছাঁটা চাল", "টক দই", "সরিষার তেল", "কলা", 
    "মুগ ডাল", "করলা", "NDG Bangladesh 2025", "GraphRAG + LLM"
  ];

  return (
    <div className="bg-ink text-cream py-4 overflow-hidden whitespace-nowrap border-y border-white/10">
      <div className="inline-block animate-marquee">
        {foods.map((food, i) => (
          <span key={i} className="mx-8 font-bn text-[0.8rem] lg:text-[0.85rem] tracking-wider">
            {food}
            <span className="text-accent-light ml-4 inline-block translate-y-[1px]">◆</span>
          </span>
        ))}
        {/* Duplicate for seamless loop */}
        {foods.map((food, i) => (
          <span key={`dup-${i}`} className="mx-8 font-bn text-[0.8rem] lg:text-[0.85rem] tracking-wider">
            {food}
            <span className="text-accent-light ml-4 inline-block translate-y-[1px]">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
};
