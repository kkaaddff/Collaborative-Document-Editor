// 账号鉴权客户端:token 存取(localStorage)、带 Bearer 的 fetch、当前账号。
// token 由 Web 端「创建账号」获得(一次性展示),各端粘贴登录;WS 经
// useCollaboration 的 params 携带,HTTP 一律走 authFetch。
import { useCallback, useEffect, useState } from "react";
import { getServerBase, saveServer } from "@/lib/serverConfig";

const TOKEN_KEY = "polyphony.token";

export type Account = { id: string; name: string };

export function getToken(): string {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* 忽略(隐私模式) */
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* 忽略 */
  }
}

/** 带 Bearer 的 fetch;401 统一清 token 并回引导页(登录态失效只有这一种来源)。 */
export async function authFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${getToken()}`,
    },
  });
  if (res.status === 401) {
    clearToken();
    window.location.assign("/welcome");
    throw new Error("unauthorized");
  }
  return res;
}

/** 创建账号(Web 独占流程;先固化服务器地址再请求)。返回一次性明文 token。 */
export async function createAccount(server: string, name: string): Promise<{ token: string; name: string }> {
  saveServer(server.trim());
  const res = await fetch(`${getServerBase()}/auth/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = (await res.json().catch(() => ({}))) as { token?: string; code?: string; error?: string };
  if (!res.ok) {
    const err = new Error(data.error || "create failed") as Error & { code?: string };
    err.code = data.code;
    throw err;
  }
  return { token: data.token!, name };
}

/** 校验 token(粘贴登录):有效返回账号信息。 */
export async function verifyLogin(server: string, token: string): Promise<Account> {
  saveServer(server.trim());
  const res = await fetch(`${getServerBase()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as Account;
}

/** 当前登录账号(供顶栏身份展示与默认用户名)。 */
export function useAccount(): { account: Account | null; reload: () => void } {
  const [account, setAccount] = useState<Account | null>(null);

  const reload = useCallback(() => {
    const token = getToken();
    if (!token) {
      setAccount(null);
      return;
    }
    let cancelled = false;
    fetch(`${getServerBase()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setAccount(d);
      })
      .catch(() => {
        /* 网络失败保持 null,顶栏回落显示地址 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cleanup = reload();
    return cleanup;
  }, [reload]);

  return { account, reload };
}
