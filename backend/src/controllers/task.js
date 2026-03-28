import { Project } from "../models/project.js";
import { Task } from "../models/task.js";
import { ActivityLog } from "../models/activity.js";
import { Comment } from "../models/comment.js";
import { recordActivity } from "../libs/index.js";

const createTask = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // check user có trong project không
    const currentMember = project.members.find(
      (member) => member.user.toString() === req.user._id.toString(),
    );

    if (!currentMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    // chặn viewer
    if (currentMember.role === "viewer") {
      return res.status(403).json({
        message: "You do not have permission to create task",
      });
    }

    // tạo task
    const task = await Task.create({
      ...req.body,
      project: projectId,
      createdBy: req.user._id,
    });

    // add vào project
    project.tasks.push(task._id);
    await project.save();

    return res.status(201).json(task);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate("assignees", "name profilePicture")
      .populate("watchers", "name profilePicture")
      .populate({
        path: "story",
        populate: {
          path: "epic",
        },
      });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findById(task.project).populate(
      "members.user",
      "name profilePicture",
    );

    res.status(200).json({ task, project });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateTaskTitle = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember = project.members.some(
      (member) => member.user.toString() === req.user._id.toString(),
    );
    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const oldTitle = task.title;

    task.title = title;
    await task.save();

    //record activity
    await recordActivity(req.user._id, "updated_task", "Task", task._id, {
      description: `Updated task title from "${oldTitle}" to "${title}"`,
    });

    res.status(200).json(task);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateTaskDescription = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { description } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember = project.members.some(
      (member) => member.user.toString() === req.user._id.toString(),
    );
    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const oldDescription =
      (task.description || "").substring(0, 50) +
      ((task.description || "").length > 50 ? "..." : "");

    task.description = description;
    await task.save();

    const newDescription =
      (description || "").substring(0, 50) +
      ((description || "").length > 50 ? "..." : "");

    //record activity
    await recordActivity(req.user._id, "updated_task", "Task", task._id, {
      description: `Updated task description from "${oldDescription}" to "${newDescription}"`,
    });

    res.status(200).json(task);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember = project.members.some(
      (member) => member.user.toString() === req.user._id.toString(),
    );
    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const oldStatus = task.status;

    task.status = status;
    await task.save();

    //record activity
    await recordActivity(req.user._id, "updated_task", "Task", task._id, {
      description: `Updated task status from "${oldStatus}" to "${status}"`,
    });

    res.status(200).json(task);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateTaskAssignees = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { assignees } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember = project.members.some(
      (member) => member.user.toString() === req.user._id.toString(),
    );
    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const oldAssignees = task.assignees;

    task.assignees = assignees;
    await task.save();

    //record activity
    await recordActivity(req.user._id, "updated_task", "Task", task._id, {
      description: `Updated task assignees from "${oldAssignees.length}" to "${assignees}"`,
    });

    res.status(200).json(task);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateTaskPriority = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { priority } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember = project.members.some(
      (member) => member.user.toString() === req.user._id.toString(),
    );
    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const oldPriority = task.priority;

    task.priority = priority;
    await task.save();

    //record activity
    await recordActivity(req.user._id, "updated_task", "Task", task._id, {
      description: `Updated task priority from "${oldPriority}" to "${priority}"`,
    });

    res.status(200).json(task);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember = project.members.some(
      (member) => member.user.toString() === req.user._id.toString(),
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    project.tasks = project.tasks.filter(
      (projectTaskId) => projectTaskId.toString() !== task._id.toString(),
    );
    await project.save();

    await Comment.deleteMany({ task: task._id });
    await ActivityLog.deleteMany({ resourceId: task._id });
    await Task.findByIdAndDelete(task._id);

    return res.status(200).json({
      message: "Task deleted successfully",
      taskId: task._id,
      projectId: project._id,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const addSubTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findById(task.project);
    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember = project.members.some(
      (member) => member.user.toString() === req.user._id.toString(),
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const newSubTask = {
      title,
      completed: false,
    };

    task.subtasks.push(newSubTask);
    await task.save();

    //record activity
    await recordActivity(req.user._id, "created_subtask", "Task", task._id, {
      description: `created sub-task "${title}"`,
    });

    res.status(201).json(task);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateSubTask = async (req, res) => {
  try {
    const { taskId, subTaskId } = req.params;
    const { completed } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const subTask = task.subtasks.find(
      (subTask) => subTask._id.toString() === subTaskId,
    );
    if (!subTask) {
      return res.status(404).json({
        message: "Sub-task not found",
      });
    }

    subTask.completed = completed;

    await task.save();

    //record activity
    await recordActivity(req.user._id, "updated_subtask", "Task", task._id, {
      description: `Updated sub-task "${subTask.title}"`,
    });
    res.status(200).json(task);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getActivityByResourceId = async (req, res) => {
  try {
    const { resourceId } = req.params;

    const activity = await ActivityLog.find({ resourceId })
      .populate("user", "name profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json(activity);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const addComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { text } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember = project.members.some(
      (member) => member.user.toString() === req.user._id.toString(),
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const newComment = await Comment.create({
      text,
      task: taskId,
      author: req.user._id,
    });

    task.comments.push(newComment._id);
    await task.save();

    //record activity
    await recordActivity(req.user._id, "added_comment", "Task", task._id, {
      description: `Added comment "${text.substring(
        0,
        50,
      )}${text.length > 50 ? "..." : ""}"`,
    });

    res.status(201).json(newComment);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getCommentsByTaskId = async (req, res) => {
  try {
    const { taskId } = req.params;

    const comments = await Comment.find({ task: taskId })
      .populate("author", "name profilePicture")
      .sort({ createdAt: -1 });

    if (!comments) {
      return res.status(404).json({
        message: "Comments not found",
      });
    }

    res.status(200).json(comments);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const watchTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember = project.members.some(
      (member) => member.user.toString() === req.user._id.toString(),
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const isWatching = task.watchers.includes(req.user._id);

    if (!isWatching) {
      task.watchers.push(req.user._id);
    } else {
      task.watchers = task.watchers.filter(
        (watcher) => watcher.toString() !== req.user._id.toString(),
      );
    }

    await task.save();

    await recordActivity(req.user._id, "updated_task", "Task", task._id, {
      description: `${isWatching ? "stopped watching" : "started watching"} task "${task.title}"`,
    });

    res.status(200).json(task);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const achievedTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }
    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember = project.members.some(
      (member) => member.user.toString() === req.user._id.toString(),
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const isAchieved = task.isArchived;

    task.isArchived = !isAchieved;

    await task.save();

    await recordActivity(req.user._id, "updated_task", "Task", task._id, {
      description: `${isAchieved ? "unachieved" : "achieved"} task "${task.title}"`,
    });

    res.status(200).json(task);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getMyTasks = async (req, res) => {
  try {
    const userId = req.user._id;

    const tasks = await Task.find({ assignees: { $in: [req.user._id] } })
      .populate("project", "title workspace")
      .sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export {
  createTask,
  getTaskById,
  updateTaskTitle,
  updateTaskDescription,
  updateTaskStatus,
  updateTaskAssignees,
  updateTaskPriority,
  addSubTask,
  updateSubTask,
  getActivityByResourceId,
  addComment,
  getCommentsByTaskId,
  watchTask,
  achievedTask,
  deleteTask,
  getMyTasks,
};
