import { TFile } from "obsidian";
import GoogleTasks from "../GoogleTasksPlugin";
import type {
	GoogleTasksSettings,
	LocalTask,
	LocalTaskList,
} from "../helper/types";

const LIST_MATCHER = /# [a-z, A-Z]+ \^([a-z,A-Z,0-9]+)/g;

export async function FullScan(
	plugin: GoogleTasks
): Promise<GoogleTasksSettings["synchronized_files"]> {
	const files = plugin.app.vault.getFiles();

	const entries = await Promise.all(
		files.map(async (file) => ScanFile(plugin, file))
	);

	const map: GoogleTasksSettings["synchronized_files"] = new Map();
	for (const entry of entries) {
		if (entry.lists.length > 0)
			map.set(entry.path, { lists: entry.lists, udpated_at: 0 });
	}
	return map;
}

export async function ScanFile(
	plugin: GoogleTasks,
	file: TFile
): Promise<{ path: string; lists: Array<string> }> {
	const content = await plugin.app.vault.read(file);
	console.log("Scanning file: ", file.path);

	const matches = [...content.matchAll(LIST_MATCHER)].map((item) => item[1]); // select the first capturing group for each

	console.log("Found matches: ", matches);

	return {
		path: file.path,
		lists: matches,
	};
}

export async function extractListFromFile(
	plugin: GoogleTasks,
	file_path: string,
	listId: string
): Promise<(LocalTaskList & { tasks: LocalTask[] }) | null> {
	return { id: "", title: "", tasks: [] };
}

export async function dumpListToFile(
	plugin: GoogleTasks,
	file_path: string,
	list: LocalTaskList & {
		tasks: LocalTask[];
		conflicts: Omit<LocalTask, "id">[];
	}
) {}
