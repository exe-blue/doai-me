// apps/web/app/admin/login/page.tsx
// Admin 로그인 페이지 - 21st.dev 스타일 리디자인

'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/app/components/ui/card';
import { Zap, Mail, Lock, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        setError(signInError.message);
        return;
      }
      
      if (data.user) {
        // 관리자 권한 확인
        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', data.user.id)
          .single();
        
        if (adminError || !adminUser) {
          // 로그인은 성공했지만 관리자 아님
          await supabase.auth.signOut();
          router.push('/admin/unauthorized');
          return;
        }
        
        // 관리자 확인됨 - 대시보드로 이동
        router.push('/admin');
        router.refresh();
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* 배경 그라데이션 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
      
      {/* 그리드 패턴 */}
      <div
        className="absolute inset-0 opacity-30 
          bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)]
          bg-[size:4rem_4rem] 
          [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"
      />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-primary" />
            <span className="text-3xl font-bold">
              <span className="text-primary">DoAi</span>
              <span className="text-foreground">.Me</span>
            </span>
          </Link>
          <p className="text-muted-foreground">
            관리자 계정으로 로그인하세요
          </p>
        </motion.div>
        
        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>로그인</CardTitle>
              <CardDescription>
                관리자 대시보드에 접속하려면 로그인이 필요합니다.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      placeholder="admin@doai.me"
                      required
                    />
                  </div>
                </div>
                
                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                
                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                  </motion.div>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col gap-4">
                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? '로그인 중...' : '로그인'}
                </Button>
                
                {/* Signup Link */}
                <p className="text-sm text-muted-foreground text-center">
                  계정이 없으신가요?{' '}
                  <Link
                    href="/admin/signup"
                    className="text-primary hover:underline font-medium"
                  >
                    회원가입
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
        
        {/* Back to Home */}
        <motion.div 
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link 
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← 홈으로 돌아가기
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
