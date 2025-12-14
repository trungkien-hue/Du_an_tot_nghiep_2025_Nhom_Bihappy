import React from "react";

/**
 * Props:
 * - columns: [{ key, title, render? }]
 * - rows: any[]
 * - onEdit?: (row) => void
 * - onDelete?: (row) => void
 * - onRestore?: (row) => void
 * - extraAction?: (row) => ReactNode   // ✅ thêm mới
 */
export default function Table({
  columns = [],
  rows = [],
  onEdit,
  onDelete,
  onRestore,
  extraAction,        // ✅ nhận prop mới
}) {
  return (
    <div className="overflow-x-auto border rounded-xl bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 text-left font-medium">
                {c.title}
              </th>
            ))}

            {/* ✅ Thêm cột “Ảnh” nếu có extraAction */}
            {extraAction && (
              <th className="px-3 py-2 text-left font-medium">Ảnh</th>
            )}

            {(onEdit || onDelete || onRestore) && (
              <th className="px-3 py-2 text-right font-medium">
                Thao tác
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-t">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2">
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}

              {/* ✅ Hiển thị nút “Ảnh” */}
              {extraAction && (
                <td className="px-3 py-2">
                  {extraAction(r)}
                </td>
              )}

              {(onEdit || onDelete || onRestore) && (
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 justify-end">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(r)}
                        className="px-2 py-1 rounded border hover:bg-gray-50"
                      >
                        Sửa
                      </button>
                    )}

                    {onDelete && (
                      <button
                        onClick={() => onDelete(r)}
                        className="px-2 py-1 rounded border text-red-600 hover:bg-red-50"
                      >
                        Xoá
                      </button>
                    )}

                    {onRestore && (
                      <button
                        onClick={() => onRestore(r)}
                        className="px-2 py-1 rounded border text-green-700 hover:bg-green-50"
                      >
                        Khôi phục
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <td
                className="px-3 py-6 text-center text-gray-500"
                colSpan={
                  columns.length +
                  (extraAction ? 1 : 0) +
                  (onEdit || onDelete || onRestore ? 1 : 0)
                }
              >
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
