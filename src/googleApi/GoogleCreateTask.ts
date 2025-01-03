import { getGoogleAuthToken } from "./GoogleAuth";
import type GoogleTasks from "../GoogleTasksPlugin";
import type { Task } from "../helper/types";
import { createNotice } from "src/helper/NoticeHelper";

export async function CreateGoogleTask(
	plugin: GoogleTasks,
	task: Task
): Promise<Task | null> {
	const requestHeaders: HeadersInit = new Headers();
	requestHeaders.append(
		"Authorization",
		"Bearer " + (await getGoogleAuthToken(plugin))
	);
	requestHeaders.append("Content-Type", "application/json");

	try {
		const response = await fetch(
			`https://tasks.googleapis.com/tasks/v1/lists/${taskInput.taskListId}/tasks`,
			{
				method: "POST",
				headers: requestHeaders,
				body: JSON.stringify(task),
			}
		);

		if (!response.ok)
			throw (await response.json())?.error ?? response.status;

		if (response.status == 200) {
			createNotice(plugin, "New task created");
			return await response.json();
		} else return null;
	} catch (error) {
		console.error(error);
		return null;
	}
}
