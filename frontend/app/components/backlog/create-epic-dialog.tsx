// components/backlog/create-epic-dialog.tsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, AlertCircle } from "lucide-react";

interface CreateEpicDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export function CreateEpicDialog({ open, onClose, onSubmit, isLoading = false }: CreateEpicDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isLoading) return;
    
    onSubmit({ 
      title: title.trim(), 
      description: description.trim(), 
      priority 
    });
    
    setTitle("");
    setDescription("");
    setPriority("Medium");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop với hiệu ứng mờ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
            onClick={onClose}
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, type: "spring", damping: 25 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-full max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Header với gradient */}
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Tạo Epic mới</h2>
                      <p className="text-xs text-white/80 mt-0.5">
                        Tạo một Epic để nhóm các Story liên quan
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
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tiêu đề <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="VD: Cải thiện hiệu suất hệ thống"
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
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                    rows={4}
                    placeholder="Mô tả chi tiết về Epic này..."
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Mô tả giúp team hiểu rõ mục tiêu của Epic
                  </p>
                </div>
                
                {/* Priority */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Độ ưu tiên
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "Low", label: "Thấp", color: "green", bg: "bg-green-50", hover: "hover:bg-green-100", ring: "focus:ring-green-200" },
                      {
  value: "Medium",
  label: "Trung bình",
  color: "yellow",
  bg: "bg-yellow-500",
  hover: "hover:bg-yellow-600",
  ring: "focus:ring-yellow-400",
  text: "text-white"
},
                      { value: "High", label: "Cao", color: "red", bg: "bg-red-50", hover: "hover:bg-red-100", ring: "focus:ring-red-200" }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPriority(option.value)}
                        disabled={isLoading}
                        className={`
                          px-4 py-2 rounded-xl font-medium text-sm transition-all
                          ${priority === option.value 
                            ? `bg-${option.color}-500 text-white shadow-md ring-2 ring-${option.color}-200` 
                            : `bg-gray-100 text-gray-600 hover:bg-gray-200`
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Warning */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    Epic sẽ được tạo trong dự án hiện tại. Bạn có thể thêm Story sau khi tạo Epic.
                  </p>
                </div>
                
                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                    disabled={isLoading}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !title.trim()}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang tạo...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        <span>Tạo Epic</span>
                      </div>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}