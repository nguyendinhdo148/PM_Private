import type { Project } from "@/types";
import { Button } from "../ui/button";
import { NoDataFound } from "../no-data-found";
import { ProjectCard } from "../project/project-card";
import { getProjectProgress } from "@/lib";

interface ProjectListProps {
  workspaceId: string;
  projects: Project[];

  onCreateProject: () => void;
}

export const ProjectList = ({
  workspaceId,
  projects,
  onCreateProject,
}: ProjectListProps) => {
  return (
    <div className="">
      <h3 className="text-xl font-medium mb-4">Projects</h3>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <NoDataFound
            title="No projects found"
            description="Create a project to get started"
            buttonText="Create Project"
            buttonAction={onCreateProject}
          />
        ) : (
          projects.map((project) => {
            const progress = getProjectProgress(project.tasks);

            return (
              <ProjectCard
                key={project._id}
                project={project}
                progress={progress}
                workspaceId={workspaceId}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
export default ProjectList;
