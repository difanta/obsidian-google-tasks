import {
	LocalTask,
	LocalTaskList,
	Task,
	TaskForUpload,
	TaskList,
	TaskListForUpload,
} from "./types";

export function LocalTaskListToGDrive(
	local_taskList: LocalTaskList
): TaskListForUpload {
	return {
		kind: "tasks#taskList",
		id: local_taskList.id,
		title: local_taskList.title,
	};
}

export function GDriveTaskListToLocal(
	gdrive_taskList: TaskList
): LocalTaskList {
	return {
		id: gdrive_taskList.id,
		title: gdrive_taskList.title,
	};
}

export function LocalTaskToGDrive(local_task: LocalTask): TaskForUpload {
	local_task.children.forEach((child) => {
		if (child.parent != local_task.id)
			throw new Error(
				`Mismatched parent-child relation in parent ${local_task.id} and child ${child.id} with parent ${child.parent}`
			);
	});
	return {
		kind: "tasks#task",
		id: local_task.id,
		title: local_task.title,
		notes: local_task.description ?? undefined,
		status: local_task.completed ? "completed" : "needsAction",
		due: local_task.date_time
			? window
					.moment(local_task.date_time.toISOString())
					.format("YYYY-MM-DDTHH:mm:ssZ")
			: undefined,
		links: [],
		parent: local_task.parent,
		previous: local_task.previous,
		children: local_task.children.map(LocalTaskToGDrive),
	};
}

export function GDriveTaskToLocal(gdrive_task: Task): LocalTask {
	return {
		id: gdrive_task.id,
		title: gdrive_task.title,
		description: gdrive_task.notes,
		completed: gdrive_task.status === "completed",
		position: gdrive_task.position,
		parent: gdrive_task.parent,
		previous: gdrive_task.previous,
		date_time: gdrive_task.due ? new Date(gdrive_task.due) : undefined, // TODO maybe add 12 hours
		children: gdrive_task.children?.map(GDriveTaskToLocal) ?? [],
	};
}
