'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { ArrowDown, Check, TrendingUp, Users, Clock, Eye, MessageCircle, ThumbsUp, Search, Play, BarChart3, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// 네비게이션 헤더
function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const navItems = [
    { label: '분석', href: '#problem' },
    { label: '과학', href: '#science' },
    { label: '방법', href: '#method' },
    { label: '메커니즘', href: '#mechanism' },
  ];
  
  return (
    <>
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800' : ''
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/withb" className="text-2xl font-black">
            <span className="text-white">With</span>
            <span className="text-blue-500">B</span>
          </Link>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-zinc-400 hover:text-white transition-colors text-sm"
              >
                {item.label}
              </a>
            ))}
            <a href="#cta">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
                무료 진단
              </Button>
            </a>
          </nav>
          
          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-zinc-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </motion.header>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-[#09090b]/95 backdrop-blur-md md:hidden pt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <nav className="flex flex-col items-center gap-6 p-8">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-xl text-zinc-300 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <a href="#cta" onClick={() => setMobileMenuOpen(false)}>
                <Button className="bg-blue-600 hover:bg-blue-500 mt-4">
                  무료 진단 받기
                </Button>
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// 애니메이션 숫자 카운터
function AnimatedCounter({ 
  target, 
  suffix = '', 
  prefix = '',
  duration = 2 
}: { 
  target: number; 
  suffix?: string; 
  prefix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, target, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// 성장 곡선 SVG 컴포넌트
function GrowthCurve() {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  // S커브 경로 (0에서 100만까지)
  const path = "M 50 350 Q 100 340 150 320 Q 250 280 300 240 Q 400 180 450 140 Q 550 80 650 50";
  
  return (
    <svg ref={ref} viewBox="0 0 700 400" className="w-full max-w-2xl mx-auto">
      {/* 그리드 라인 */}
      <defs>
        <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
          <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
        </linearGradient>
      </defs>
      
      {/* Y축 라벨 */}
      <text x="20" y="55" fill="#71717a" fontSize="12" fontFamily="monospace">100만</text>
      <text x="20" y="200" fill="#71717a" fontSize="12" fontFamily="monospace">50만</text>
      <text x="20" y="350" fill="#71717a" fontSize="12" fontFamily="monospace">0</text>
      
      {/* 그리드 */}
      <line x1="50" y1="50" x2="650" y2="50" stroke="#27272a" strokeWidth="1" strokeDasharray="5,5" />
      <line x1="50" y1="200" x2="650" y2="200" stroke="#27272a" strokeWidth="1" strokeDasharray="5,5" />
      
      {/* 영역 채우기 */}
      <motion.path
        d={`${path} L 650 350 L 50 350 Z`}
        fill="url(#areaGradient)"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 1.5, delay: 0.5 }}
      />
      
      {/* 메인 곡선 */}
      <motion.path
        d={path}
        fill="none"
        stroke="url(#curveGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={isInView ? { pathLength: 1 } : {}}
        transition={{ duration: 2.5, ease: "easeOut" }}
      />
      
      {/* Phase 포인트 */}
      {[
        { x: 150, y: 320, label: "Phase 1", sub: "1K" },
        { x: 350, y: 200, label: "Phase 2", sub: "10K" },
        { x: 550, y: 80, label: "Phase 3", sub: "100K" },
      ].map((point, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 1 + i * 0.3 }}
        >
          <circle cx={point.x} cy={point.y} r="8" fill="#3b82f6" />
          <circle cx={point.x} cy={point.y} r="4" fill="#fff" />
          <text x={point.x + 15} y={point.y - 10} fill="#a1a1aa" fontSize="11">{point.label}</text>
          <text x={point.x + 15} y={point.y + 5} fill="#fafafa" fontSize="13" fontWeight="600">{point.sub}</text>
        </motion.g>
      ))}
    </svg>
  );
}

// 진행 막대 컴포넌트
function ProgressBar({ 
  value, 
  label, 
  color = "blue" 
}: { 
  value: number; 
  label: string;
  color?: "blue" | "green" | "purple";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  
  const colors = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
  };
  
  return (
    <div ref={ref} className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white font-mono">{value}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${colors[color]} rounded-full`}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${value}%` } : {}}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// 섹션 래퍼
function Section({ 
  children, 
  className = "",
  id 
}: { 
  children: React.ReactNode; 
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`py-20 md:py-32 px-4 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {children}
      </div>
    </section>
  );
}

export default function WithBLanding() {
  const [channelUrl, setChannelUrl] = useState('');
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <Header />
      
      {/* ========== HERO ========== */}
      <section className="min-h-screen flex flex-col items-center justify-center relative px-4">
        {/* 배경 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#09090b] via-[#0f0f11] to-[#09090b]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.1)_0%,_transparent_70%)]" />
        
        <motion.div
          className="relative z-10 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* 로고 */}
          <motion.h1 
            className="text-5xl md:text-7xl font-black mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-white">With</span>
            <span className="text-blue-500">B</span>
          </motion.h1>
          
          {/* 타이틀 */}
          <h2 className="text-2xl md:text-4xl font-bold mb-4 text-white">
            YouTube 성장의 과학
          </h2>
          
          <p className="text-zinc-400 text-lg md:text-xl max-w-xl mx-auto mb-12">
            100만 구독자까지의 여정을 데이터로 분석하고,<br />
            AI가 그 패턴을 재현합니다.
          </p>
          
          {/* 성장 곡선 그래프 */}
          <div className="mb-8">
            <GrowthCurve />
          </div>
          
          <p className="text-zinc-500 text-sm mb-8 font-mono">
            <AnimatedCounter target={1247} suffix="개" /> 채널 분석 데이터 기반
          </p>
          
          <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-6 text-lg rounded-xl">
            성장 진단 시작하기
          </Button>
        </motion.div>
        
        {/* 스크롤 인디케이터 */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          style={{ opacity }}
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <ArrowDown className="w-6 h-6 text-zinc-600" />
        </motion.div>
      </section>

      {/* ========== THE PROBLEM ========== */}
      <Section className="bg-[#0f0f11]" id="problem">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            왜 <span className="text-red-500">99%</span>의 채널은 성장하지 못하는가
          </h2>
        </motion.div>
        
        {/* 파이 차트 영역 */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-16">
          <motion.div
            className="relative w-64 h-64"
            initial={{ opacity: 0, rotate: -90 }}
            whileInView={{ opacity: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#27272a" strokeWidth="20" />
              <circle 
                cx="50" cy="50" r="40" 
                fill="none" 
                stroke="#ef4444" 
                strokeWidth="20"
                strokeDasharray="245 251"
                strokeDashoffset="0"
                className="origin-center -rotate-90"
              />
              <circle 
                cx="50" cy="50" r="40" 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="20"
                strokeDasharray="6 251"
                strokeDashoffset="-245"
                className="origin-center -rotate-90"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-red-500">97.5%</span>
              <span className="text-zinc-500 text-sm">1만 미만</span>
            </div>
          </motion.div>
          
          <div className="text-center md:text-left">
            <p className="text-zinc-400 mb-2">전체 YouTube 채널 중</p>
            <p className="text-xl">
              <span className="text-green-500 font-bold">2.5%</span>만이 10만 구독자 돌파
            </p>
          </div>
        </div>
        
        <motion.p
          className="text-center text-xl text-zinc-300 mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          "콘텐츠 품질의 문제가 아닙니다"
        </motion.p>
        
        {/* 3개 카드 */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Eye, title: "초기 노출 부족", value: 72 },
            { icon: Clock, title: "시청 지속 데이터 부족", value: 68 },
            { icon: Users, title: "재방문 신호 부재", value: 89 },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
            >
              <item.icon className="w-8 h-8 text-zinc-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-red-500 font-mono">
                  <AnimatedCounter target={item.value} suffix="%" />
                </span>
                <span className="text-zinc-500 text-sm mb-1">의 채널이 해당</span>
              </div>
            </motion.div>
          ))}
        </div>
        
        <motion.p
          className="text-center text-lg text-zinc-400 mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          "알고리즘에게 <span className="text-white">'좋은 채널'</span>이라는 신호를 보내지 못했기 때문입니다"
        </motion.p>
      </Section>

      {/* ========== THE SCIENCE ========== */}
      <Section id="science">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            100만 채널의 성장 곡선을 분석했습니다
          </h2>
          <p className="text-zinc-400">각 단계별 핵심 지표와 성공 패턴</p>
        </motion.div>
        
        {/* Phase 카드들 */}
        <div className="space-y-8">
          {/* Phase 1 */}
          <motion.div
            className="bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/30 rounded-2xl p-8"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium">Phase 1</span>
              <span className="text-xl font-bold">0 → 1,000 구독자</span>
              <span className="text-zinc-500 text-sm">"초기 신호 축적"</span>
            </div>
            
            <p className="text-zinc-400 mb-6">
              이 시기에 채널이 받는 평균 조회수: 영상당 <span className="text-white font-mono">47회</span>
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-zinc-900/50 rounded-lg p-4">
                <p className="text-zinc-500 text-sm mb-1">업로드 24시간 내</p>
                <p className="text-2xl font-bold text-blue-400 font-mono">58%</p>
                <p className="text-zinc-500 text-sm">평균 시청 완료율</p>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-4">
                <p className="text-zinc-500 text-sm mb-1">첫 100회 조회 중</p>
                <p className="text-2xl font-bold text-blue-400 font-mono">23%</p>
                <p className="text-zinc-500 text-sm">재방문 비율</p>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-4">
                <p className="text-zinc-500 text-sm mb-1">검색 통한</p>
                <p className="text-2xl font-bold text-blue-400 font-mono">34%</p>
                <p className="text-zinc-500 text-sm">자연 유입 비율</p>
              </div>
            </div>
          </motion.div>
          
          {/* Phase 2 */}
          <motion.div
            className="bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/30 rounded-2xl p-8"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm font-medium">Phase 2</span>
              <span className="text-xl font-bold">1,000 → 10,000 구독자</span>
              <span className="text-zinc-500 text-sm">"알고리즘 인식"</span>
            </div>
            
            <p className="text-zinc-400 mb-6">
              알고리즘이 채널을 <span className="text-white">'발견'</span>하는 시점
            </p>
            
            <div className="space-y-4">
              <ProgressBar label="추천 노출 증가율" value={85} color="purple" />
              <ProgressBar label="검색 순위 상승" value={65} color="purple" />
              <ProgressBar label="평균 시청 시간 증가" value={78} color="purple" />
            </div>
            
            <p className="text-zinc-400 mt-6">
              핵심 변수: <span className="text-purple-400 font-semibold">"세션 지속 시간"</span>
              <span className="text-zinc-500 text-sm ml-2">→ 한 시청자가 채널에서 연속으로 머무는 시간</span>
            </p>
          </motion.div>
          
          {/* Phase 3 */}
          <motion.div
            className="bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/30 rounded-2xl p-8"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium">Phase 3</span>
              <span className="text-xl font-bold">10,000 → 100,000+ 구독자</span>
              <span className="text-zinc-500 text-sm">"팬덤 형성"</span>
            </div>
            
            <p className="text-zinc-400 mb-6">
              팬덤이 알고리즘을 이기는 시점
            </p>
            
            {/* 순환 다이어그램 */}
            <div className="flex justify-center mb-6">
              <div className="relative w-64 h-64">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-green-500/30" />
                <div className="absolute inset-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <span className="text-lg font-bold text-white">채널 성장</span>
                  </div>
                </div>
                {[
                  { label: "알림 클릭", angle: -45 },
                  { label: "재방문 시청", angle: 45 },
                  { label: "공유/저장", angle: 135 },
                  { label: "댓글 참여", angle: 225 },
                ].map((item, i) => (
                  <div 
                    key={i}
                    className="absolute text-sm text-zinc-400"
                    style={{
                      top: `${50 + 45 * Math.sin(item.angle * Math.PI / 180)}%`,
                      left: `${50 + 45 * Math.cos(item.angle * Math.PI / 180)}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
            
            <p className="text-center text-zinc-400">
              이 단계의 채널은 업로드 직후 1시간 내 조회수가 전체의 <span className="text-green-400 font-bold">40%</span>
            </p>
          </motion.div>
        </div>
      </Section>

      {/* ========== OUR METHOD ========== */}
      <Section className="bg-[#0f0f11]" id="method">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            AI가 이 패턴을 재현합니다
          </h2>
        </motion.div>
        
        {/* 플로우 */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-16">
          {[
            { icon: Play, title: "영상 업로드", desc: "새 영상 감지" },
            { icon: BarChart3, title: "AI 분석", desc: "최적 키워드 & 타이밍 분석" },
            { icon: Users, title: "유기적 반응 생성", desc: "실제 시청자와 구분 불가" },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-4 md:gap-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
            >
              {i > 0 && (
                <div className="hidden md:block w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500" />
              )}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center min-w-[180px]">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-zinc-500 text-sm">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
        
        <motion.p
          className="text-center text-xl text-zinc-300 mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          단순 조회수 증가가 아닙니다
        </motion.p>
        
        {/* 비교 테이블 */}
        <motion.div
          className="grid md:grid-cols-2 gap-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-zinc-500">기존 서비스</h3>
            <ul className="space-y-3">
              {[
                "단순 조회수 증가",
                "봇 패턴 감지 위험",
                "일시적 효과",
                "채널 신뢰도 하락",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-zinc-500">
                  <span className="text-red-500">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-400">WithB</h3>
            <ul className="space-y-3">
              {[
                "알고리즘 신호 생성",
                "실제 시청 행동 재현",
                "누적 성장 효과",
                "채널 신뢰도 상승",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-white">
                  <Check className="w-4 h-4 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </Section>

      {/* ========== THE MECHANISM ========== */}
      <Section id="mechanism">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            알고리즘이 읽는 신호
          </h2>
          <p className="text-zinc-400">YouTube 알고리즘 가중치 (추정)</p>
        </motion.div>
        
        {/* 가중치 차트 */}
        <div className="max-w-2xl mx-auto mb-16 space-y-6">
          {[
            { label: "시청 완료율", value: 35, color: "blue" as const },
            { label: "세션 지속 시간", value: 25, color: "blue" as const },
            { label: "클릭률 (CTR)", value: 18, color: "purple" as const },
            { label: "참여 (좋아요/댓글)", value: 12, color: "purple" as const },
            { label: "재방문율", value: 10, color: "green" as const },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <ProgressBar {...item} />
            </motion.div>
          ))}
        </div>
        
        <motion.h3
          className="text-center text-xl font-semibold mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          WithB가 생성하는 신호
        </motion.h3>
        
        {/* 신호 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: Search, label: "검색 유입 패턴" },
            { icon: Clock, label: "자연스런 시청 시간" },
            { icon: TrendingUp, label: "무작위 이탈 지점" },
            { icon: ThumbsUp, label: "실제 참여" },
            { icon: Users, label: "재방문 패턴" },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <item.icon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">{item.label}</p>
              <Check className="w-5 h-5 text-green-500 mx-auto mt-2" />
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ========== CTA ========== */}
      <Section className="bg-gradient-to-b from-[#09090b] to-[#0f0f11]" id="cta">
        <motion.div
          className="max-w-xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            채널 성장 진단
          </h2>
          <p className="text-zinc-400 mb-12">
            현재 채널 상태를 분석하고<br />
            성장 가능성을 진단합니다
          </p>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <label className="block text-left text-zinc-400 text-sm mb-2">
              YouTube 채널 URL 입력
            </label>
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="youtube.com/@your-channel"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white flex-1"
              />
              <Button className="bg-blue-600 hover:bg-blue-500 text-white px-6">
                무료 진단
              </Button>
            </div>
          </div>
          
          <p className="text-zinc-500 text-sm mt-8">
            또는{' '}
            <button className="text-blue-400 hover:underline">
              상담 예약하기
            </button>
          </p>
        </motion.div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-zinc-500 text-sm">
            © 2024 WithB. All rights reserved.
          </div>
          <div className="flex gap-6 text-zinc-500 text-sm">
            <a href="#" className="hover:text-white">이용약관</a>
            <a href="#" className="hover:text-white">개인정보처리방침</a>
            <a href="#" className="hover:text-white">문의하기</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
