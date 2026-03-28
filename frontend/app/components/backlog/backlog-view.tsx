// components/backlog/backlog-view.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FolderOpen, 
  Plus, 
  Loader2, 
  ChevronRight, 
  Layers,
  Sparkles,
  FolderTree,
  BookOpen,
  RefreshCw
} from "lucide-react";
import { EpicItem } from "./epic-item";
import { CreateEpicDialog } from "./create-epic-dialog";
import { 
  getWorkspaceProjects,
  getWorkspaceProjectTasks,
  createEpic
} from "@/lib/fetch-util";

export function BacklogView() {
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get("workspaceId") || "";

  const [epics, setEpics] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingEpics, setIsLoadingEpics] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateEpic, setShowCreateEpic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref để theo dõi
  const fetchingProjectIdRef = useRef<string>("");
  const isMountedRef = useRef(true);

  // Cleanup khi unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset toàn bộ state
  const resetAllState = useCallback(() => {
    setEpics([]);
    setProjectMembers([]);
    setError(null);
    setIsLoadingEpics(false);
  }, []);

  // Lấy danh sách dự án
  useEffect(() => {
    if (!workspaceId) {
      resetAllState();
      setProjects([]);
      setSelectedProjectId("");
      return;
    }

    const fetchProjects = async () => {
      try {
        setIsLoadingProjects(true);
        setError(null);
        const data: any = await getWorkspaceProjects(workspaceId);
        
        if (!isMountedRef.current) return;
        
        const projectList = Array.isArray(data.projects) ? data.projects : [];
        setProjects(projectList);
        
        // Reset selected project khi không có dự án
        if (projectList.length === 0) {
          setSelectedProjectId("");
          resetAllState();
        } else if (projectList.length > 0 && !selectedProjectId) {
          // Chỉ tự chọn project đầu tiên nếu chưa có project được chọn
          setSelectedProjectId(projectList[0]._id);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách dự án:", error);
        if (isMountedRef.current) {
          setError("Không thể tải danh sách dự án");
          setProjects([]);
          setSelectedProjectId("");
          resetAllState();
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoadingProjects(false);
        }
      }
    };
    
    fetchProjects();
  }, [workspaceId, resetAllState]);

  // Lấy dữ liệu Backlog
  const fetchBacklogData = useCallback(async (projectId: string) => {
    // Không fetch nếu không có workspace hoặc project
    if (!workspaceId || !projectId) {
      resetAllState();
      return;
    }
    
    // Đánh dấu project đang fetch
    fetchingProjectIdRef.current = projectId;
    
    try {
      setIsLoadingEpics(true);
      setError(null);
      
      const data: any = await getWorkspaceProjectTasks(workspaceId, projectId);
      
      // Kiểm tra xem có phải vẫn đang fetch đúng project không
      if (fetchingProjectIdRef.current !== projectId) {
        console.log("Project changed, ignoring old data");
        return;
      }
      
      if (!isMountedRef.current) return;
      
      const { project, tasks } = data;

      // Kiểm tra project có tồn tại không
      if (!project) {
        setEpics([]);
        setProjectMembers([]);
        return;
      }

      // Lưu project members
      setProjectMembers(project.members || []);

      const formattedEpics = project?.epics?.map((epic: any) => ({
        ...epic,
        stories: epic.stories?.map((story: any) => ({
          ...story,
          tasks: tasks?.filter((t: any) => t.story?._id === story._id) || []
        })) || []
      })) || [];

      setEpics(formattedEpics);
    } catch (error) {
      console.error("Lỗi khi tải Backlog:", error);
      if (fetchingProjectIdRef.current === projectId && isMountedRef.current) {
        setError("Không thể tải dữ liệu backlog");
        setEpics([]);
        setProjectMembers([]);
      }
    } finally {
      if (fetchingProjectIdRef.current === projectId && isMountedRef.current) {
        setIsLoadingEpics(false);
      }
    }
  }, [workspaceId, resetAllState]);

  // Xử lý khi project thay đổi
  const handleProjectChange = useCallback((projectId: string) => {
    if (projectId === selectedProjectId) return;
    
    // Reset state ngay lập tức
    resetAllState();
    setSelectedProjectId(projectId);
    // Không cần gọi fetch ở đây, useEffect sẽ trigger
  }, [selectedProjectId, resetAllState]);

  // Effect để fetch data khi project thay đổi
  useEffect(() => {
    if (selectedProjectId && workspaceId) {
      fetchBacklogData(selectedProjectId);
    } else if (!selectedProjectId) {
      resetAllState();
    }
  }, [selectedProjectId, workspaceId, fetchBacklogData, resetAllState]);

  // Refresh dữ liệu
  const handleRefresh = useCallback(async () => {
    if (!selectedProjectId) return;
    setIsRefreshing(true);
    await fetchBacklogData(selectedProjectId);
    setIsRefreshing(false);
  }, [selectedProjectId, fetchBacklogData]);

  const handleCreateEpic = useCallback(async (epicData: any) => {
    if (!workspaceId || !selectedProjectId) return;
    
    try {
      setIsCreating(true);
      setError(null);
      await createEpic(workspaceId, selectedProjectId, epicData);
      await fetchBacklogData(selectedProjectId);
      setShowCreateEpic(false);
    } catch (error) {
      console.error("Lỗi tạo Epic:", error);
      setError("Không thể tạo epic");
    } finally {
      setIsCreating(false);
    }
  }, [workspaceId, selectedProjectId, fetchBacklogData]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Kiểm tra trạng thái hiển thị
  const showNoWorkspace = !workspaceId;
  const showNoProject = workspaceId && projects.length === 0 && !isLoadingProjects;
  const showProjectSelector = workspaceId && projects.length > 0;
  const isLoading = (isLoadingProjects && projects.length === 0) || (isLoadingEpics && epics.length === 0);
  const hasNoEpics = !isLoading && epics.length === 0 && selectedProjectId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <FolderTree className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Quản lý Backlog
                  </h1>
                  <p className="text-gray-500 mt-1 flex items-center gap-2">
                    <span className="inline-block w-1 h-1 bg-blue-400 rounded-full"></span>
                    Quản lý phân cấp Epic &gt; Story &gt; Task
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Refresh Button - chỉ hiển thị khi có project được chọn */}
              {selectedProjectId && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  disabled={isRefreshing || isLoadingEpics}
                  className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                </motion.button>
              )}

              {/* Project Selector - chỉ hiển thị khi có dự án */}
              {showProjectSelector && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                  <div className="flex items-center gap-3 px-3 py-1">
                    <BookOpen className="w-4 h-4 text-gray-400" />
                    <select
                      className="border-0 bg-transparent text-gray-700 text-sm font-medium focus:outline-none focus:ring-0 min-w-[220px] py-2 cursor-pointer hover:text-blue-600 transition-colors"
                      value={selectedProjectId}
                      onChange={(e) => handleProjectChange(e.target.value)}
                    >
                      {projects.map((proj) => (
                        <option key={proj._id} value={proj._id} className="text-gray-700">
                          {proj.title}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {showNoWorkspace ? (
            <motion.div
              key="no-workspace"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl mb-6"
              >
                <FolderOpen className="w-10 h-10 text-blue-400" />
              </motion.div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Không tìm thấy Workspace
              </h3>
              <p className="text-gray-500">
                Vui lòng chọn một workspace để xem backlog
              </p>
            </motion.div>
          ) : showNoProject ? (
            <motion.div
              key="no-project"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl mb-6"
              >
                <FolderOpen className="w-10 h-10 text-blue-400" />
              </motion.div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Không có dự án
              </h3>
              <p className="text-gray-500">
                Workspace này chưa có dự án nào. Hãy tạo dự án đầu tiên để bắt đầu.
              </p>
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-500 font-medium">Đang tải dữ liệu...</p>
            </motion.div>
          ) : hasNoEpics ? (
            <motion.div
              key="no-epics"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl mb-6"
              >
                <Layers className="w-10 h-10 text-purple-400" />
              </motion.div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Chưa có Epic nào
              </h3>
              <p className="text-gray-500 mb-6">
                Dự án này chưa có Epic. Hãy tạo Epic đầu tiên để bắt đầu quản lý công việc!
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateEpic(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Tạo Epic đầu tiên
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Header Actions */}
              <motion.div variants={itemVariants} className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCreateEpic(true)}
                  className="group relative bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Tạo Epic mới</span>
                    <Sparkles className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </motion.button>
              </motion.div>

              {/* Epics List */}
              <motion.div variants={containerVariants} className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-600">
                        {epics.length} {epics.length === 1 ? 'Epic' : 'Epics'}
                      </span>
                    </div>
                    <div className="h-4 w-px bg-gray-200" />
                    <div className="px-3 py-1 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">
                        Tổng số: {epics.reduce((total, epic) => total + (epic.stories?.length || 0), 0)} Story
                      </span>
                    </div>
                  </div>
                </div>
                
                <AnimatePresence>
                  {epics.map((epic, index) => (
                    <motion.div
                      key={epic._id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                      className="transition-all duration-200"
                    >
                      <EpicItem 
                        epic={epic} 
                        onRefresh={handleRefresh}
                        projectId={selectedProjectId}
                        workspaceId={workspaceId}
                        projectMembers={projectMembers}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Epic Dialog */}
        <CreateEpicDialog 
          open={showCreateEpic}
          onClose={() => setShowCreateEpic(false)}
          onSubmit={handleCreateEpic}
          isLoading={isCreating}
        />
      </div>
    </div>
  );
}