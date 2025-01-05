import { getGoogleAuthToken } from "./GoogleAuth";
import type GoogleTasks from "../GoogleTasksPlugin";
import type {
	Task,
	TaskList,
	TaskListForUpload,
	TaskListResponse,
} from "../helper/types";
import { createNotice } from "../helper/NoticeHelper";

/**
 * Get all tasklists from account
 */
export async function getTaskList(
	plugin: GoogleTasks,
	listId: string
): Promise<TaskList | null> {
	const requestHeaders: HeadersInit = new Headers();
	requestHeaders.append(
		"Authorization",
		"Bearer " + (await getGoogleAuthToken(plugin))
	);
	requestHeaders.append("Content-Type", "application/json");

	try {
		const response = await fetch(
			`https://tasks.googleapis.com/tasks/v1/users/@me/lists/${listId}`,
			{
				method: "GET",
				headers: requestHeaders,
				redirect: "follow",
			}
		);

		if (!response.ok)
			throw (await response.json())?.error ?? response.status;

		return (await response.json()) as TaskList;
	} catch (error) {
		console.error(error);
		return null;
	}
}

/**
 * Get all tasklists from account
 */
export async function getAllTaskLists(
	plugin: GoogleTasks
): Promise<TaskList[]> {
	const requestHeaders: HeadersInit = new Headers();
	requestHeaders.append(
		"Authorization",
		"Bearer " + (await getGoogleAuthToken(plugin))
	);
	requestHeaders.append("Content-Type", "application/json");

	try {
		const response = await fetch(
			`https://tasks.googleapis.com/tasks/v1/users/@me/lists`,
			{
				method: "GET",
				headers: requestHeaders,
				redirect: "follow",
			}
		);

		if (!response.ok)
			throw (await response.json())?.error ?? response.status;

		const allTaskListsData: TaskListResponse = await response.json();
		return allTaskListsData.items;
	} catch (error) {
		console.error(error);
		return [];
	}
}

export async function updateTaskList(
	plugin: GoogleTasks,
	taskList: TaskListForUpload,
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
			`https://tasks.googleapis.com/tasks/v1/users/@me/lists/${taskList.id}`,
			{
				method: "PATCH",
				headers: requestHeaders,
				body: JSON.stringify(taskList),
			}
		);

		if (response.status == 200) {
			if (showNotice) createNotice(plugin, "Task list updated");
			return await response.json();
		} else {
			if (showNotice) createNotice(plugin, "Failed to update task list");
			return null;
		}
	} catch (error) {
		console.log(error);
		if (showNotice) createNotice(plugin, "Could not update task list");
		return null;
	}
}
