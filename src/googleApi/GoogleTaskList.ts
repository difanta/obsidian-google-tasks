import { getGoogleAuthToken } from "./GoogleAuth";
import type GoogleTasks from "../GoogleTasksPlugin";
import type {
	Task,
	TaskList,
	TaskListResponse,
	TaskResponse,
} from "../helper/types";

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

/**
 * Return all tasks from a tasklist
 */
export async function getAllTasksFromList(
	plugin: GoogleTasks,
	taskListId: string,
	startDate: moment.Moment = null,
	endDate: moment.Moment = null
): Promise<Task[]> {
	try {
		let resultTaskList: Task[] = [];
		let allTasksData: TaskResponse = undefined;

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

			if (allTasksData != undefined) {
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

			if (allTasksData.items && allTasksData.items.length)
				resultTaskList.concat(allTasksData.items);
		} while (allTasksData.nextPageToken);

		resultTaskList.forEach((task: Task) => {
			task.children = resultTaskList.filter(
				(foundTask: Task) => foundTask.parent == task.id
			);
			if (task.children.length) {
				task.children.sort(
					(a: Task, b: Task) =>
						parseInt(a.position) - parseInt(b.position)
				);
			}
		});

		resultTaskList = resultTaskList.filter((tasks) => !tasks.parent);
		return resultTaskList;
	} catch (error) {
		console.error(error);
		return [];
	}
}
