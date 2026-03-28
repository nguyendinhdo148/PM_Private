import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useGetMyTasksQuery } from "@/hooks/use-task";
import type { Task } from "@/types";
import {
  ArrowDown,
  Filter,
  Loader,
  Search,
  Table,
  TextAlignJustify,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Tabs, TabsContent, TabsTrigger, TabsList } from "@/components/ui/tab";
import { TaskListView } from "./components/tasks/TaskListView";
import { TaskBoardView } from "./components/tasks/TaskBoardView";

const MyTasks = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialFilter = searchParams.get("filter") || "all";
  const initialSort = searchParams.get("sort") || "desc";
  const initialSearch = searchParams.get("search") || "";

  const [filter, setFilter] = React.useState(initialFilter);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    initialSort === "asc" ? "asc" : "desc",
  );
  const [search, setSearch] = useState<string>(initialSearch);

  useEffect(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    params.filter = filter;
    params.sort = sortDirection;
    params.search = search;
    setSearchParams(params, { replace: true });
  }, [filter, sortDirection, search]);

  useEffect(() => {
    const urlFilter = searchParams.get("filter") || "all";
    const urlSort = searchParams.get("sort") || "desc";
    const urlSearch = searchParams.get("search") || "";

    if (urlFilter !== filter) setFilter(urlFilter);
    if (urlSort !== sortDirection)
      setSortDirection(urlSort === "asc" ? "asc" : "desc");
    if (urlSearch !== search) setSearch(urlSearch);
  }, [searchParams]);

  const { data: myTasks, isLoading } = useGetMyTasksQuery() as {
    data: Task[];
    isLoading: boolean;
  };

  const getTaskDetailPath = (task: Task) => {
    const workspaceId =
      typeof task.project.workspace === "string"
        ? task.project.workspace
        : task.project.workspace?._id;
    return `/workspaces/${workspaceId}/projects/${task.project._id}/tasks/${task._id}`;
  };

  const filteredTasks =
    myTasks?.length > 0
      ? myTasks
          .filter((task) => {
            if (filter === "all") return true;
            if (filter === "todo") return task.status === "To Do";
            if (filter === "inprogress") return task.status === "In Progress";
            if (filter === "done") return task.status === "Done";
            if (filter === "achieved") return task.isArchived === true;
            if (filter === "high") return task.priority === "High";
            return true;
          })
          .filter(
            (task) =>
              task.title.toLowerCase().includes(search.toLowerCase()) ||
              task.description?.toLowerCase().includes(search.toLowerCase()),
          )
      : [];

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      return sortDirection === "asc"
        ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        : new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    }
    return 0;
  });

  const todoTasks = sortedTasks.filter((task) => task.status === "To Do");
  const inProgressTasks = sortedTasks.filter(
    (task) => task.status === "In Progress",
  );
  const doneTasks = sortedTasks.filter((task) => task.status === "Done");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold text-foreground">My Tasks</h1>
          <p className="text-muted-foreground text-sm">
            {sortedTasks.length} {sortedTasks.length === 1 ? "task" : "tasks"}{" "}
            assigned to you
          </p>
        </div>

        {/* Controls Section */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card border border-border"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setSortDirection(sortDirection === "asc" ? "desc" : "asc")
              }
              className="gap-2"
            >
              <ArrowDown className="w-4 h-4" />
              {sortDirection === "asc" ? "Oldest First" : "Newest First"}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter Tasks</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setFilter("all")}
                  className="cursor-pointer"
                >
                  All Tasks
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("todo")}
                  className="cursor-pointer"
                >
                  To Do
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("inprogress")}
                  className="cursor-pointer"
                >
                  In Progress
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("done")}
                  className="cursor-pointer"
                >
                  Done
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("achieved")}
                  className="cursor-pointer"
                >
                  Archived
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("high")}
                  className="cursor-pointer"
                >
                  High Priority
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full md:w-80 grid-cols-2 bg-muted p-1">
          <TabsTrigger value="list" className="gap-1.5">
            <TextAlignJustify className="size-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-1.5">
            <Table className="size-4" />
            Board View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-6">
          <TaskListView
            tasks={sortedTasks}
            onTaskClick={(taskId) => {
              const task = sortedTasks.find((t) => t._id === taskId);
              if (task) {
                window.location.href = getTaskDetailPath(task);
              }
            }}
            onCreateTask={() => {
              console.log("Create task");
            }}
          />
        </TabsContent>

        <TabsContent value="board" className="mt-6">
          <TaskBoardView
            tasks={sortedTasks}
            onTaskClick={(taskId) => {
              const task = sortedTasks.find((t) => t._id === taskId);
              if (task) {
                window.location.href = getTaskDetailPath(task);
              }
            }}
            onStatusChange={(taskId, newStatus) => {
              console.log("Update status", taskId, newStatus);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyTasks;
