import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Mic, MicOff, SwitchCamera, Type } from 'lucide-react';
import { toast } from 'sonner';
import { createLiveSession } from '../liveService';

export default function PreLivePage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [isMicOn, setIsMicOn] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    // Stop previous stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err: any) {
      console.error('[PreLive] Camera error:', err);
      setHasPermission(false);
      if (err.name === 'NotAllowedError') {
        toast.error('Bạn chưa cấp quyền camera/micro.');
      } else if (err.name === 'NotFoundError') {
        toast.error('Không tìm thấy thiết bị camera/micro.');
      } else {
        toast.error('Không thể truy cập camera.');
      }
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleToggleMic = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMicOn(prev => !prev);
    }
  };

  const handleFlipCamera = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  const handleShowDescription = () => {
    setShowDescription(true);
    setTimeout(() => descriptionRef.current?.focus(), 100);
  };

  const handleGoLive = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const session = await createLiveSession({
        privacy: 'public',
        title: description.trim() || undefined,
      });
      // Do NOT stop camera tracks before navigating — preserves browser permission state
      navigate(`/live/${session.id}/host`, { replace: true });
    } catch (err: any) {
      console.error('[PreLive] createLiveSession error:', err);
      toast.error(err?.message || 'Không thể tạo phiên live. Vui lòng thử lại.');
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Camera preview - full screen background */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70 pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between p-4 pt-safe">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-white font-semibold text-lg drop-shadow-lg">
          Phát trực tiếp
        </span>
        <div className="w-10" /> {/* spacer */}
      </div>

      {/* Right sidebar controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
        <button
          onClick={handleToggleMic}
          className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors ${
            isMicOn
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-red-500/80 text-white hover:bg-red-500'
          }`}
          title={isMicOn ? 'Tắt micro' : 'Bật micro'}
        >
          {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={handleFlipCamera}
          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          title="Xoay camera"
        >
          <SwitchCamera className="w-5 h-5" />
        </button>

        <button
          onClick={handleShowDescription}
          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          title="Thêm mô tả"
        >
          <Type className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom section */}
      <div className="relative z-10 mt-auto p-4 pb-safe space-y-3">
        {/* Description input */}
        {showDescription && (
          <div className="animate-fade-in">
            <textarea
              ref={descriptionRef}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Nhấn để thêm mô tả..."
              maxLength={500}
              rows={2}
              className="w-full bg-black/40 backdrop-blur-sm text-white placeholder:text-white/60 border border-white/20 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-white/50"
            />
          </div>
        )}

        {!showDescription && (
          <button
            onClick={handleShowDescription}
            className="w-full text-left text-white/60 text-sm bg-black/30 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 hover:border-white/20 transition-colors"
          >
            Nhấn để thêm mô tả...
          </button>
        )}

        {/* Go Live button */}
        <button
          onClick={handleGoLive}
          disabled={hasPermission === false || isCreating}
          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang tạo phiên live...
            </>
          ) : (
            'Phát trực tiếp'
          )}
        </button>
      </div>

      {/* No permission overlay */}
      {hasPermission === false && (
        <div className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-white text-lg font-semibold mb-2">
            Không thể truy cập Camera
          </div>
          <div className="text-white/60 text-sm mb-6">
            Vui lòng cấp quyền camera và micro trong cài đặt trình duyệt, sau đó thử lại.
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => startCamera(facingMode)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              Thử lại
            </button>
            <button
              onClick={handleBack}
              className="px-6 py-2.5 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
            >
              Quay lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
