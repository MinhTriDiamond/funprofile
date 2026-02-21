import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Square, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { uploadStreamVideo, createStreamRecord } from '../streamService';

type Phase = 'idle' | 'preview' | 'recording' | 'uploading';

const MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

function resolveMime(): string {
  for (const m of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return 'video/webm';
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function LiveStream() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>('idle');
  const [title, setTitle] = useState(searchParams.get('title') || '');
  const [seconds, setSeconds] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const busyRef = useRef(false);

  // Cleanup helper
  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (phase === 'recording' || phase === 'uploading') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      stopTracks();
    };
  }, [stopTracks]);

  // Attach stream to video element whenever the video element mounts
  useEffect(() => {
    if (videoRef.current && streamRef.current && phase !== 'idle') {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [phase]);

  // ---- Actions ----
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPhase('preview');
    } catch {
      toast.error('Không thể truy cập camera / micro');
    }
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = resolveMime();
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(1000);
    recorderRef.current = recorder;
    setSeconds(0);
    setPhase('recording');

    timerRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    clearInterval(timerRef.current);
    setPhase('uploading');

    // Wait a bit for last chunk
    setTimeout(handleUpload, 500);
  };

  const handleUpload = async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Chưa đăng nhập');

      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      if (blob.size === 0) throw new Error('Video rỗng');

      // 1. Upload to R2
      const { publicUrl } = await uploadStreamVideo(blob, user.id);

      // 2. Insert DB record
      await createStreamRecord(user.id, title, publicUrl, seconds);

      toast.success('Đã đăng video thành công!');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      navigate('/');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Lỗi khi đăng video');
      setPhase('preview'); // allow retry
    } finally {
      busyRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <span className="ml-2 font-semibold">Live / Stream</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex items-center justify-center bg-zinc-900">
        {phase === 'idle' && (
          <div className="text-center space-y-6 max-w-sm px-4">
            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
              <Camera className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Quay video mới</h2>
              <p className="text-sm text-zinc-400">Chia sẻ khoảnh khắc với bạn bè ngay bây giờ.</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2 text-left">
                <Label>Tiêu đề (tùy chọn)</Label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Hôm nay bạn thế nào?"
                />
              </div>
              <Button onClick={startCamera} size="lg" className="w-full gap-2">
                <Camera className="w-5 h-5" />
                Bật Camera
              </Button>
            </div>
          </div>
        )}

        {(phase === 'preview' || phase === 'recording' || phase === 'uploading') && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Overlay Controls */}
        {phase === 'preview' && (
          <div className="absolute bottom-10 left-0 right-0 flex justify-center">
            <button
              onClick={startRecording}
              className="w-16 h-16 rounded-full bg-red-500 border-4 border-white hover:scale-105 transition-transform"
            />
          </div>
        )}

        {phase === 'recording' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-6 right-6 pointer-events-auto">
              <Badge variant="destructive" className="animate-pulse text-lg px-3 py-1">
                {formatTime(seconds)}
              </Badge>
            </div>
            <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-auto">
              <button
                onClick={stopRecording}
                className="w-16 h-16 rounded-full bg-transparent border-4 border-white flex items-center justify-center hover:bg-white/20"
              >
                <Square className="w-6 h-6 fill-red-500 text-red-500" />
              </button>
            </div>
          </div>
        )}

        {phase === 'uploading' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-lg font-medium">Đang tải video lên...</p>
            <p className="text-sm text-zinc-400 mt-2">Vui lòng không tắt trình duyệt</p>
          </div>
        )}
      </div>
    </div>
  );
}
