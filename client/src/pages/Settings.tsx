// 设置页：服务器直连地址配置（CS 架构核心入口）。
// 保存后全端生效（WS 协同 / 图片上传 / 在线房间均走此地址）；留空则 Web 回落同源。
import { useState } from "react";
import { useNavigate } from "react-router";
import { getSavedServer, saveServer } from "@/lib/serverConfig";

type TestResult =
  | { ok: true; latency: number; rooms: number; users: number }
  | { ok: false; message: string };

/** 补全协议头：裸 "1.2.3.4:8101" 视作 http。 */
function withScheme(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

export default function Settings() {
  const navigate = useNavigate();
  const [url, setUrl] = useState(getSavedServer());
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const test = async () => {
    const base = withScheme(url);
    if (!base) {
      setResult({ ok: false, message: "请先输入服务器地址" });
      return;
    }
    setUrl(base);
    setTesting(true);
    setResult(null);
    const t0 = performance.now();
    try {
      const res = await fetch(`${base}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const latency = Math.round(performance.now() - t0);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        totalRooms?: number;
        totalUsers?: number;
      };
      setResult({
        ok: true,
        latency,
        rooms: data.totalRooms ?? 0,
        users: data.totalUsers ?? 0,
      });
    } catch (e) {
      setResult({
        ok: false,
        message: e instanceof Error ? e.message : "连接失败",
      });
    } finally {
      setTesting(false);
    }
  };

  const save = () => {
    saveServer(withScheme(url));
    navigate("/");
  };

  const reset = () => {
    saveServer("");
    setUrl("");
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">设置</h1>
          <p className="text-gray-600">配置协同服务器的直连地址</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          <div>
            <label
              htmlFor="serverUrl"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              服务器地址
            </label>
            <input
              type="text"
              id="serverUrl"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://192.168.1.10:8101 或 https://docz.hengheng.online"
              spellCheck={false}
              autoComplete="off"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-2">
              协同（WS）、图片上传、在线房间列表都走这个地址；留空时浏览器版回落当前站点同源。
              App 首次使用建议先测试连接再保存。
            </p>
          </div>

          {result && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                result.ok
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {result.ok ? (
                <span>
                  ✓ 连接成功：{result.latency}ms · {result.rooms} 个房间 ·{" "}
                  {result.users} 人在线
                </span>
              ) : (
                <span>✗ 连接失败：{result.message}</span>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={test}
              disabled={testing}
              className="flex-1 py-3 px-6 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {testing ? "测试中..." : "测试连接"}
            </button>
            <button
              onClick={save}
              className="flex-1 py-3 px-6 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg"
            >
              保存并返回
            </button>
          </div>

          {getSavedServer() && (
            <button
              onClick={reset}
              className="w-full text-sm text-gray-400 hover:text-red-500 transition-colors"
            >
              清除已保存地址（恢复同源默认）
            </button>
          )}
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← 返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
