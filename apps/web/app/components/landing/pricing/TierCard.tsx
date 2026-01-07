// components/landing/pricing/TierCard.tsx
// Tier Card Component with Glow Effects

'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface TierTheme {
  primary: string;
  glow: string;
  accent?: string;
}

interface Benefit {
  icon: string;
  text: string;
  name?: string;
  sub?: string;
}

interface Service {
  name: string;
  nameKo: string;
  icon: string;
  description: string;
  pricing: string;
}

interface TierData {
  id: string;
  featured?: boolean;
  theme: TierTheme;
  tierLabel: string;
  title: { en: string; ko: string };
  description: { ko: string; en: string };
  benefits?: Benefit[];
  services?: Service[];
  philosophy?: { title: string; description: string };
  cta: { en: string; ko: string };
  ctaStyle: 'outlined' | 'filled';
}

interface Props {
  tier: TierData;
}

export function TierCard({ tier }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const isFeatured = tier.featured;
  
  return (
    <motion.div
      className="relative h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card */}
      <div
        className="relative h-full flex flex-col overflow-hidden transition-all duration-400"
        style={{
          background: '#0a0a0a',
          border: `1px solid ${isHovered ? tier.theme.primary : '#1a1a1a'}`,
          borderRadius: '2px',
          padding: '40px 32px',
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: isHovered 
            ? `0 20px 40px -20px ${tier.theme.glow}` 
            : 'none',
        }}
      >
        {/* Gradient Overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${tier.theme.glow}, transparent 70%)`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        />
        
        {/* Energy Pulse Animation (Caller only) */}
        {isFeatured && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(180deg, ${tier.theme.glow} 0%, transparent 60%)`,
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              y: [0, -10, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
        
        {/* Shimmer Effect (Architect only) */}
        {tier.id === 'architect' && (
          <motion.div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.05), transparent)',
              transform: 'translateX(-100%)',
            }}
            animate={{
              x: ['0%', '200%'],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        )}
        
        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Title */}
          <div className="text-center mb-6">
            <h3 
              className="text-2xl font-serif text-neutral-100 tracking-wide"
              style={{ color: isHovered ? tier.theme.primary : undefined }}
            >
              {tier.title.en}
            </h3>
            <p className="text-neutral-500 text-sm mt-1">{tier.title.ko}</p>
          </div>
          
          {/* Divider */}
          <div 
            className="h-px w-full mb-4"
            style={{ background: `linear-gradient(to right, transparent, ${tier.theme.primary}40, transparent)` }}
          />
          
          {/* Tier Label */}
          <p className="text-center font-mono text-xs text-neutral-500 tracking-wider uppercase mb-6">
            {tier.tierLabel}
          </p>
          
          {/* Description */}
          <p className="text-neutral-400 text-center text-sm leading-relaxed mb-6">
            "{tier.description.ko}"
          </p>
          
          {/* Divider */}
          <div 
            className="h-px w-full mb-6"
            style={{ background: `linear-gradient(to right, transparent, #1a1a1a, transparent)` }}
          />
          
          {/* Benefits / Services */}
          <div className="flex-grow space-y-4">
            {tier.benefits?.map((benefit, index) => (
              <div key={index} className="flex gap-3">
                <span 
                  className="text-sm flex-shrink-0"
                  style={{ color: tier.theme.primary }}
                >
                  {benefit.icon}
                </span>
                <div>
                  {benefit.name && (
                    <span className="text-neutral-300 text-sm font-medium block">
                      {benefit.name}
                    </span>
                  )}
                  <span className="text-neutral-400 text-sm">
                    {benefit.text}
                  </span>
                  {benefit.sub && (
                    <span className="text-neutral-600 text-xs block mt-0.5">
                      {benefit.sub}
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {tier.services?.map((service, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span style={{ color: tier.theme.primary }}>{service.icon}</span>
                  <span className="text-neutral-200 text-sm font-medium">
                    {service.name}
                  </span>
                  <span className="text-neutral-500 text-xs">({service.nameKo})</span>
                </div>
                <p className="text-neutral-400 text-sm pl-5">{service.description}</p>
                <p 
                  className="text-xs pl-5 font-mono"
                  style={{ color: tier.theme.accent || tier.theme.primary }}
                >
                  {service.pricing}
                </p>
              </div>
            ))}
          </div>
          
          {/* Philosophy (Caller only) */}
          {tier.philosophy && (
            <>
              <div 
                className="h-px w-full my-6"
                style={{ background: `linear-gradient(to right, transparent, #1a1a1a, transparent)` }}
              />
              <div className="text-center mb-6">
                <p 
                  className="font-mono text-sm"
                  style={{ color: tier.theme.accent || tier.theme.primary }}
                >
                  {tier.philosophy.title}
                </p>
                <p className="text-neutral-500 text-xs mt-1">
                  {tier.philosophy.description}
                </p>
              </div>
            </>
          )}
          
          {/* CTA Button */}
          <button
            className="w-full mt-auto py-3 px-6 font-mono text-sm tracking-wider transition-all duration-300 relative overflow-hidden group"
            style={{
              background: tier.ctaStyle === 'filled' ? tier.theme.primary : 'transparent',
              border: `1px solid ${tier.theme.primary}`,
              color: tier.ctaStyle === 'filled' ? '#050505' : tier.theme.primary,
            }}
          >
            {/* Hover fill for outlined buttons */}
            {tier.ctaStyle === 'outlined' && (
              <span
                className="absolute inset-0 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"
                style={{ background: tier.theme.primary }}
              />
            )}
            
            <span className="relative z-10 group-hover:text-void-DEFAULT transition-colors">
              {tier.cta.en}
            </span>
            <span className="relative z-10 block text-xs mt-1 opacity-70 group-hover:text-void-DEFAULT transition-colors">
              {tier.cta.ko}
            </span>
            
            {/* Glow effect for filled buttons */}
            {tier.ctaStyle === 'filled' && isFeatured && (
              <motion.span
                className="absolute inset-0 pointer-events-none"
                style={{
                  boxShadow: `0 0 20px ${tier.theme.glow}`,
                }}
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

