import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { MDXEditor } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import "@/lib/fixTableCopy"; // 修复表格无法拷贝（给 TableNode 补 exportDOM）
import { useCollaboration } from "@/lib/useCollaboration";
import { getServerBase } from "@/lib/serverConfig";
import { upsertRecentRoom } from "@/lib/storage";
import { authFetch, useAccount } from "@/lib/auth";
import { useT } from "@/i18n";
import { createEditorPlugins } from "@/components/editorConfig";
import { RoomHeader } from "@/components/RoomHeader";
import { UsersPanel } from "@/components/UsersPanel";
import { User } from "@/types";

/** useCollaboration 置出的稳定错误码 → 文案键（渲染层翻译）。 */
const COLLAB_ERROR_KEYS: Record<string, "editor.collabError" | "editor.connectionClosed"> = {
  ERR_COLLAB_CONNECT: "editor.collabError",
  ERR_CONNECTION_CLOSED: "editor.connectionClosed",
};

/** 服务端上传错误码（server/index.js）→ 文案键；旧服务端无 code 时回落 error 文本。 */
const UPLOAD_ERROR_KEYS: Record<string, "errors.E_NO_FILE" | "errors.E_FILE_TYPE" | "errors.E_FILE_SIZE" | "errors.E_UPLOAD"> = {
  E_NO_FILE: "errors.E_NO_FILE",
  E_FILE_TYPE: "errors.E_FILE_TYPE",
  E_FILE_SIZE: "errors.E_FILE_SIZE",
  E_UPLOAD: "errors.E_UPLOAD",
};

export default function Editor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useT();
  const { account } = useAccount();

  const roomCode = useMemo(
    () => searchParams.get("code")?.toUpperCase() ?? "",
    [searchParams]
  );
  // 优先 URL 带名(Join/首页跳转);否则回落账号名
  const userName = searchParams.get("name") || account?.name || t("common.anonymous");
  const [userId] = useState(
    () => `user-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  );

  useEffect(() => {
    if (!roomCode) {
      navigate("/", { replace: true });
    }
  }, [roomCode, navigate]);

  const [content, setContent] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [roomName, setRoomName] = useState("");
  const editorRef = useRef<MDXEditorMethods | null>(null);
  const isUpdatingFromRemote = useRef(false);
  const contentRef = useRef<string>("");

  const { isConnected, error, applyLocalChange, renameRoom } = useCollaboration({
    roomCode,
    userName,
    userId,
    onContentChange: (newContent) => {
      // 避免循环更新
      if (isUpdatingFromRemote.current) {
        return;
      }
      if (newContent !== contentRef.current) {
        isUpdatingFromRemote.current = true;
        contentRef.current = newContent as string;
        setContent(newContent);
        // 同步到 MDXEditor
        if (editorRef.current) {
          editorRef.current.setMarkdown(newContent as string);
        }
        // 使用 setTimeout 确保状态更新完成
        setTimeout(() => {
          isUpdatingFromRemote.current = false;
        }, 0);
      }
    },
    onUsersChange: setUsers,
    onRoomNameChange: setRoomName,
  });

  // 共享房间名同步到本地「最近房间」快照与服务端房间簿，首页列表随之保鲜。
  // 不做防抖:改名后立刻退出编辑器的场景,防抖定时器会被卸载取消导致房间名丢失
  useEffect(() => {
    if (!roomCode) return;
    if (roomName) {
      upsertRecentRoom({ code: roomCode, name: roomName });
    }
    authFetch(`${getServerBase()}/rooms/enter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: roomCode, name: roomName }),
    }).catch(() => {
      /* 登记失败不打断编辑 */
    });
  }, [roomCode, roomName]);

  const handleContentChange = useCallback(
    (markdown: string, initialMarkdownNormalize: boolean) => {
      if (!initialMarkdownNormalize && !isUpdatingFromRemote.current) {
        contentRef.current = markdown;
        setContent(markdown);
        applyLocalChange(markdown);
      }
    },
    [applyLocalChange]
  );

  const handleImageUpload = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    // 运行时解析服务器地址（直连 IP 或同源）;上传需登录(authFetch 自动带 Bearer)
    const baseUrl = getServerBase();
    try {
      const response = await authFetch(`${baseUrl}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        const key = UPLOAD_ERROR_KEYS[errorData.code as string];
        throw new Error(key ? t(key) : errorData.error || t("errors.E_UPLOAD"));
      }

      const data = await response.json();
      // 返回完整的 URL
      return `${baseUrl}${data.url}`;
    } catch (error) {
      console.error("image upload failed:", error);
      alert(
        t("editor.uploadFail", {
          msg: error instanceof Error ? error.message : t("editor.unknownError"),
        })
      );
      throw error;
    }
  }, [t]);

  // 插件数组只在 upload handler 变化时重建（handler 已 useCallback，实际稳定）
  const plugins = useMemo(
    () => createEditorPlugins(handleImageUpload),
    [handleImageUpload]
  );

  if (!roomCode) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <RoomHeader
        roomCode={roomCode}
        roomName={roomName}
        isConnected={isConnected}
        onRename={renameRoom}
        onLeave={() => navigate("/")}
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 px-6 py-4">
          <p className="text-red-700 dark:text-red-400">
            {COLLAB_ERROR_KEYS[error]
              ? t(COLLAB_ERROR_KEYS[error])
              : error}
          </p>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("editor.docContent")}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t("editor.charCount", { n: content.length })}
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              <MDXEditor
                ref={editorRef}
                markdown={content}
                onChange={handleContentChange}
                plugins={plugins}
                contentEditableClassName="focus:outline-none min-h-[400px] p-4 text-gray-900 dark:text-gray-100"
                className="h-full dark:[&_.mdx-editor-toolbar]:bg-gray-800 [&_.mdx-editor-toolbar]:bg-white"
                spellCheck={true}
              />
            </div>
          </div>
        </div>

        <UsersPanel users={users} />
      </div>
    </div>
  );
}
