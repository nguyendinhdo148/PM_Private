// components/backlog/story-item.tsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  MoreHorizontal,
  Trash2,
  Archive,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  User
} from "lucide-react";
import { CreateTaskDialog } from "./create-task-dialog";
import { updateStory, deleteStory, archiveStory, createTask } from "@/lib/fetch-util";

interface StoryItemProps {
  story: any;
  onRefresh: () => void;
  projectId: string;
  workspaceId: string;
  epicId: string;
  projectMembers?: any[];
}

export function StoryItem({ story, onRefresh, projectId, workspaceId, epicId, projectMembers = [] }: StoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Tính toán tiến độ
  const totalTasks = story.tasks?.length || 0;
  const completedTasks = story.tasks?.filter((t: any) => t.status === "Done").length || 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const handleCreateTask = async (taskData: any) => {
    try {
      setIsCreating(true);
      await createTask(projectId, {
        ...taskData,
        story: story._id,
      });
      await onRefresh();
      setShowCreateTask(false);
    } catch (error) {
      console.error("Lỗi tạo Task:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleArchive = async () => {
    try {
      setIsUpdating(true);
      await archiveStory(workspaceId, projectId, epicId, story._id);
      await onRefresh();
      setShowMenu(false);
    } catch (error) {
      console.error("Lỗi archive story:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn xóa story này? Tất cả tasks bên trong sẽ bị ảnh hưởng.")) return;
    
    try {
      setIsUpdating(true);
      await deleteStory(workspaceId, projectId, epicId, story._id);
      await onRefresh();
      setShowMenu(false);
    } catch (error) {
      console.error("Lỗi xóa story:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
      {/* Story Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0.5 hover:bg-gray-100 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
            
            <div className="p-1.5 bg-green-50 rounded">
              <BookOpen className="w-4 h-4 text-green-600" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-800 text-sm">{story.title}</h4>
                {story.priority && (
                  <span className={`
                    px-1.5 py-0.5 text-xs rounded-full font-medium
                    ${story.priority === 'High' ? 'bg-red-100 text-red-700' : ''}
                    ${story.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : ''}
                    ${story.priority === 'Low' ? 'bg-green-100 text-green-700' : ''}
                  `}>
                    {story.priority}
                  </span>
                )}
                {/* {story.status && (
                  <span className={`
                    px-1.5 py-0.5 text-xs rounded-full font-medium
                    ${story.status === 'Done' ? 'bg-green-100 text-green-700' : ''}
                    ${story.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : ''}
                    ${story.status === 'Review' ? 'bg-purple-100 text-purple-700' : ''}
                    ${story.status === 'To Do' ? 'bg-gray-100 text-gray-700' : ''}
                  `}>
                    {story.status}
                  </span>
                )} */}
              </div>
              {story.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{story.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Story Points */}
            {story.storyPoints > 0 && (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {story.storyPoints} pts
              </span>
            )}
            
            {/* Progress */}
            {totalTasks > 0 && (
              <div className="hidden sm:flex items-center gap-1">
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      progress === 100 ? 'bg-green-500' : 'bg-blue-400'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  progress === 100 ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {completedTasks}/{totalTasks}
                </span>
              </div>
            )}

            {/* Assignees */}
            {story.assignees && story.assignees.length > 0 && (
              <div className="flex items-center -space-x-1">
                {story.assignees.slice(0, 2).map((assignee: any, idx: number) => (
                  <div
                    key={idx}
                    className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center"
                    title={assignee.name}
                  >
                    {assignee.profilePicture ? (
                      <img src={assignee.profilePicture} alt={assignee.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-3 h-3 text-gray-500" />
                    )}
                  </div>
                ))}
                {story.assignees.length > 2 && (
                  <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-600">
                    +{story.assignees.length - 2}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="relative">
              <button
                onClick={() => setShowCreateTask(true)}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Thêm Task"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px]">
                    <button
                      onClick={handleArchive}
                      disabled={isUpdating}
                      className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      {story.isArchived ? "Bỏ lưu trữ" : "Lưu trữ"}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isUpdating}
                      className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <AnimatePresence>
        {isExpanded && story.tasks && story.tasks.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="p-3 pl-12 space-y-2 bg-gray-50/30">
              {story.tasks.map((task: any) => (
                <div key={task._id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className={`w-4 h-4 ${task.status === 'Done' ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={`flex-1 ${task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {task.title}
                  </span>
                  {task.status && (
                    <span className={`
                      px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap
                      ${task.status === 'Done' ? 'bg-green-100 text-green-700' : ''}
                      ${task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : ''}
                      ${task.status === 'Review' ? 'bg-purple-100 text-purple-700' : ''}
                      ${task.status === 'To Do' ? 'bg-gray-100 text-gray-700' : ''}
                    `}>
                      {task.status}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {task.assignees?.length || 0} người
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Task Dialog */}
      <CreateTaskDialog 
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        onSubmit={handleCreateTask}
        storyId={story._id}
        isLoading={isCreating}
        projectMembers={projectMembers}
      />
    </div>
  );
}