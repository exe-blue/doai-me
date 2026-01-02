"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase";
import { Loader2, Plus, RefreshCw, ExternalLink } from "lucide-react";

/**
 * YouTube Upload Database Page
 * 
 * Google Sheets 구조 기반:
 * 입력: no(자동), date, time, keyword, subject, url
 * 집계(백엔드): viewd, notworked, like, comments
 */

interface YouTubeVideo {
  video_id: string;
  no: number;
  date: string;
  time: number;
  keyword: string;
  subject: string;
  url: string;
  viewd: number;
  notworked: number;
  like_count: number;
  comment_count: number;
  status: string;
  target_device_count: number;
  completion_rate: number;
  created_at: string;
}

export default function YouTubeUploadPage() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0], // 기본값: 오늘
    time: new Date().getHours(), // 기본값: 현재 시간
    keyword: "",
    subject: "",
    url: "",
  });

  const supabase = createClient();

  // 영상 목록 조회
  const fetchVideos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("youtube_video_stats")
        .select("*")
        .order("no", { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error: any) {
      console.error("영상 조회 실패:", error);
      console.error('조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (!formData.subject.trim()) {
      alert("제목을 입력하세요");
      return;
    }
    if (!formData.url.trim()) {
      alert("URL을 입력하세요");
      return;
    }
    if (!formData.url.includes("youtube.com") && !formData.url.includes("youtu.be")) {
      alert("올바른 YouTube URL을 입력하세요");
      return;
    }

    try {
      setSubmitting(true);

      // Supabase에 저장
      const { data, error } = await supabase
        .from("youtube_videos")
        .insert({
          date: formData.date,
          time: formData.time,
          keyword: formData.keyword,
          subject: formData.subject,
          url: formData.url,
          status: "pending",
          target_device_count: 600,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('영상 등록 완료:', data.no);

      // 폼 초기화
      setFormData({
        date: new Date().toISOString().split("T")[0],
        time: new Date().getHours(),
        keyword: "",
        subject: "",
        url: "",
      });

      // 목록 새로고침
      fetchVideos();
    } catch (error: any) {
      console.error("등록 실패:", error);
      console.error('등록 실패:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // 600대 디바이스에 할당
  const assignToDevices = async (videoId: string) => {
    try {
      console.log("디바이스 할당 중...");

      // RPC 함수 호출 (Supabase에서 디바이스 목록 조회 후 할당)
      const { data: devices, error: devicesError } = await supabase
        .from("citizens")
        .select("device_serial")
        .limit(600);

      if (devicesError) throw devicesError;

      const deviceSerials = devices.map((d) => d.device_serial);

      // 할당 RPC 호출
      const { data, error } = await supabase.rpc("assign_video_to_devices", {
        p_video_id: videoId,
        p_device_serials: deviceSerials,
        p_batch_size: 60,
      });

      if (error) throw error;

      console.log('디바이스 할당 완료:', data);
      fetchVideos();
    } catch (error: any) {
      console.error("할당 실패:", error);
      console.error('할당 실패:', error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">YouTube 업로드 관리</h1>
          <p className="text-muted-foreground mt-1">
            600대 디바이스로 YouTube 영상 시청 작업 관리
          </p>
        </div>
        <Button onClick={fetchVideos} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* 입력 폼 */}
      <Card>
        <CardHeader>
          <CardTitle>새 영상 등록</CardTitle>
          <CardDescription>
            Google Sheets와 동일한 형식으로 입력하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 날짜 */}
              <div>
                <Label htmlFor="date">날짜 (B열)</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>

              {/* 시간 */}
              <div>
                <Label htmlFor="time">시간 (C열) - 24시간 형식</Label>
                <Input
                  id="time"
                  type="number"
                  min="0"
                  max="23"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({ ...formData, time: parseInt(e.target.value) })
                  }
                  placeholder="예: 1 (오전 1시), 13 (오후 1시)"
                  required
                />
              </div>
            </div>

            {/* 키워드 */}
            <div>
              <Label htmlFor="keyword">키워드 (D열)</Label>
              <Input
                id="keyword"
                value={formData.keyword}
                onChange={(e) =>
                  setFormData({ ...formData, keyword: e.target.value })
                }
                placeholder="예: 레이븐코인"
              />
            </div>

            {/* 제목 */}
            <div>
              <Label htmlFor="subject">동영상 제목 (E열) *</Label>
              <Textarea
                id="subject"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="예: [🔥레이븐코인 실시간 호재 발표🔥] 드디어 재상장 가격 발표"
                rows={2}
                required
              />
            </div>

            {/* URL */}
            <div>
              <Label htmlFor="url">YouTube URL (F열) *</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                placeholder="https://www.youtube.com/watch?v=..."
                required
              />
            </div>

            {/* 제출 버튼 */}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  등록 중...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  영상 등록
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 영상 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>등록된 영상 목록</CardTitle>
          <CardDescription>
            총 {videos.length}개 영상 | Google Sheets와 자동 동기화
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              등록된 영상이 없습니다
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">No</TableHead>
                    <TableHead className="w-24">날짜</TableHead>
                    <TableHead className="w-16">시간</TableHead>
                    <TableHead className="w-24">키워드</TableHead>
                    <TableHead className="min-w-[300px]">제목</TableHead>
                    <TableHead className="w-20 text-center">시청</TableHead>
                    <TableHead className="w-20 text-center">미시청</TableHead>
                    <TableHead className="w-20 text-center">좋아요</TableHead>
                    <TableHead className="w-20 text-center">댓글</TableHead>
                    <TableHead className="w-24 text-center">진행률</TableHead>
                    <TableHead className="w-32">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.map((video) => (
                    <TableRow key={video.video_id}>
                      <TableCell className="font-mono">{video.no}</TableCell>
                      <TableCell>{video.date}</TableCell>
                      <TableCell>{video.time}시</TableCell>
                      <TableCell>
                        {video.keyword && (
                          <Badge variant="secondary">{video.keyword}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {video.subject}
                      </TableCell>
                      <TableCell className="text-center font-bold text-green-600">
                        {video.viewd}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {video.notworked}
                      </TableCell>
                      <TableCell className="text-center text-blue-600">
                        {video.like_count}
                      </TableCell>
                      <TableCell className="text-center text-purple-600">
                        {video.comment_count}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-semibold">
                            {video.completion_rate}%
                          </span>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${video.completion_rate}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(video.url, "_blank")}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                          {video.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => assignToDevices(video.video_id)}
                            >
                              할당
                            </Button>
                          )}
                          {video.status !== "pending" && (
                            <Badge
                              variant={
                                video.status === "completed"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {video.status}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 안내 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm">💡 사용 방법</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-1">입력 컬럼</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong>No</strong>: 자동 생성 (순번)</li>
                <li>• <strong>Date</strong>: 날짜 (기본값: 오늘)</li>
                <li>• <strong>Time</strong>: 시간 (0~23, 24시간 형식)</li>
                <li>• <strong>Keyword</strong>: 메인 키워드</li>
                <li>• <strong>Subject</strong>: 동영상 제목</li>
                <li>• <strong>URL</strong>: YouTube 링크</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1">백엔드 집계 (자동)</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong>시청</strong>: 완료된 디바이스 수</li>
                <li>• <strong>미시청</strong>: 600 - 시청</li>
                <li>• <strong>좋아요</strong>: 좋아요 클릭한 디바이스 수</li>
                <li>• <strong>댓글</strong>: 댓글 작성한 디바이스 수</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              📊 Google Sheets 연동: 
              <a 
                href="https://docs.google.com/spreadsheets/d/1m2WQTMMe48hxS6ARWD_P0KoWA7umwtGcW2Vno_Qllsk" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline ml-1"
              >
                YouTube_Upload_Database
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
