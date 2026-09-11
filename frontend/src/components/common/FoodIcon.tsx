import React from 'react';
import {
  Utensils,
  Apple,
  Fish,
  Beef,
  Egg,
  Wheat,
  Carrot,
  Salad,
  Coffee,
  Milk,
  Drumstick,
  Soup,
  Cookie,
  Citrus,
  Flame,
  Leaf,
  ShoppingBag,
} from 'lucide-react';

interface FoodIconProps {
  emoji?: string;
  name?: string;
  category?: string;
  size?: number;
  className?: string;
}

/**
 * Replaces raw unicode emojis with crisp, consistent Lucide React icons for foods and groceries.
 */
export const FoodIcon: React.FC<FoodIconProps> = ({
  emoji = '',
  name = '',
  category = '',
  size = 18,
  className = '',
}) => {
  const text = `${emoji} ${name} ${category}`.toLowerCase();

  // Match chicken / poultry
  if (text.includes('🍗') || text.includes('chicken') || text.includes('broiler') || text.includes('murgi') || text.includes('poultry')) {
    return <Drumstick size={size} className={className || 'text-amber-600'} />;
  }

  // Match beef / meat / steak
  if (text.includes('🥩') || text.includes('beef') || text.includes('mutton') || text.includes('meat') || text.includes('gosht') || text.includes('khasi')) {
    return <Beef size={size} className={className || 'text-rose-600'} />;
  }

  // Match fish / seafood
  if (text.includes('🐟') || text.includes('fish') || text.includes('mach') || text.includes('tilapia') || text.includes('rui') || text.includes('salmon') || text.includes('chingri') || text.includes('hilsa')) {
    return <Fish size={size} className={className || 'text-sky-600'} />;
  }

  // Match egg
  if (text.includes('🥚') || text.includes('🍳') || text.includes('egg') || text.includes('dim')) {
    return <Egg size={size} className={className || 'text-amber-500'} />;
  }

  // Match rice / grains / flour / wheat / lentil / dal
  if (text.includes('🌾') || text.includes('🍚') || text.includes('rice') || text.includes('chal') || text.includes('bhat') || text.includes('wheat') || text.includes('atta') || text.includes('flour') || text.includes('grain') || text.includes('dal') || text.includes('lentil')) {
    return <Wheat size={size} className={className || 'text-amber-600'} />;
  }

  // Match bread / roti / toast
  if (text.includes('🍞') || text.includes('bread') || text.includes('roti') || text.includes('ruti') || text.includes('paratha')) {
    return <Wheat size={size} className={className || 'text-amber-700'} />;
  }

  // Match carrot / root veg
  if (text.includes('🥕') || text.includes('carrot') || text.includes('gajor')) {
    return <Carrot size={size} className={className || 'text-orange-500'} />;
  }

  // Match fruits
  if (text.includes('🍎') || text.includes('🍏') || text.includes('apple') || text.includes('banana') || text.includes('kela') || text.includes('mango') || text.includes('aam') || text.includes('fruit') || text.includes('fol') || text.includes('🥭') || text.includes('🍌')) {
    return <Apple size={size} className={className || 'text-rose-500'} />;
  }

  // Match citrus / lemon
  if (text.includes('🍋') || text.includes('orange') || text.includes('lemon') || text.includes('lebu') || text.includes('malta')) {
    return <Citrus size={size} className={className || 'text-yellow-500'} />;
  }

  // Match salad / leafy veggies / greens
  if (text.includes('🥦') || text.includes('🥬') || text.includes('salad') || text.includes('spinach') || text.includes('palong') || text.includes('shak') || text.includes('vegetable') || text.includes('sobji') || text.includes('greens')) {
    return <Salad size={size} className={className || 'text-emerald-600'} />;
  }

  // Match onion / garlic / spices / tomato / oil
  if (text.includes('🍅') || text.includes('tomato') || text.includes('🧅') || text.includes('onion') || text.includes('piyaj') || text.includes('🧄') || text.includes('garlic') || text.includes('roshun') || text.includes('🫒') || text.includes('oil') || text.includes('tel')) {
    return <Leaf size={size} className={className || 'text-emerald-500'} />;
  }

  // Match milk / dairy / yogurt / sweet
  if (text.includes('🥛') || text.includes('milk') || text.includes('dudh') || text.includes('curd') || text.includes('doi') || text.includes('cheese') || text.includes('yogurt')) {
    return <Milk size={size} className={className || 'text-cyan-600'} />;
  }

  // Match tea / coffee / beverage
  if (text.includes('☕') || text.includes('tea') || text.includes('cha') || text.includes('coffee') || text.includes('drink')) {
    return <Coffee size={size} className={className || 'text-amber-800'} />;
  }

  // Match soup / curry / cooked meal
  if (text.includes('🍲') || text.includes('soup') || text.includes('curry') || text.includes('torkari') || text.includes('khichuri') || text.includes('biryani')) {
    return <Soup size={size} className={className || 'text-orange-600'} />;
  }

  // Match snack / cookies / sweets
  if (text.includes('🍪') || text.includes('biscuit') || text.includes('cookie') || text.includes('snack') || text.includes('misti')) {
    return <Cookie size={size} className={className || 'text-amber-600'} />;
  }

  // Match general food / dish
  if (text.includes('🍽') || text.includes('meal') || text.includes('food') || text.includes('khabar')) {
    return <Utensils size={size} className={className || 'text-emerald-600'} />;
  }

  // Default fallback
  return <ShoppingBag size={size} className={className || 'text-accent'} />;
};
