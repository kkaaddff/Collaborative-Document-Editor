import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  getRecentRooms,
  removeRecentRoom,
  upsertRecentRoom,
  useLocalStorageState,
  USERNAME_KEY,
} from "@/lib/storage";
import { generateRoomCode, formatRelative } from "@/lib/roomCode";
import { getServerBase, saveServer } from "@/lib/serverConfig";
import { parseJoinPayload } from "@/lib/qr";
import { QrModal } from "@/components/QrModal";
import { ScanModal } from "@/components/ScanModal";
import { isDesktopTauri } from "@/platform";
import { onTrayAction, pushRecentRooms } from "@/platform/tray";
import type { RecentRoom } from "@/types";

type OnlineRoom = { code: string; userCount: number };

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 用户名：localStorage 持久化、创建/加入共用、预填
  const [userName, setUserName] = useLocalStorageState<string>(USERNAME_KEY, "");

  // ?join=CODE：扫码落地（新设备未存用户名时 Join 页转来）预填房间码
  const [roomCode, setRoomCode] = useState(
    () => (searchParams.get("join") ?? "").toUpperCase()
  );
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [onlineRooms, setOnlineRooms] = useState<OnlineRoom[]>([]);
  // 二维码弹层（当前展示的房间码）/ 扫码弹层
  const [qrFor, setQrFor] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  // 服务器连通状态：null=探测中 true/false=健康检查结果；地址仅本组件生命周期内固定（设置页保存后返回会重挂载重读）
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const serverBase = useMemo(() => getServerBase(), []);

  const resolveName = () => {
    const n = userName.trim();
    return n || `用户${Math.floor(Math.random() * 1000)}`;
  };

  // 统一进入房间：记录最近房间 + 跳转
  const enterRoom = useCallback(
    (code: string) => {
      const existing =
        getRecentRooms().find((r) => r.code === code)?.name ?? "";
      upsertRecentRoom({ code, name: existing });
      setRecentRooms(getRecentRooms());
      navigate(`/editor?code=${code}&name=${encodeURIComponent(resolveName())}`);
    },
    [userName]
  );

  // 创建新文档
  const handleCreateNew = () => {
    enterRoom(generateRoomCode());
  };

  // 加入已有文档（表单提交）
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      alert("请输入房间代码");
      return;
    }
    if (!userName.trim()) {
      alert("请输入用户名");
      return;
    }
    enterRoom(code);
  };

  // 扫码结果 → 固化 server（载荷携带时）→ 进房
  const handleScanResult = (text: string) => {
    setScanOpen(false);
    const payload = parseJoinPayload(text);
    if (!payload) {
      alert("未识别到有效的房间二维码");
      return;
    }
    if (payload.server) saveServer(payload.server);
    if (!userName.trim()) {
      setRoomCode(payload.code);
      alert("已识别房间，请填写用户名后加入");
      return;
    }
    enterRoom(payload.code);
  };

  // 拉取服务器在线房间
  const fetchOnline = useCallback(async () => {
    try {
      const res = await fetch(`${getServerBase()}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = (
        Array.isArray(data?.rooms) ? data.rooms : []
      ) as Array<Record<string, unknown>>;
      const rooms: OnlineRoom[] = raw
        .map((r) => ({
          code: String(r?.code ?? ""),
          userCount: Number(r?.userCount ?? 0),
        }))
        .filter((r) => r.code);
      setOnlineRooms(rooms);
      setServerOk(true);
    } catch {
      setServerOk(false);
      /* 离线/服务不可达：在线列表静默降级，状态条负责提示 */
    }
  }, []);

  useEffect(() => {
    setRecentRooms(getRecentRooms());
    fetchOnline();
    const id = window.setInterval(fetchOnline, 15000);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchOnline();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchOnline]);

  const handleRemoveRecent = (code: string) => {
    removeRecentRoom(code);
    setRecentRooms(getRecentRooms());
  };

  // 桌面：最近房间 → 托盘菜单（菜单即达；托盘为桌面专属能力）
  useEffect(() => {
    if (!isDesktopTauri()) return;
    pushRecentRooms(recentRooms);
  }, [recentRooms]);

  // 桌面：托盘动作（新建/直达房间）→ 导航
  useEffect(() => {
    if (!isDesktopTauri()) return;
    let disposed = false;
    let un: (() => void) | undefined;
    onTrayAction((action) => {
      if (action.type === "new") enterRoom(generateRoomCode());
      else enterRoom(action.code);
    }).then((u) => (disposed ? u() : (un = u)));
    return () => {
      disposed = true;
      un?.();
    };
  }, [enterRoom]);

  // code → 本地名（在线房间列表交叉引用显示）
  const nameByCode = new Map(recentRooms.map((r) => [r.code, r.name]));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* 标题区域 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            协同文档编辑器
          </h1>
          <p className="text-lg text-gray-600">
            实时协同编辑，支持多用户同时编写文档
          </p>
          {/* 服务器直连状态：绿=已连 红=不可达 灰=探测中 */}
          <div className="flex items-center justify-center gap-2 mt-4 text-sm">
            <span
              className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                serverOk === null
                  ? "bg-gray-300"
                  : serverOk
                    ? "bg-green-500"
                    : "bg-red-500"
              }`}
            />
            <span className="text-gray-500 font-mono truncate max-w-xs">
              {serverBase}
            </span>
            <Link
              to="/settings"
              className="text-blue-600 hover:text-blue-700 hover:underline shrink-0"
            >
              设置
            </Link>
          </div>
        </div>

        {/* 服务器不可达时的直连引导（Web 跨源/App 未配置场景） */}
        {serverOk === false && (
          <div className="mb-6 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            无法连接协同服务器。若服务部署在其他地址，请
            <Link
              to="/settings"
              className="font-semibold underline underline-offset-2"
            >
              前往设置
            </Link>
            配置直连地址（如 http://IP:端口）后使用。
          </div>
        )}

        {/* 主要内容卡片 */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-8">
          {/* 用户名：创建/加入共用 */}
          <div>
            <label
              htmlFor="userName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              用户名
            </label>
            <input
              type="text"
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="输入您的用户名（下次自动带出）"
              maxLength={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* 创建新文档 */}
          <div className="border-b border-gray-200 pb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              创建新文档
            </h2>
            <p className="text-gray-600 mb-6">
              快速创建一个新的协同文档，系统会自动生成房间代码
            </p>

            <button
              onClick={handleCreateNew}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              创建新文档
            </button>
          </div>

          {/* 加入已有文档 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              加入已有文档
            </h2>
            <p className="text-gray-600 mb-6">
              输入房间代码加入现有文档，或从下方列表直接进入
            </p>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label
                  htmlFor="roomCode"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  房间代码
                </label>
                <input
                  type="text"
                  id="roomCode"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="输入 8 位房间代码"
                  maxLength={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-gray-900 text-white font-semibold py-4 px-6 rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  加入文档
                </button>
                <button
                  type="button"
                  onClick={() => setScanOpen(true)}
                  title="扫房间二维码直接加入"
                  className="px-5 py-4 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  扫码加入
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 房间列表：最近房间（本地） + 在线房间（服务器） */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 我的最近房间 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🕘</span> 我的最近房间
            </h3>
            {recentRooms.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">
                还没有访问过的房间
              </p>
            ) : (
              <ul className="space-y-2">
                {recentRooms.map((room) => (
                  <li key={room.code}>
                    <div className="group flex items-center gap-2 p-3 rounded-lg hover:bg-blue-50 transition-colors">
                      <button
                        onClick={() => enterRoom(room.code)}
                        className="flex-1 flex items-center gap-2 text-left min-w-0"
                      >
                        <span className="font-medium text-gray-900 truncate">
                          {room.name || "未命名文档"}
                        </span>
                        <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono shrink-0">
                          {room.code}
                        </code>
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatRelative(room.lastUsed)}
                        </span>
                      </button>
                      <button
                        onClick={() => setQrFor(room.code)}
                        title="显示二维码"
                        className="text-gray-300 hover:text-blue-500 px-1 leading-none"
                      >
                        ▦
                      </button>
                      <button
                        onClick={() => handleRemoveRecent(room.code)}
                        title="移出列表"
                        className="text-gray-300 hover:text-red-500 px-1 text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 服务器在线房间 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🟢</span> 服务器在线房间
            </h3>
            {onlineRooms.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">
                当前没有在线房间
              </p>
            ) : (
              <ul className="space-y-2">
                {onlineRooms.map((room) => (
                  <li key={room.code}>
                    <button
                      onClick={() => enterRoom(room.code)}
                      className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-blue-50 transition-colors text-left"
                    >
                      <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono shrink-0">
                        {room.code}
                      </code>
                      <span className="font-medium text-gray-900 truncate">
                        {nameByCode.get(room.code) || "在线房间"}
                      </span>
                      <span className="ml-auto text-xs text-green-600 shrink-0">
                        {room.userCount} 人在线
                      </span>
                    </button>
                    <button
                      onClick={() => setQrFor(room.code)}
                      title="显示二维码"
                      className="text-gray-300 hover:text-blue-500 px-1 leading-none"
                    >
                      ▦
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 二维码 / 扫码弹层 */}
        {qrFor && (
          <QrModal
            code={qrFor}
            server={serverBase}
            onClose={() => setQrFor(null)}
          />
        )}
        {scanOpen && (
          <ScanModal onResult={handleScanResult} onClose={() => setScanOpen(false)} />
        )}

        {/* 功能特性 */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-semibold text-gray-900 mb-2">实时同步</h3>
            <p className="text-sm text-gray-600">
              基于 Yjs CRDT，多人并发编辑自动收敛、无冲突
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-2">富文本协同</h3>
            <p className="text-sm text-gray-600">
              表格、图片、代码块、列表，多人同时编辑实时可见
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-3xl mb-3">🏠</div>
            <h3 className="font-semibold text-gray-900 mb-2">房间管理</h3>
            <p className="text-sm text-gray-600">
              最近房间一键回归，房间可命名、用户名自动记住
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
