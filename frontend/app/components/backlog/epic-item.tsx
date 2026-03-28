// components/backlog/epic-item.tsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Trash2,
  Archive,
  FolderOpen,
  AlertCircle
} from "lucide-react";
import { StoryItem } from "./story-item";
import { CreateStoryDialog } from "./create-story-dialog";
import { updateEpic, deleteEpic, archiveEpic, createStory } from "@/lib/fetch-util";

interface EpicItemProps {
  epic: any;
  onRefresh: () => void;
  projectId: string;
  workspaceId: string;
  projectMembers?: any[];
}

export function EpicItem({
  epic,
  onRefresh,
  projectId,
  workspaceId,
  projectMembers = []
}: EpicItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // 🔥 FIX: chuẩn hoá status + tính theo STORY
  const totalStories = epic.stories?.length || 0;

  const completedStories =
  epic.stories?.filter((story: any) => {
    const totalTasks = story.tasks?.length || 0;
    const doneTasks =
      story.tasks?.filter(
        (t: any) => t.status?.toLowerCase() === "done"
      ).length || 0;

    return totalTasks > 0 && doneTasks === totalTasks;
  }).length || 0;

  const progress =
    totalStories > 0 ? (completedStories / totalStories) * 100 : 0;

  const handleCreateStory = async (storyData: any) => {
    try {
      setIsCreating(true);
      await createStory(workspaceId, projectId, epic._id, storyData);
      await onRefresh();
      setShowCreateStory(false);
    } catch (error) {
      console.error("Lỗi tạo Story:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleArchive = async () => {
    try {
      setIsUpdating(true);
      await archiveEpic(workspaceId, projectId, epic._id);
      await onRefresh();
      setShowMenu(false);
    } catch (error) {
      console.error("Lỗi archive epic:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Bạn có chắc muốn xóa epic này? Tất cả stories và tasks bên trong sẽ bị ảnh hưởng."
      )
    )
      return;

    try {
      setIsUpdating(true);
      await deleteEpic(workspaceId, projectId, epic._id);
      await onRefresh();
      setShowMenu(false);
    } catch (error) {
      console.error("Lỗi xóa epic:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Epic Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
            </button>

            <div
              className="p-2 rounded-lg"
              style={{
                backgroundColor: (epic.color || "#8B5CF6") + "20"
              }}
            >
              <FolderOpen
                className="w-5 h-5"
                style={{ color: epic.color || "#8B5CF6" }}
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">
                  {epic.title}
                </h3>

                {/* PRIORITY */}
                {epic.priority && (
                  <span
                    className={`
                    px-2 py-0.5 text-xs rounded-full font-medium
                    ${
                      epic.priority === "High"
                        ? "bg-red-100 text-red-700"
                        : ""
                    }
                    ${
                      epic.priority === "Medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : ""
                    }
                    ${
                      epic.priority === "Low"
                        ? "bg-green-100 text-green-700"
                        : ""
                    }
                  `}
                  >
                    {epic.priority}
                  </span>
                )}

                {/* STATUS
                {epic.status && (
                  <span
                    className={`
                    px-2 py-0.5 text-xs rounded-full font-medium
                    ${
                      epic.status === "Done"
                        ? "bg-green-100 text-green-700"
                        : ""
                    }
                    ${
                      epic.status === "In Progress"
                        ? "bg-blue-100 text-blue-700"
                        : ""
                    }
                    ${
                      epic.status === "Review"
                        ? "bg-purple-100 text-purple-700"
                        : ""
                    }
                    ${
                      epic.status === "To Do"
                        ? "bg-gray-100 text-gray-700"
                        : ""
                    }
                  `}
                  >
                    {epic.status}
                  </span>
                )} */}
              </div>

              {epic.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                  {epic.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 🔥 PROGRESS */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    progress === 100
                      ? "bg-green-500"
                      : progress > 60
                      ? "bg-blue-500"
                      : progress > 30
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <span
                className={`text-xs font-medium ${
                  progress === 100
                    ? "text-green-600"
                    : "text-gray-600"
                }`}
              >
                {completedStories}/{totalStories}
              </span>
            </div>

            {/* ACTION */}
            <div className="flex items-center gap-1 relative">
              <button
                onClick={() => setShowCreateStory(true)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]">
                    <button
                      onClick={handleArchive}
                      disabled={isUpdating}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Archive className="w-4 h-4" />
                      {epic.isArchived
                        ? "Bỏ lưu trữ"
                        : "Lưu trữ"}
                    </button>

                    <button
                      onClick={handleDelete}
                      disabled={isUpdating}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Xóa
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* STORIES */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3 bg-gray-50/50">
              {epic.stories && epic.stories.length > 0 ? (
                epic.stories.map((story: any) => (
                  <StoryItem
                    key={story._id}
                    story={story}
                    onRefresh={onRefresh}
                    projectId={projectId}
                    workspaceId={workspaceId}
                    epicId={epic._id}
                    projectMembers={projectMembers}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                    <AlertCircle className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">
                    Chưa có Story nào
                  </p>
                  <button
                    onClick={() => setShowCreateStory(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Tạo Story đầu tiên
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIALOG */}
      <CreateStoryDialog
        open={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onSubmit={handleCreateStory}
        isLoading={isCreating}
      />
    </div>
  );
}