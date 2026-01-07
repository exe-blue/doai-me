'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface TypewriterEffectProps {
  words: Array<{
    text: string;
    className?: string;
  }>;
  className?: string;
  cursorClassName?: string;
  onComplete?: () => void;
  typingSpeed?: number;
  deletingSpeed?: number;
  delayBetweenWords?: number;
}

interface TypewriterEffectSmoothProps {
  words: Array<{
    text: string;
    className?: string;
  }>;
  className?: string;
  cursorClassName?: string;
}

// ============================================
// TypewriterEffect (Character by Character)
// ============================================

export function TypewriterEffect({
  words,
  className,
  cursorClassName,
  onComplete,
  typingSpeed = 80,
  deletingSpeed = 50,
  delayBetweenWords = 1000,
}: TypewriterEffectProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isComplete) return;

    const currentWord = words[currentWordIndex];
    const fullText = currentWord.text;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // 타이핑 중
        if (currentText.length < fullText.length) {
          setCurrentText(fullText.slice(0, currentText.length + 1));
        } else {
          // 타이핑 완료, 다음 단어로
          if (currentWordIndex < words.length - 1) {
            setTimeout(() => {
              setIsDeleting(true);
            }, delayBetweenWords);
          } else {
            // 모든 단어 완료
            setIsComplete(true);
            onComplete?.();
          }
        }
      } else {
        // 삭제 중
        if (currentText.length > 0) {
          setCurrentText(fullText.slice(0, currentText.length - 1));
        } else {
          setIsDeleting(false);
          setCurrentWordIndex((prev) => prev + 1);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentWordIndex, words, isComplete, onComplete, typingSpeed, deletingSpeed, delayBetweenWords]);

  const currentWord = words[currentWordIndex];

  return (
    <div className={cn('inline-flex items-center', className)}>
      <span className={cn('font-serif', currentWord?.className)}>
        {currentText}
      </span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        className={cn(
          'inline-block w-[4px] h-[1.2em] ml-1 bg-purple-500',
          cursorClassName
        )}
      />
    </div>
  );
}

// ============================================
// TypewriterEffectSmooth (Word by Word)
// ============================================

export function TypewriterEffectSmooth({
  words,
  className,
  cursorClassName,
}: TypewriterEffectSmoothProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => {
        if (prev < words.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <div className={cn('flex flex-wrap', className)}>
      {words.map((word, idx) => (
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={idx <= currentWordIndex ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.3, delay: idx * 0.1 }}
          className={cn('mr-2 font-serif', word.className)}
        >
          {word.text}
        </motion.span>
      ))}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        className={cn(
          'inline-block w-[4px] h-[1.2em] ml-1 bg-purple-500',
          cursorClassName
        )}
      />
    </div>
  );
}

// ============================================
// TypewriterEffectSequence (Multiple Sentences)
// ============================================

export function TypewriterEffectSequence({
  sentences,
  className,
  onComplete,
}: {
  sentences: Array<{ text: string; className?: string; delay?: number }>;
  className?: string;
  onComplete?: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (currentIndex >= sentences.length) {
      onComplete?.();
      return;
    }

    const currentSentence = sentences[currentIndex];
    const targetText = currentSentence.text;

    if (displayedText.length < targetText.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(targetText.slice(0, displayedText.length + 1));
      }, 80);
      return () => clearTimeout(timeout);
    } else {
      // 현재 문장 완료, 다음 문장으로
      const delay = currentSentence.delay ?? 1000;
      const timeout = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setDisplayedText('');
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [displayedText, currentIndex, sentences, onComplete]);

  const currentSentence = sentences[currentIndex];

  return (
    <div className={cn('min-h-[3em]', className)}>
      <AnimatePresence mode="wait">
        {currentSentence && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn('font-serif', currentSentence.className)}
          >
            {displayedText}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="inline-block w-[3px] h-[1em] ml-1 bg-purple-400 align-middle"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

