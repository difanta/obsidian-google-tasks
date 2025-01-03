import type { LocalTask } from "src/helper/types";

export const taskToList = (task: LocalTask): string => {
	const date = task.date_time
		? window.moment(task.date_time).format("YYYY-MM-DD")
		: null;
	const time = task.date_time
		? window.moment(task.date_time).format("HH:mm:ssZ")
		: null;
	return `- [${task.completed ? "x" : " "}] ${task.title} ${
		date ? `@${date}` : ""
	} ${time ? `@@${time}` : ""} ^${task.id}\n`;
};
