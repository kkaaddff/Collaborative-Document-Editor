// 扫码弹层：Android App 走原生插件全屏扫码；其余环境 jsQR + getUserMedia rAF 解码。
import { useEffect, useRef, useState } from "react";
import {
  decodeVideoFrame,
  getCameraStream,
  hasNativeScanner,
  nativeScanQr,
  stopStream,
} from "@/platform/scanQr";

interface ScanModalProps {
  onResult: (text: string) => void;
  onClose: () => void;
}

export function ScanModal({ onResult, onClose }: ScanModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [waitingNative] = useState(hasNativeScanner());

  // ESC 关闭（与二维码弹层一致）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 原生分支：插件自带全屏取景，这里只等结果（取消返回 null）
  useEffect(() => {
    if (!waitingNative) return;
    let cancelled = false;
    (async () => {
      try {
        const text = await nativeScanQr();
        if (cancelled) return;
        if (text) onResult(text);
        else onClose();
      } catch {
        if (!cancelled) onClose();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [waitingNative, onResult, onClose]);

  // 网页分支：video 取景 + rAF 循环解码
  useEffect(() => {
    if (waitingNative) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;

    (async () => {
      try {
        stream = await getCameraStream();
        if (cancelled) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const canvas = document.createElement("canvas");
        const tick = () => {
          if (cancelled) return;
          const text = decodeVideoFrame(video, canvas);
          if (text) {
            onResult(text);
            return;
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "无法访问摄像头，请检查权限"
        );
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stopStream(stream);
    };
  }, [waitingNative, onResult]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
      {error ? (
        <div className="text-center space-y-4">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-gray-400 text-xs leading-relaxed">
            浏览器扫码需 HTTPS 环境；直连 http://IP 时请用系统相机扫码，
            或在 App 内使用。
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-white text-gray-900 text-sm font-medium"
          >
            知道了
          </button>
        </div>
      ) : waitingNative ? (
        <div className="text-center space-y-4">
          <p className="text-white text-sm">正在调起原生扫码...</p>
          <button
            onClick={onClose}
            className="px-8 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
          >
            取消
          </button>
        </div>
      ) : (
        <>
          <p className="text-white text-sm mb-4">将二维码对准取景框</p>
          <div className="w-full max-w-sm aspect-square rounded-2xl overflow-hidden border-2 border-white/30">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
          <button
            onClick={onClose}
            className="mt-6 px-8 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
          >
            取消
          </button>
        </>
      )}
    </div>
  );
}
