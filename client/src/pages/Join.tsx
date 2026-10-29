// /join?code=XXXX&server=http://...  扫码落地页。
// 固化 server 配置后二选一：已有用户名 → 直进编辑器；否则回首页预填房间码（让用户起名）。
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { saveServer } from "@/lib/serverConfig";
import { getSavedUsername } from "@/lib/storage";

export default function Join() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("正在进入房间...");

  useEffect(() => {
    const server = searchParams.get("server");
    const code = (searchParams.get("code") ?? "").trim().toUpperCase();
    if (server) saveServer(server);

    if (!code) {
      navigate("/", { replace: true });
      return;
    }

    // 经 getSavedUsername：hook 存的是 JSON 串，裸读会带引号进编辑器
    const savedName = getSavedUsername();

    if (savedName.trim()) {
      navigate(`/editor?code=${code}&name=${encodeURIComponent(savedName.trim())}`, {
        replace: true,
      });
    } else {
      setMessage("请先设置用户名，加入房间");
      navigate(`/?join=${code}`, { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}
