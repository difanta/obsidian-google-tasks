import { createNotice } from "./NoticeHelper";
import GoogleTasks from "../GoogleTasksPlugin";
import { getAllTasksFromList, getTaskList } from "../googleApi/GoogleTaskList";
import { dumpListToFile, extractListFromFile } from "./FileScanner";
import {
	GDriveTaskListToLocal,
	GDriveTaskToLocal,
	LocalTaskListToGDrive,
	LocalTaskToGDrive,
} from "./TaskConverter";
import {
	LocalTask,
	LocalTaskList,
	Task,
	TaskForUpload,
	TaskList,
	TaskListForUpload,
} from "./types";

export async function SynchronizeAllFiles(plugin: GoogleTasks) {
	await Promise.all(
		[...plugin.settings.synchronized_files.keys()].map(async (file_path) =>
			SynchronizeFile(plugin, file_path)
		)
	);
}

export async function SynchronizeFile(plugin: GoogleTasks, file_path: string) {
	try {
		const file = plugin.settings.synchronized_files.get(file_path);
		const last_sync = file?.udpated_at;
		const fs_mod_time =
			plugin.app.vault.getFileByPath(file_path)?.stat.mtime;

		if (!file || !fs_mod_time) {
			console.error(`File ${file_path} not found`);
			createNotice(plugin, `File ${file_path} not found`);
			return;
		}

		// pull all tasks from GDrive and local
		let any_undefined = false;
		let task_lists = await Promise.all(
			file.lists.map(async (list, index) => {
				const g_task_list = await getTaskList(plugin, list);
				const g_tasks = await getAllTasksFromList(plugin, list);
				const local_task_list = await extractListFromFile(
					plugin,
					file_path,
					list
				);

				// set to undefined any task list that does not exist in both gdrive and local
				if (!g_task_list || !local_task_list) {
					any_undefined = true;
					file.lists[index] = undefined;
					return undefined;
				} else
					return {
						google_task_list: { ...g_task_list, tasks: g_tasks },
						local_task_list,
					};
			})
		);

		// remove any undefined entries both from the array to be synchronized and to the settings
		if (any_undefined) {
			plugin.settings.synchronized_files.set(file_path, {
				lists: file.lists.filter((list) => list !== undefined),
				udpated_at: file.udpated_at,
			});
			await plugin.saveSettings();
			task_lists = task_lists.filter(
				(task_list) => task_list !== undefined
			);
		}

		// Synchronize all lists in this file
		await Promise.all(
			task_lists.map(async (task_list) => {
				console.log("Google task list", task_list.google_task_list);
				console.log(
					"Converted task list",
					GDriveTaskListToLocal(task_list.google_task_list)
				);
				console.log(
					"Converted tasks",
					task_list.google_task_list.tasks.map(GDriveTaskToLocal)
				);
				const last_updated_gdrive_task =
					task_list.google_task_list.tasks
						.map((item) => window.moment(item.updated).unix())
						.sort();

				let merged_list: LocalTaskList & {
					tasks: {
						local: LocalTask;
						gdrive: Task | TaskForUpload;
					}[];
					conflicts: Omit<LocalTask, "id">[];
				};

				if (
					last_updated_gdrive_task[-1] < last_sync &&
					fs_mod_time < last_sync
				) {
					// no need to synchronize anything
					return;
				} else if (fs_mod_time < last_sync) {
					// pull everything from GDrive
					merged_list = {
						...GDriveTaskListToLocal(task_list.google_task_list),
						tasks: task_list.google_task_list.tasks.map((task) => ({
							local: GDriveTaskToLocal(task),
							gdrive: task,
						})),
						conflicts: [],
					};
				} else {
					// hard conflict resolution

					// pull from GDrive all possibly conflicting tasks
					const tasks_modified_after =
						task_list.google_task_list.tasks.filter(
							(task) =>
								window.moment(task.updated).unix() >= last_sync
						);

					// pull task list info from local
					// put into tasks all local tasks that have a GDrive counterpart not modified after last sync
					// put the rest, conflicting, local tasks into conflicts and update their name
					merged_list = {
						...task_list.local_task_list,
						tasks: task_list.local_task_list.tasks
							.filter((task) => {
								// select if not found (if not modified after)
								return (
									tasks_modified_after.findIndex(
										(_task) => _task.id === task.id
									) === -1
								);
							})
							.map((task) => ({
								local: task,
								gdrive: LocalTaskToGDrive(task),
							})),
						conflicts: task_list.local_task_list.tasks
							.filter((task) => {
								// select if found (if modified after)
								// maybe TODO only add if actually different, otherwise its not a conflict
								return (
									tasks_modified_after.findIndex(
										(_task) => _task.id === task.id
									) !== -1
								);
							})
							.map((task) => ({
								...task,
								id: undefined,
								title: "conflict_" + task.title,
							})),
					};

					// add all modified after tasks that do not have a local counterpart
					tasks_modified_after.forEach((task) => {
						// add if not found in merged_list
						if (
							merged_list.tasks.findIndex(
								(new_task) => new_task.local.id === task.id
							) === -1
						)
							merged_list.tasks.push({
								gdrive: task,
								local: GDriveTaskToLocal(task),
							});
					});
				}

				// convert merged (local) list to gdrive version, then select only gdrive tasks and synchronize
				await SynchronizeListToGDrive(
					plugin,
					task_list.google_task_list,
					{
						...LocalTaskListToGDrive(merged_list),
						tasks: merged_list.tasks.map((task) => task.gdrive),
					}
				);

				// dump merged local list to file
				await dumpListToFile(plugin, file_path, {
					...merged_list,
					tasks: merged_list.tasks.map((task) => task.local),
				});
			})
		);

		// upon successful update modify the update timestamp
		const new_file = plugin.settings.synchronized_files.get(file_path);
		new_file.udpated_at = +new Date();
		plugin.settings.synchronized_files.set(file_path, new_file);
		await plugin.saveSettings();
	} catch (error) {
		console.error(error);
	}
}

async function SynchronizeListToGDrive(
	plugin: GoogleTasks,
	old_list: TaskList & { tasks: Task[] },
	new_list: TaskListForUpload & { tasks: TaskForUpload[] }
) {
	if (new_list.title !== old_list.title) {
		// update task list
	}

	// outer merge the two lists of tasks
	const diff_map = new Map<
		string,
		{ old_task: Task | null; new_task: TaskForUpload | null }
	>();

	old_list.tasks.forEach((item) => {
		diff_map.set(item.id, { old_task: item, new_task: null });
	});

	new_list.tasks.forEach((item) => {
		if (diff_map.has(item.id)) {
			diff_map.get(item.id).new_task = item;
		} else {
			diff_map.set(item.id, { old_task: null, new_task: item });
		}
	});
	const diff_array = Array.from(diff_map.values());

	// use the merged list of tasks to perform synchronization
	await Promise.all(
		diff_array.map(async (diff_task) => {
			return await SynchronizeTaskToGDrive(
				plugin,
				diff_task.new_task,
				diff_task.old_task
			);
		})
	);
}

// Correctly upload changes to a task to GDrive
async function SynchronizeTaskToGDrive(
	plugin: GoogleTasks,
	new_task: TaskForUpload | null,
	old_task: Task | null
): Promise<string | null> {
	let id_changed = false;
	if (old_task && !new_task) {
		// delete
	} else {
		if (new_task && !old_task) {
			// create
			// old_task = create()
			// if new_task.id != old_task.id, new_task.id = ..., id_changed = true
		}

		if (new_task.status !== old_task.status) {
			// complete or uncomplete
			// old_task =
		}

		if (new_task.parent != old_task.parent) {
			// move to parent
			// old_task =
		}

		if (new_task.previous != old_task.previous) {
			// move inside list
			// old_task =
		}

		if (new_task != old_task) {
			// update (don't update the time unless the date changed!!)
			// old_task =
		}

		// synchronize children, just call recursively??

		if (new_task != old_task) {
			console.log("something was not updated", new_task, old_task);
			throw new Error("Some changes did not propagate to GDrive");
		}
	}
	if (id_changed) return new_task.id;
	else return null;
}
