import {
	describe,
	it,
	expect,
	vi,
	beforeEach,
	type MockedFunction,
	type Mock,
} from "vitest";
import { SynchronizeFile } from "../../helper/Synchronizer";
import type GoogleTasks from "../../GoogleTasksPlugin";
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
import type { TaskForUpload } from "../../helper/types";

vi.mock("../../googleApi/GoogleTaskList", () => ({
	getTaskList: vi.fn(),
}));

vi.mock("../../googleApi/GoogleTask", () => ({
	getAllTasksFromList: vi.fn(),
}));

vi.mock("../../helper/FileScanner", () => ({
	extractListFromFile: vi.fn(),
	dumpListToFile: vi.fn(),
}));

vi.mock("../../googleApi/GoogleTaskOperations", () => ({
	createTask: vi.fn(),
	deleteTask: vi.fn(),
	moveTask: vi.fn(),
	updateTask: vi.fn(),
}));

vi.mock("../../helper/NoticeHelper", () => ({
	createNotice: vi.fn(),
}));

const list1 = {
	kind: "tasks#taskList",
	id: "list1",
	etag: '""',
	title: "Giochi alcolici",
	updated: "2024-02-23T13:57:11.446Z",
	selfLink: "https://www.googleapis.com/tasks/v1/users/@me/",
};

const list2 = {
	kind: "tasks#taskList",
	id: "a0NtVUVkZ0Fja3A3eDg4eA",
	etag: '""',
	title: "DnD",
	updated: "2024-10-15T20:52:57.183Z",
	selfLink: "https://www.googleapis.com/tasks/v1/users/@me/",
};

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

		(getTaskList as Mock<typeof getTaskList>).mockResolvedValue(list1);
		(
			getAllTasksFromList as Mock<typeof getAllTasksFromList>
		).mockResolvedValue([]);
		(
			extractListFromFile as Mock<typeof extractListFromFile>
		).mockResolvedValue({
			...list1,
			tasks: [],
		});

		await SynchronizeFile(plugin, file_path, showNotice);

		expect(plugin.settings.synchronized_files.get(file_path)).toEqual({
			lists: ["list1", "list2"],
			udpated_at: expect.any(Number),
		});
		expect(plugin.saveSettings).toHaveBeenCalled();
	});

	it("does not call anything when updated at is gt than modified and fs mod time", async () => {
		const file = {
			lists: ["list1", "list2"],
			udpated_at: 100,
		};
		const fs_mod_time = 10;

		plugin.settings.synchronized_files.set(file_path, file);
		plugin.app.vault.getFileByPath = vi
			.fn()
			.mockReturnValue({ stat: { mtime: fs_mod_time } });

		(getTaskList as Mock<typeof getTaskList>).mockResolvedValue(list1);
		(
			getAllTasksFromList as Mock<typeof getAllTasksFromList>
		).mockResolvedValue([]);
		(
			extractListFromFile as Mock<typeof extractListFromFile>
		).mockResolvedValue({
			...list1,
			tasks: [],
		});

		await SynchronizeFile(plugin, file_path, showNotice);

		expect(dumpListToFile).toHaveBeenCalled();
	});
});
