import type GoogleTasksPlugin from "src/GoogleTasksPlugin";

import { createNotice } from "src/helper/NoticeHelper";
import type { Task } from "src/helper/types";

import { getGoogleAuthToken } from "./GoogleAuth";

export async function UpdateGoogleTask(
	plugin: GoogleTasksPlugin,
	task: Task
): Promise<boolean> {
	const requestHeaders: HeadersInit = new Headers();
	requestHeaders.append(
		"Authorization",
		"Bearer " + (await getGoogleAuthToken(plugin))
	);
	requestHeaders.append("Content-Type", "application/json");

	try {
		const response = await fetch(`${task.selfLink}`, {
			method: "PATCH",
			headers: requestHeaders,
			body: JSON.stringify(task),
		});

		if (response.status == 200) {
			createNotice(plugin, "Task updated");
			await response.json();
		}
	} catch (error) {
		console.log(error);
		createNotice(plugin, "Could not update task");
		return false;
	}

	return true;
}
