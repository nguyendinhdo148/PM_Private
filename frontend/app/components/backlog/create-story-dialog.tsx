// components/backlog/create-story-dialog.tsx
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, AlertCircle, Star } from "lucide-react";

interface CreateStoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export function CreateStoryDialog({
  open,
  onClose,
  onSubmit,
  isLoading = false,
}: CreateStoryDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [storyPoints, setStoryPoints] = useState(0);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setPriority("Medium");
      setStoryPoints(0);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isLoading) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      storyPoints,
    });
  };

  const priorityStyle: any = {
    Low: "bg-green-500 text-white shadow-md ring-2 ring-green-200",
    Medium: "bg-yellow-500 text-white shadow-md ring-2 ring-yellow-200",
    High: "bg-red-500 text-white shadow-md ring-2 ring-red-200",
  };

  const dialogContent = (
    <AnimatePresence>
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            style={{ zIndex: 9999 }}
            onClick={onClose}
          />
          <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 10000 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        Tạo Story mới
                      </h2>
                      <p className="text-xs text-white/80 mt-0.5">
                        Thêm một Story vào Epic hiện tại
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                    disabled={isLoading}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tiêu đề <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                    placeholder="VD: Người dùng có thể đăng nhập bằng Google"
                    required
                    autoFocus
                    disabled={isLoading}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mô tả
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all resize-none"
                    rows={4}
                    placeholder="Mô tả chi tiết về Story này..."
                    disabled={isLoading}
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Độ ưu tiên
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "Low", label: "Thấp" },
                      { value: "Medium", label: "Trung bình" },
                      { value: "High", label: "Cao" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPriority(option.value)}
                        disabled={isLoading}
                        className={`
                          px-4 py-2 rounded-xl font-medium text-sm transition-all
                          ${
                            priority === option.value
                              ? priorityStyle[option.value]
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Story Points */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Story Points
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={storyPoints}
                        onChange={(e) =>
                          setStoryPoints(parseInt(e.target.value) || 0)
                        }
                        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                        placeholder="0"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 5, 8, 13].map((point) => (
                        <button
                          key={point}
                          type="button"
                          onClick={() => setStoryPoints(point)}
                          disabled={isLoading}
                          className={`
                            w-10 h-10 rounded-lg font-medium text-sm transition-all
                            ${
                              storyPoints === point
                                ? "bg-green-500 text-white shadow-md"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }
                          `}
                        >
                          {point}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Story Points thể hiện độ phức tạp của Story (Fibonacci)
                  </p>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Story sẽ được thêm vào Epic hiện tại. Bạn có thể thêm Task
                    sau khi tạo Story.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
                    disabled={isLoading}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !title.trim()}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-md"
                  >
                    {isLoading ? "Đang tạo..." : "Tạo Story"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(dialogContent, document.body);
}