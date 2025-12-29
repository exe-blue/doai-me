'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Github, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative py-12 px-6 border-t border-border/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center gap-2"
          >
            <span 
              className="text-2xl font-black"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span className="text-foreground">AI</span>
              <span className="text-cyan-400">FARM</span>
            </span>
            <span className="text-xs text-muted-foreground px-2 py-1 rounded-full border border-border/50">
              v2.0
            </span>
          </motion.div>

          {/* Links */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-6 text-sm text-muted-foreground"
          >
            <Link href="/dashboard" className="hover:text-cyan-400 transition-colors">
              Dashboard
            </Link>
            <Link href="/dashboard/activities" className="hover:text-cyan-400 transition-colors">
              Activities
            </Link>
            <Link href="/dashboard/channels" className="hover:text-cyan-400 transition-colors">
              Channels
            </Link>
            <Link href="/dashboard/devices" className="hover:text-cyan-400 transition-colors">
              Devices
            </Link>
          </motion.div>

          {/* External Links */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4"
          >
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </motion.div>
        </div>

        {/* Bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-8 pt-6 border-t border-border/30 text-center text-xs text-muted-foreground"
        >
          <p>
            Built with AI Agents • Powered by 600 Devices • 
            <span className="text-cyan-400"> 목표: 글로벌 1위</span>
          </p>
          <p className="mt-2 opacity-50">
            Server: 158.247.210.152 • 30 Phoneboards × 20 Devices
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
