import type GoogleTasksPlugin from "../GoogleTasksPlugin";
import type { Task } from "../helper/types";
import { getGoogleAuthToken } from "./GoogleAuth";
import { getOneTaskById } from "./GoogleTask";
import { createNotice } from "src/helper/NoticeHelper";

//=======================================
//Complete the tasks
//=======================================

export async function GoogleCompleteTask(
	plugin: GoogleTasksPlugin,
	task: Task
): Promise<boolean> {
	task.children?.forEach((subTask) => GoogleCompleteTask(plugin, subTask));

	const requestHeaders: HeadersInit = new Headers();
	requestHeaders.append(
		"Authorization",
		"Bearer " + (await getGoogleAuthToken(plugin))
	);
	requestHeaders.append("Content-Type", "application/json");

	task.status = "completed";
	task.completed = new Date().toISOString();

	try {
		const response = await fetch(task.selfLink, {
			method: "PUT",
			headers: requestHeaders,
			body: JSON.stringify(task),
		});
		if (!response.ok)
			throw (await response.json())?.error ?? response.status;
		await response.json();
	} catch (error) {
		createNotice(plugin, "Could not complete task");
		return false;
	}

	task.children?.forEach((subTask) => GoogleCompleteTask(plugin, subTask));

	return true;
}

export async function GoogleCompleteTaskById(
	plugin: GoogleTasksPlugin,
	taskId: string,
	listId: string
): Promise<boolean> {
	const task = await getOneTaskById(plugin, listId, taskId);
	return await GoogleCompleteTask(plugin, task);
}

//=======================================
//Uncomplete the tasks
//=======================================

export async function GoogleUnCompleteTask(
	plugin: GoogleTasksPlugin,
	task: Task
): Promise<boolean> {
	const requestHeaders: HeadersInit = new Headers();
	requestHeaders.append(
		"Authorization",
		"Bearer " + (await getGoogleAuthToken(plugin))
	);
	requestHeaders.append("Content-Type", "application/json");

	task.status = "needsAction";

	try {
		const response = await fetch(task.selfLink, {
			method: "PUT",
			headers: requestHeaders,
			body: JSON.stringify(task),
		});
		if (!response.ok)
			throw (await response.json())?.error ?? response.status;
		await response.json();
	} catch (error) {
		createNotice(plugin, "Could not complete task");
		return false;
	}

	task.children?.forEach((subTask) => GoogleUnCompleteTask(plugin, subTask));

	return true;
}

export async function GoogleUnCompleteTaskById(
	plugin: GoogleTasksPlugin,
	listId: string,
	taskId: string
): Promise<boolean> {
	const task = await getOneTaskById(plugin, listId, taskId);
	return await GoogleUnCompleteTask(plugin, task);
}
