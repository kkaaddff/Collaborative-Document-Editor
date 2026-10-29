// 扫码弹层：全屏取景 + rAF 循环 jsQR 解码；识别即回调并自动关闭。
// Android App 场景由 platform/scanQr 的原生插件分支接管（P5）。
import { useEffect, useRef, useState } from "react";
import {
  decodeVideoFrame,
  getCameraStream,
  hasNativeScanner,
  stopStream,
} from "@/platform/scanQr";

interface ScanModalProps {
  onResult: (text: string) => void;
  onClose: () => void;
}

export function ScanModal({ onResult, onClose }: ScanModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, [onResult]);

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
      {hasNativeScanner() && (
        <p className="text-gray-500 text-xs mt-4">
          （检测到 App 环境：原生扫码将在 P5 接入，当前使用摄像头方案）
        </p>
      )}
    </div>
  );
}
