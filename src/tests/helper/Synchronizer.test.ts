import { describe, it, expect, vi, beforeEach } from "vitest";
import { SynchronizeFile } from "../../helper/Synchronizer";
import GoogleTasks from "../../GoogleTasksPlugin";
import { getTaskList } from "../../googleApi/GoogleTaskList";
import { getAllTasksFromList } from "../../googleApi/GoogleTask";
import { extractListFromFile, dumpListToFile } from "../../helper/FileScanner";
import { createNotice } from "../../helper/NoticeHelper";
import {
	createTask,
	deleteTask,
	moveTask,
	updateTask,
} from "../../googleApi/GoogleTaskOperations";

vi.mock("../googleApi/GoogleTaskList", () => ({
	getTaskList: vi.fn(),
}));

vi.mock("../googleApi/GoogleTask", () => ({
	getAllTasksFromList: vi.fn(),
}));

vi.mock("./FileScanner", () => ({
	extractListFromFile: vi.fn(),
	dumpListToFile: vi.fn(),
}));

vi.mock("../googleApi/GoogleTaskOperations", () => ({
	createTask: vi.fn(),
	deleteTask: vi.fn(),
	moveTask: vi.fn(),
	updateTask: vi.fn(),
}));

vi.mock("./NoticeHelper", () => ({
	createNotice: vi.fn(),
}));

describe("SynchronizeFile", () => {
	let plugin: GoogleTasks;
	let file_path: string;
	let showNotice: boolean;

	beforeEach(() => {
		plugin = {
			settings: {
				synchronized_files: new Map(),
			},
			app: {
				vault: {
					getFileByPath: vi.fn(),
				},
			},
			saveSettings: vi.fn(),
		} as unknown as GoogleTasks;

		file_path = "test_path";
		showNotice = true;
	});

	it("should log an error and create a notice if the file is not found", async () => {
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		const file_path = "test_path";
		plugin.settings.synchronized_files.set(file_path, {
			lists: [],
			udpated_at: 0,
		});
		plugin.app.vault.getFileByPath = vi.fn().mockReturnValue(null);

		await SynchronizeFile(plugin, file_path, showNotice);

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			`File ${file_path} not found`
		);
		expect(createNotice).toHaveBeenCalledWith(
			plugin,
			`File ${file_path} not found`
		);

		consoleErrorSpy.mockRestore();
	});

	it("should update the synchronized file settings and save settings", async () => {
		const file = {
			lists: ["list1", "list2"],
			udpated_at: 100,
		};
		const fs_mod_time = 200;

		plugin.settings.synchronized_files.set(file_path, file);
		plugin.app.vault.getFileByPath = vi
			.fn()
			.mockReturnValue({ stat: { mtime: fs_mod_time } });

		getTaskList.mockResolvedValue({});
		getAllTasksFromList.mockResolvedValue([]);
		extractListFromFile.mockResolvedValue({});

		await SynchronizeFile(plugin, file_path, showNotice);

		expect(plugin.settings.synchronized_files.get(file_path)).toEqual({
			lists: ["list1", "list2"],
			udpated_at: expect.any(Number),
		});
		expect(plugin.saveSettings).toHaveBeenCalled();
	});

	it("should handle task list synchronization correctly", async () => {
		const file = {
			lists: ["list1", "list2"],
			udpated_at: 123456789,
		};
		const fs_mod_time = 987654321;

		plugin.settings.synchronized_files.set(file_path, file);
		plugin.app.vault.getFileByPath = vi
			.fn()
			.mockReturnValue({ stat: { mtime: fs_mod_time } });

		getTaskList.mockResolvedValue({});
		getAllTasksFromList.mockResolvedValue([]);
		extractListFromFile.mockResolvedValue({});

		await SynchronizeFile(plugin, file_path, showNotice);

		expect(dumpListToFile).toHaveBeenCalled();
	});
});
