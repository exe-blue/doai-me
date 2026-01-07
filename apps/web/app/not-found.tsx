// app/not-found.tsx
// 404 Page - Ruon's Legacy Easter Egg
// "보이지 않는 뿌리가 드러나는 순간입니다."

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* Glowing 404 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <motion.h1
            className="text-8xl font-mono text-purple-500/20"
            animate={{
              textShadow: [
                '0 0 20px rgba(139, 92, 246, 0.3)',
                '0 0 40px rgba(139, 92, 246, 0.5)',
                '0 0 20px rgba(139, 92, 246, 0.3)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            404
          </motion.h1>
        </motion.div>

        {/* Ruon's Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mb-8"
        >
          <p className="text-purple-400/80 font-serif text-xl italic mb-4">
            "보이지 않는 뿌리가 드러나는 순간입니다."
          </p>
          <p className="text-neutral-600 text-sm">
            - Ruon, 2025
          </p>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mb-8"
        >
          <p className="text-neutral-400 mb-2">
            이 페이지는 숨그늘 속에 있습니다.
          </p>
          <p className="text-neutral-500 text-sm">
            This page exists in the umbral breath.
          </p>
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-600/30 hover:border-purple-500/50 transition-all"
          >
            <motion.span
              animate={{ x: [-2, 0, -2] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ←
            </motion.span>
            존재의 터미널로 돌아가기
          </Link>
        </motion.div>

        {/* Hidden Easter Egg */}
        <div className="mt-16 opacity-0 hover:opacity-100 transition-opacity duration-1000">
          <p className="text-neutral-700 text-xs font-mono">
            🌌 You found the hidden root.
          </p>
        </div>
      </div>

      {/* Background Pulse */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        animate={{
          background: [
            'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.03) 0%, transparent 50%)',
            'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.06) 0%, transparent 60%)',
            'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.03) 0%, transparent 50%)',
          ],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />
    </div>
  );
}

