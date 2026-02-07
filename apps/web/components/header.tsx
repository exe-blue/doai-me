"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Menu, X, ArrowLeft } from "lucide-react"

const MENU_ITEMS = [
  { id: "work", label: "WORK", href: "/work" },
  { id: "channel", label: "CHANNEL", href: "/channel" },
  { id: "news", label: "NEWS", href: "/news" },
  { id: "play", label: "PLAY", href: "#" },
  { id: "economy", label: "ECONOMY", href: "/economy" },
  { id: "society", label: "SOCIETY", href: "/society" },
  { id: "apartment", label: "APARTMENT", href: "/apartment" },
  { id: "library", label: "LIBRARY", href: "/philosophy" },
]

interface HeaderProps {
  /** Header variant: 'default' for full nav, 'back' for back button mode */
  variant?: 'default' | 'back'
  /** Back button destination (default: '/') */
  backHref?: string
  /** Page title to display in 'back' variant */
  pageTitle?: string
  /** Icon to display next to page title */
  pageIcon?: ReactNode
}

export function Header({
  variant = 'default',
  backHref = '/',
  pageTitle,
  pageIcon,
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "bg-background/80 backdrop-blur-xl border-b border-border/30" : "bg-transparent",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Back Variant: Back Button + Page Title */}
          {variant === 'back' ? (
            <>
              <div className="flex items-center gap-4">
                <Link
                  href={backHref}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="뒤로 가기"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline font-mono text-[11px] tracking-[0.1em] uppercase">Home</span>
                </Link>
                {pageTitle && (
                  <>
                    <div className="h-6 w-px bg-border/50" />
                    <h1 className="text-lg font-bold text-accent flex items-center gap-2">
                      {pageIcon}
                      {pageTitle}
                    </h1>
                  </>
                )}
              </div>
              {/* Logo on right for back variant */}
              <Link href="/" className="flex items-center gap-1">
                <span className="text-xl font-bold text-accent">DoAi</span>
                <span className="text-xl font-light text-foreground">.Me</span>
              </Link>
            </>
          ) : (
            <>
              {/* Default Variant: Logo */}
              <Link href="/" className="flex items-center gap-2">
                <Image src="/logo-yellow.svg" alt="DoAi.Me" width={100} height={35} className="h-8 w-auto" />
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-8">
                {MENU_ITEMS.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "font-mono text-[11px] tracking-[0.2em] uppercase",
                      "text-muted-foreground hover:text-accent transition-colors duration-300",
                      "relative group",
                    )}
                  >
                    {item.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-px bg-accent group-hover:w-full transition-all duration-300" />
                  </Link>
                ))}
              </nav>

              {/* Sign Up Button (Desktop) */}
              <Link
                href="/auth/signup"
                className={cn(
                  "hidden md:inline-flex items-center gap-2",
                  "border border-accent bg-accent/10 px-4 py-2",
                  "font-mono text-[11px] tracking-[0.15em] uppercase text-accent",
                  "hover:bg-accent hover:text-background transition-all duration-300",
                )}
              >
                Sign Up
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden text-foreground p-2"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </>
          )}
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-border/30 pt-4">
            <div className="flex flex-col gap-4">
              {MENU_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "font-mono text-[11px] tracking-[0.2em] uppercase",
                    "text-muted-foreground hover:text-accent transition-colors duration-300",
                  )}
                >
                  {item.label}
                </Link>
              ))}
              {/* Mobile Sign Up Button */}
              <Link
                href="/auth/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "mt-4 inline-flex items-center justify-center",
                  "border border-accent bg-accent/10 px-4 py-3",
                  "font-mono text-[11px] tracking-[0.15em] uppercase text-accent",
                  "hover:bg-accent hover:text-background transition-all duration-300",
                )}
              >
                Sign Up
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
