import { createNotice } from "src/helper/NoticeHelper";
import type { Task, TaskForUpload } from "src/helper/types";
import { getGoogleAuthToken } from "./GoogleAuth";
import type GoogleTasks from "src/GoogleTasksPlugin";

export async function createTask(
	plugin: GoogleTasks,
	task: TaskForUpload,
	listId: string,
	showNotice: boolean
): Promise<Task | null> {
	const requestHeaders: HeadersInit = new Headers();
	requestHeaders.append(
		"Authorization",
		"Bearer " + (await getGoogleAuthToken(plugin))
	);
	requestHeaders.append("Content-Type", "application/json");

	try {
		const response = await fetch(
			`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`,
			{
				method: "POST",
				headers: requestHeaders,
				body: JSON.stringify(task),
			}
		);

		if (!response.ok)
			throw (await response.json())?.error ?? response.status;

		if (response.status == 200) {
			if (showNotice) createNotice(plugin, "Task created");
			return await response.json();
		} else {
			if (showNotice) createNotice(plugin, "Failed to create task");
			return null;
		}
	} catch (error) {
		console.error(error);
		if (showNotice) createNotice(plugin, "Error creating task");
		return null;
	}
}

export async function deleteTask(
	plugin: GoogleTasks,
	task: TaskForUpload,
	listId: string,
	showNotice: boolean
): Promise<boolean> {
	const requestHeaders: HeadersInit = new Headers();
	requestHeaders.append(
		"Authorization",
		"Bearer " + (await getGoogleAuthToken(plugin))
	);
	requestHeaders.append("Content-Type", "application/json");

	try {
		const response = await fetch(
			`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${task.id}`,
			{
				method: "DELETE",
				headers: requestHeaders,
			}
		);

		if (!response.ok)
			throw (await response.json())?.error ?? response.status;

		if (response.status == 204) {
			if (showNotice) createNotice(plugin, "Task deleted");
			return true;
		} else {
			if (showNotice) createNotice(plugin, "Failed to delete task");
			return false;
		}
	} catch (error) {
		console.error(error);
		if (showNotice) createNotice(plugin, "Error deleting task");
		return false;
	}
}

export async function updateTask(
	plugin: GoogleTasks,
	task: TaskForUpload,
	listId: string,
	showNotice: boolean
): Promise<Task | null> {
	const requestHeaders: HeadersInit = new Headers();
	requestHeaders.append(
		"Authorization",
		"Bearer " + (await getGoogleAuthToken(plugin))
	);
	requestHeaders.append("Content-Type", "application/json");

	try {
		const response = await fetch(
			`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${task.id}`,
			{
				method: "PATCH",
				headers: requestHeaders,
				body: JSON.stringify(task),
			}
		);

		if (!response.ok)
			throw (await response.json())?.error ?? response.status;

		if (response.status == 200) {
			if (showNotice) createNotice(plugin, "Task updated");
			return await response.json();
		} else {
			if (showNotice) createNotice(plugin, "Failed to update task");
			return null;
		}
	} catch (error) {
		console.error(error);
		if (showNotice) createNotice(plugin, "Error updating task");
		return null;
	}
}

export async function moveTask(
	plugin: GoogleTasks,
	task: TaskForUpload,
	listId: string,
	showNotice: boolean
): Promise<Task | null> {
	const requestHeaders: HeadersInit = new Headers();
	requestHeaders.append(
		"Authorization",
		"Bearer " + (await getGoogleAuthToken(plugin))
	);
	requestHeaders.append("Content-Type", "application/json");

	try {
		const query = new URLSearchParams();
		if (task.parent) query.append("parent", task.parent);
		if (task.previous) query.append("previous", task.previous);

		const response = await fetch(
			`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${
				task.id
			}/move?${query.toString()}`,
			{
				method: "POST",
				headers: requestHeaders,
			}
		);

		if (!response.ok)
			throw (await response.json())?.error ?? response.status;

		if (response.status == 200) {
			if (showNotice) createNotice(plugin, "Task moved");
			return await response.json();
		} else {
			if (showNotice) createNotice(plugin, "Failed to move task");
			return null;
		}
	} catch (error) {
		console.error(error);
		if (showNotice) createNotice(plugin, "Error moving task");
		return null;
	}
}
