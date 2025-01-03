import { getGoogleAuthToken } from "./GoogleAuth";
import type GoogleTasks from "../GoogleTasksPlugin";
import type { Task } from "../helper/types";

export async function getOneTaskById(
	plugin: GoogleTasks,
	listId: string,
	taskId: string
): Promise<Task | null> {
	const requestHeaders: HeadersInit = new Headers();
	requestHeaders.append(
		"Authorization",
		"Bearer " + (await getGoogleAuthToken(plugin))
	);
	requestHeaders.append("Content-Type", "application/json");

	try {
		const response = await fetch(
			`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`,
			{
				method: "GET",
				headers: requestHeaders,
			}
		);
		if (!response.ok)
			throw (await response.json())?.error ?? response.status;

		const task: Task = await response.json();
		return task;
	} catch (error) {
		console.error(error);
		return null;
	}
}
