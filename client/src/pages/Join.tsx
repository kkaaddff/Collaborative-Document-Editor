// /join?code=XXXX&server=http://...  扫码落地页。
// 固化 server 配置后二选一：已有用户名 → 直进编辑器；否则回首页预填房间码（让用户起名）。
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { saveServer } from "@/lib/serverConfig";
import { getSavedUsername } from "@/lib/storage";
import { useT } from "@/i18n";

export default function Join() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useT();
  const [message, setMessage] = useState(() => t("join.entering"));

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
      setMessage(t("join.needName"));
      navigate(`/?join=${code}`, { replace: true });
    }
  }, [searchParams, navigate, t]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}
