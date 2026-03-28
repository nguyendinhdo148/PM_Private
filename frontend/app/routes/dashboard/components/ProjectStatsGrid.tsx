import { FolderTree, TrendingUp, Target, Users } from "lucide-react";
import { StatCard } from "./StatCard";
import type { Task } from "@/types";

interface ProjectStatsGridProps {
  tasks: Task[];
  taskCounts: { todo: number; inProgress: number; done: number };
  epicStats: { totalEpics: number; totalStories: number };
  projectProgress: number;
  members?: any[];
}

export const ProjectStatsGrid = ({
  tasks,
  taskCounts,
  epicStats,
  projectProgress,
  members,
}: ProjectStatsGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
      <StatCard
        icon={<TrendingUp className="w-5 h-5" />}
        title="Overall Progress"
        value={`${projectProgress}%`}
        color="blue"
        progress={projectProgress}
      />
      <StatCard
        icon={<Target className="w-5 h-5" />}
        title="Total Tasks"
        value={tasks.length.toString()}
        color="purple"
        badge={`${taskCounts.todo} todo · ${taskCounts.inProgress} in progress · ${taskCounts.done} done`}
      />
      <StatCard
        icon={<FolderTree className="w-5 h-5" />}
        title="Backlog Items"
        value={`${epicStats.totalEpics} Epics`}
        color="green"
        badge={`${epicStats.totalStories} Stories`}
      />
      <StatCard
        icon={<Users className="w-5 h-5" />}
        title="Team Members"
        value={(members?.length || 0).toString()}
        color="orange"
        avatars={members}
      />
    </div>
  );
};
