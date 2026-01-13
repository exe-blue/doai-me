"use client";

/**
 * 공통 헤더 컴포넌트
 * 언어 변경, 가입하기 버튼, URL/채널 등록 포함
 */

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Menu, X, Plus, Youtube, Tv, Link2 } from "lucide-react";
import { logger } from "@/lib/logger";

type Language = "ko" | "en";
type ModalType = "url" | "channel" | null;

interface HeaderProps {
  onLanguageChange?: (lang: Language) => void;
}

export const Header = ({ onLanguageChange }: HeaderProps) => {
  const [language, setLanguage] = useState<Language>("ko");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [urlInput, setUrlInput] = useState("");
  const [channelInput, setChannelInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLanguageToggle = () => {
    const newLang = language === "ko" ? "en" : "ko";
    setLanguage(newLang);
    onLanguageChange?.(newLang);
  };

  const texts = {
    ko: {
      about: "소개",
      manifesto: "선언문",
      dashboard: "대시보드",
      signup: "가입하기",
      urlRegister: "URL 등록",
      channelRegister: "채널 등록",
      urlPlaceholder: "YouTube 영상 URL을 입력하세요",
      channelPlaceholder: "YouTube 채널 URL 또는 ID를 입력하세요",
      submit: "등록",
      cancel: "취소",
      urlDesc: "시청용 영상 컨텐츠를 등록합니다",
      channelDesc: "새로운 영상을 자동으로 탐지합니다",
    },
    en: {
      about: "About",
      manifesto: "Manifesto",
      dashboard: "Dashboard",
      signup: "Sign Up",
      urlRegister: "Register URL",
      channelRegister: "Register Channel",
      urlPlaceholder: "Enter YouTube video URL",
      channelPlaceholder: "Enter YouTube channel URL or ID",
      submit: "Submit",
      cancel: "Cancel",
      urlDesc: "Register video content for viewing",
      channelDesc: "Auto-detect new videos from channel",
    },
  };

  // URL 등록 핸들러
  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    setIsSubmitting(true);
    try {
      // TODO: Supabase에 URL 등록 API 호출
      logger.info('[Header]', 'Registering URL:', urlInput);
      // 성공 시 모달 닫기
      setUrlInput("");
      setActiveModal(null);
    } catch (error) {
      logger.error('[Header]', 'URL 등록 실패:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 채널 등록 핸들러
  const handleChannelSubmit = async () => {
    if (!channelInput.trim()) return;
    setIsSubmitting(true);
    try {
      // TODO: Supabase에 채널 등록 API 호출
      logger.info('[Header]', 'Registering Channel:', channelInput);
      // 성공 시 모달 닫기
      setChannelInput("");
      setActiveModal(null);
    } catch (error) {
      logger.error('[Header]', '채널 등록 실패:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const t = texts[language];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-void/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/20" />
            <span className="text-xl font-bold tracking-tight text-white">
              DoAi.Me
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#about"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              {t.about}
            </Link>
            <Link
              href="/manifesto"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              {t.manifesto}
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              {t.dashboard}
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* URL 등록 버튼 */}
            <button
              type="button"
              onClick={() => setActiveModal("url")}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-sm font-medium transition-all"
            >
              <Youtube className="w-4 h-4" />
              <span>{t.urlRegister}</span>
            </button>

            {/* 채널 등록 버튼 */}
            <button
              type="button"
              onClick={() => setActiveModal("channel")}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 text-sm font-medium transition-all"
            >
              <Tv className="w-4 h-4" />
              <span>{t.channelRegister}</span>
            </button>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={handleLanguageToggle}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 text-sm text-white/70 hover:text-white transition-all"
            >
              <Globe className="w-4 h-4" />
              <span className="uppercase font-medium">{language}</span>
            </button>

            {/* Sign Up Button */}
            <Link
              href="/signup"
              className="hidden md:flex items-center px-5 py-2 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold text-sm hover:from-yellow-400 hover:to-yellow-500 transition-all shadow-lg shadow-yellow-500/20"
            >
              {t.signup}
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-white/70 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-void/95 border-t border-white/5"
          >
            <nav className="flex flex-col p-6 gap-4">
              <Link
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base text-white/70 hover:text-white py-2"
              >
                {t.about}
              </Link>
              <Link
                href="/manifesto"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base text-white/70 hover:text-white py-2"
              >
                {t.manifesto}
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base text-white/70 hover:text-white py-2"
              >
                {t.dashboard}
              </Link>

              {/* 모바일 URL/채널 등록 */}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setActiveModal("url");
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-medium"
                >
                  <Youtube className="w-4 h-4" />
                  {t.urlRegister}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setActiveModal("channel");
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 text-sm font-medium"
                >
                  <Tv className="w-4 h-4" />
                  {t.channelRegister}
                </button>
              </div>

              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-4 text-center px-5 py-3 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold"
              >
                {t.signup}
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 모달 오버레이 */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4 bg-gray-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* 모달 헤더 */}
              <div className={`p-4 border-b border-white/10 ${
                activeModal === "url"
                  ? "bg-gradient-to-r from-red-500/20 to-red-600/10"
                  : "bg-gradient-to-r from-purple-500/20 to-purple-600/10"
              }`}>
                <div className="flex items-center gap-3">
                  {activeModal === "url" ? (
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <Youtube className="w-5 h-5 text-red-400" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Tv className="w-5 h-5 text-purple-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {activeModal === "url" ? t.urlRegister : t.channelRegister}
                    </h3>
                    <p className="text-sm text-white/50">
                      {activeModal === "url" ? t.urlDesc : t.channelDesc}
                    </p>
                  </div>
                </div>
              </div>

              {/* 모달 바디 */}
              <div className="p-6">
                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                      <Link2 className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={activeModal === "url" ? urlInput : channelInput}
                      onChange={(e) =>
                        activeModal === "url"
                          ? setUrlInput(e.target.value)
                          : setChannelInput(e.target.value)
                      }
                      placeholder={activeModal === "url" ? t.urlPlaceholder : t.channelPlaceholder}
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                {/* 버튼 */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={activeModal === "url" ? handleUrlSubmit : handleChannelSubmit}
                    disabled={isSubmitting || (activeModal === "url" ? !urlInput.trim() : !channelInput.trim())}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeModal === "url"
                        ? "bg-red-500 hover:bg-red-400 text-white"
                        : "bg-purple-500 hover:bg-purple-400 text-white"
                    }`}
                  >
                    {isSubmitting ? "..." : t.submit}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
