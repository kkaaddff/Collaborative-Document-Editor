// 在线用户侧栏：awareness presence 列表（头像色点 + 用户名）。
import type { User } from "@/types";

export function UsersPanel({ users }: { users: User[] }) {
  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6 overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        在线用户 ({users.length})
      </h2>

      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: user.color || "#999" }}
            />
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {user.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
