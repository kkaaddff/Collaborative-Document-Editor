// 顶栏：房间名（就地重命名，状态内聚于此）+ 房间码复制 + 二维码 + 连接状态 + 退出。
import { useState } from "react";
import { QrModal } from "@/components/QrModal";
import { getServerBase } from "@/lib/serverConfig";
import { useT } from "@/i18n";

interface RoomHeaderProps {
  roomCode: string;
  roomName: string;
  isConnected: boolean;
  onRename: (name: string) => void;
  onLeave: () => void;
}

export function RoomHeader({
  roomCode,
  roomName,
  isConnected,
  onRename,
  onLeave,
}: RoomHeaderProps) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [showQr, setShowQr] = useState(false);

  const startRename = () => {
    setDraft(roomName);
    setEditing(true);
  };
  const commitRename = () => {
    const next = draft.trim();
    if (next) onRename(next);
    setEditing(false);
  };

  const copyRoomCode = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(roomCode);
      } else {
        // 非安全上下文（http://IP 直连）无 Async Clipboard：execCommand 降级
        const ta = document.createElement("textarea");
        ta.value = roomCode;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      alert(t("roomHeader.copyOk"));
    } catch {
      alert(t("roomHeader.copyFail", { code: roomCode }));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {t("common.appName")}
        </h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t("roomHeader.room")}
          </span>
          {editing ? (
            <input
              autoFocus
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitRename();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setEditing(false);
                }
              }}
              onBlur={commitRename}
              maxLength={40}
              placeholder={t("roomHeader.roomNamePlaceholder")}
              className="px-2 py-1 rounded text-sm border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 max-w-[12rem]"
            />
          ) : (
            <button
              onClick={startRename}
              title={t("roomHeader.renameTitle")}
              className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline truncate max-w-[12rem]"
            >
              {roomName || t("common.unnamedDoc")}
            </button>
          )}
          <code className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded text-sm font-mono text-gray-900 dark:text-white">
            {roomCode}
          </code>
          <button
            onClick={copyRoomCode}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
          >
            {t("roomHeader.copy")}
          </button>
          <button
            onClick={() => setShowQr(true)}
            title={t("roomHeader.qrBtnTitle")}
            className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t("roomHeader.qrBtn")}
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isConnected ? t("roomHeader.connected") : t("roomHeader.disconnected")}
          </span>
        </div>

        <button
          onClick={onLeave}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          {t("roomHeader.leave")}
        </button>
      </div>

      {showQr && (
        <QrModal
          code={roomCode}
          server={getServerBase()}
          onClose={() => setShowQr(false)}
        />
      )}
    </div>
  );
}
