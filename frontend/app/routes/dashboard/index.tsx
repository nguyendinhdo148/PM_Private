import { useGetWorkspaceStatsQuery } from "@/hooks/use-Workspace";
import { useSearchParams } from "react-router";
import React from "react";
import type {
  Project,
  Task,
  TaskPriorityData,
  WorkspaceProductivityData,
  ProjectStatusData,
  TaskTrendsData,
  StatsCardProps,
} from "@/types";
import { Loader } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stat-card";
import { StatisticsCharts } from "@/components/dashboard/statistics-chart";
import { RecentProjects } from "@/components/dashboard/recent-project";
import { UpcomingTasks } from "@/components/dashboard/upcoming-task";

type StatisticsChartsProps = {
  stat: StatsCardProps;
  taskTrendsData: TaskTrendsData[];
  projectStatusData: ProjectStatusData[];
  taskPriorityData: TaskPriorityData[];
  workspaceProductivityData: WorkspaceProductivityData[];
};

const TypedStatisticsCharts =
  StatisticsCharts as React.ComponentType<StatisticsChartsProps>;

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const { data, isPending } = useGetWorkspaceStatsQuery(workspaceId || "") as {
    data?: {
      stats: StatsCardProps;
      taskTrendsData: TaskTrendsData[];
      projectStatusData: ProjectStatusData[];
      taskPriorityData: TaskPriorityData[];
      workspaceProductivityData: WorkspaceProductivityData[];
      upcomingTasks: Task[];
      recentProjects: Project[];
    };
    isPending: boolean;
  };

  if (!workspaceId) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Please select or create a workspace to view the control panel.
      </div>
    );
  }

  if (isPending) {
    return (
      <div>
        <Loader />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Không có dữ liệu cho workspace này.
      </div>
    );
  }

  return (
    <div className="space-y-8 2x1:space-y-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>
      <StatsCard data={data.stats} />
      <TypedStatisticsCharts
        stat={data.stats}
        taskTrendsData={data.taskTrendsData}
        projectStatusData={data.projectStatusData}
        taskPriorityData={data.taskPriorityData}
        workspaceProductivityData={data.workspaceProductivityData}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentProjects data={data.recentProjects} />
        <UpcomingTasks data={data.upcomingTasks} />
      </div>
    </div>
  );
};

export default Dashboard;
