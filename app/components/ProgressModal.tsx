'use client';

import { X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

interface ProgressItem {
  id: number;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

interface ProgressModalProps {
  isOpen: boolean;
  title: string;
  total: number;
  items: ProgressItem[];
  onClose: () => void;
  onCancel?: () => void;
}

export default function ProgressModal({
  isOpen,
  title,
  total,
  items,
  onClose,
  onCancel,
}: ProgressModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const completed = items.filter((item) => item.status === 'success' || item.status === 'error').length;
  const successCount = items.filter((item) => item.status === 'success').length;
  const errorCount = items.filter((item) => item.status === 'error').length;
  const isComplete = completed === total;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          {isComplete && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress: {completed} / {total}
            </span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {isComplete && (
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>{successCount} successful</span>
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span>{errorCount} failed</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200"
              >
                {item.status === 'pending' && (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
                {item.status === 'processing' && (
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                )}
                {item.status === 'success' && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                {item.status === 'error' && (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    Tweet #{item.id}
                  </div>
                  {item.error && (
                    <div className="text-xs text-red-600 mt-1">{item.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          {!isComplete && onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          {isComplete && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
