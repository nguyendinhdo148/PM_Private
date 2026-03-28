// components/backlog/create-task-dialog.tsx
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckSquare, AlertCircle, User, ChevronDown, Check } from "lucide-react";

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  storyId?: string;
  isLoading?: boolean;
  projectMembers?: Array<{ user: { _id: string; name: string; email: string; profilePicture?: string } }>;
}

export function CreateTaskDialog({ 
  open, 
  onClose, 
  onSubmit, 
  storyId, 
  isLoading = false,
  projectMembers = []
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setPriority("Medium");
      setSelectedAssignees([]);
      setShowAssigneeDropdown(false);
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
      assignees: selectedAssignees,
      storyId
    });
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getAssigneeName = (userId: string) => {
    const member = projectMembers.find(m => m.user._id === userId);
    return member?.user.name || userId;
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
              <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <CheckSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {storyId ? "Tạo Task mới cho Story" : "Tạo Task mới"}
                      </h2>
                      <p className="text-xs text-white/80 mt-0.5">
                        {storyId 
                          ? "Thêm một Task vào Story hiện tại" 
                          : "Thêm một Task mới vào dự án"}
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
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="VD: Thiết kế giao diện đăng nhập"
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
                    placeholder="Mô tả chi tiết về Task này..."
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
                      { value: "High", label: "Cao" }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPriority(option.value)}
                        disabled={isLoading}
                        className={`
                          px-4 py-2 rounded-xl font-medium text-sm transition-all
                          ${priority === option.value 
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
                
                {/* Assignees */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Người thực hiện
                    <span className="text-xs text-gray-400 ml-2">(không bắt buộc)</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                      className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-200 rounded-xl text-left text-gray-700 hover:border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isLoading}
                    >
                      {selectedAssignees.length === 0 ? (
                        <span className="text-gray-400">Chọn người thực hiện...</span>
                      ) : selectedAssignees.length <= 2 ? (
                        <span className="text-gray-700">
                          {selectedAssignees.map(id => getAssigneeName(id)).join(", ")}
                        </span>
                      ) : (
                        <span className="text-gray-700">
                          {selectedAssignees.length} người được chọn
                        </span>
                      )}
                    </button>
                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${showAssigneeDropdown ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {showAssigneeDropdown && projectMembers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                      <div className="p-2 space-y-1">
                        {projectMembers.map((member) => {
                          const isSelected = selectedAssignees.includes(member.user._id);
                          return (
                            <button
                              key={member.user._id}
                              type="button"
                              onClick={() => toggleAssignee(member.user._id)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className={`
                                w-5 h-5 rounded-full border-2 flex items-center justify-center
                                ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}
                              `}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-gray-700">
                                  {member.user.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {member.user.email}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Warning */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    {storyId 
                      ? "Task sẽ được thêm vào Story hiện tại." 
                      : "Task sẽ được tạo trong dự án hiện tại."}
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
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang tạo...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <CheckSquare className="w-4 h-4" />
                        <span>Tạo Task</span>
                      </div>
                    )}
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