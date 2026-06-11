import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  pagination?: {
    skip: number;
    limit: number;
    total: number;
    onPageChange: (skip: number) => void;
  };
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  pagination,
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  const currentPage = pagination ? Math.floor(pagination.skip / pagination.limit) + 1 : 1;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className={`border-b border-slate-700/50 last:border-0 ${
                    onRowClick ? 'hover:bg-slate-700/40 cursor-pointer transition-colors' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm text-slate-200">
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            Showing {pagination.skip + 1}–{Math.min(pagination.skip + pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(Math.max(0, pagination.skip - pagination.limit))}
              disabled={currentPage <= 1}
              className="p-1 rounded-md hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-slate-400 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => pagination.onPageChange(pagination.skip + pagination.limit)}
              disabled={currentPage >= totalPages}
              className="p-1 rounded-md hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
