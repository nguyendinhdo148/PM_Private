import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types";
import {
  FolderTree,
  BookOpen,
  Filter,
  X,
  LayoutGrid,
  List,
  Sparkles,
} from "lucide-react";

interface TaskToolbarProps {
  epics?: any[];
  selectedEpicId: string | null;
  selectedStoryId: string | null;
  taskFilter: TaskStatus | "All";
  viewMode: "board" | "list";
  onSelectEpic: (epicId: string) => void;
  onSelectStory: (storyId: string) => void;
  onClearFilter: () => void;
  onTaskFilterChange: (filter: TaskStatus | "All") => void;
  onViewModeChange: (mode: "board" | "list") => void;
  getFilterLabel: () => string | undefined;
}

export const TaskToolbar = ({
  epics,
  selectedEpicId,
  selectedStoryId,
  taskFilter,
  viewMode,
  onSelectEpic,
  onSelectStory,
  onClearFilter,
  onTaskFilterChange,
  onViewModeChange,
  getFilterLabel,
}: TaskToolbarProps) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {epics && epics.length > 0 && (
            <div className="relative group">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-slate-600"
              >
                <FolderTree className="w-4 h-4" />
                {selectedEpicId || selectedStoryId
                  ? "Filtered"
                  : "Filter by Epic"}
                {(selectedEpicId || selectedStoryId) && (
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearFilter();
                    }}
                  />
                )}
              </Button>
              <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-xl border border-slate-100 hidden group-hover:block hover:block z-20">
                <div className="p-2">
                  <button
                    onClick={onClearFilter}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span>All Tasks</span>
                  </button>
                  {epics.map((epic: any) => (
                    <div key={epic._id} className="relative">
                      <button
                        onClick={() => onSelectEpic(epic._id)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2",
                          selectedEpicId === epic._id
                            ? "bg-blue-50 text-blue-700"
                            : "hover:bg-slate-50",
                        )}
                      >
                        <FolderTree className="w-4 h-4 text-purple-500" />
                        <span className="flex-1">{epic.title}</span>
                        <span className="text-xs text-slate-400">
                          {epic.stories?.length || 0}
                        </span>
                      </button>
                      {epic.stories?.length > 0 &&
                        selectedEpicId === epic._id && (
                          <div className="ml-6 mt-1 space-y-1 border-l-2 border-slate-100 pl-2">
                            {epic.stories.map((story: any) => (
                              <button
                                key={story._id}
                                onClick={() => onSelectStory(story._id)}
                                className={cn(
                                  "w-full text-left px-3 py-1.5 text-xs rounded-lg flex items-center gap-2",
                                  selectedStoryId === story._id
                                    ? "bg-green-50 text-green-700"
                                    : "hover:bg-slate-50",
                                )}
                              >
                                <BookOpen className="w-3 h-3 text-green-500" />
                                <span className="truncate">{story.title}</span>
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(["All", "To Do", "In Progress", "Done"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => onTaskFilterChange(status)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    taskFilter === status
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {status}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange("board")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "board"
                  ? "bg-white shadow-sm text-slate-900"
                  : "text-slate-500",
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "list"
                  ? "bg-white shadow-sm text-slate-900"
                  : "text-slate-500",
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {(selectedEpicId || selectedStoryId) && (
        <div className="mt-3 p-2.5 bg-blue-50 rounded-lg flex items-center justify-between border border-blue-100">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Filter className="w-4 h-4" />
            <span>{getFilterLabel()}</span>
          </div>
          <button
            onClick={onClearFilter}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
};
