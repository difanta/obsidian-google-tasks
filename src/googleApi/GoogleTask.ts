import { getGoogleAuthToken } from "./GoogleAuth";
import type GoogleTasks from "../GoogleTasksPlugin";
import type { Task, TaskResponse } from "../helper/types";

/*export async function getOneTaskById(
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
}*/

/**
 * Return all tasks from a tasklist
 */
export async function getAllTasksFromList(
	plugin: GoogleTasks,
	taskListId: string,
	startDate: moment.Moment | null = null,
	endDate: moment.Moment | null = null
): Promise<Task[] | null> {
	try {
		let resultTaskList: Task[] = [];
		let allTasksData: TaskResponse | undefined = undefined;

		do {
			let url = `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?`;
			url += "maxResults=100";
			url += "&showCompleted=true";
			url += "&showDeleted=false";

			if (startDate && startDate.isValid()) {
				url += `&dueMin=${startDate
					.local()
					.startOf("day")
					.toISOString()}`;
			}

			if (
				endDate &&
				endDate.isValid() &&
				endDate.endOf("day").isAfter(startDate, "hour")
			) {
				url += `&dueMax=${endDate
					.add(1, "day")
					.local()
					.endOf("day")
					.toISOString()}`;
			}

			if (plugin.showHidden) {
				url += "&showHidden=true";
			}

			if (allTasksData) {
				url += `&pageToken=${allTasksData.nextPageToken}`;
			}

			const requestHeaders: HeadersInit = new Headers();
			requestHeaders.append(
				"Authorization",
				"Bearer " + (await getGoogleAuthToken(plugin))
			);
			requestHeaders.append("Content-Type", "application/json");

			const response = await fetch(url, {
				method: "GET",
				headers: requestHeaders,
			});

			if (!response.ok)
				throw (await response.json())?.error ?? response.status;

			allTasksData = await response.json();

			if (allTasksData && allTasksData.items && allTasksData.items.length)
				resultTaskList.concat(allTasksData.items);
		} while (allTasksData && allTasksData.nextPageToken);

		// find children of every task and order them
		resultTaskList.forEach((task) => {
			task.children = resultTaskList.filter(
				(foundTask: Task) => foundTask.parent == task.id
			);
			task.children.sort(
				(a: Task, b: Task) =>
					parseInt(a.position) - parseInt(b.position)
			);
			for (let i = 0; i < task.children.length; i++) {
				task.children[i].previous =
					i > 0 ? task.children[i - 1].id : null;
			}
		});

		resultTaskList = resultTaskList.filter((tasks) => !tasks.parent);

		return resultTaskList;
	} catch (error) {
		console.error(error);
		return null;
	}
}
