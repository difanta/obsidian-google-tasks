import { getRT } from "./helper/LocalStorage";
import { Plugin, Notice, type EventRef } from "obsidian";
import type { GoogleTasksSettings } from "./helper/types";
import { getAllTaskLists } from "./googleApi/GoogleTaskList";
import {
	GoogleTasksSettingTab,
	settingsAreCompleteAndLoggedIn,
} from "./view/GoogleTasksSettingTab";
import { FullScan } from "./helper/FileScanner";
import { SynchronizeAllFiles } from "./helper/Synchronizer";

const DEFAULT_SETTINGS: GoogleTasksSettings = {
	googleRefreshToken: "",
	googleClientId: "",
	googleClientSecret: "",
	refreshInterval: 60,
	showNotice: true,
	synchronized_files: new Map(),
};

export default class GoogleTasks extends Plugin {
	//@ts-ignore
	settings: GoogleTasksSettings;
	//@ts-ignore
	plugin: GoogleTasks;
	showHidden = false;
	//@ts-ignore
	openEvent: EventRef;

	onLayoutReady = async () => {};

	async onload() {
		await this.loadSettings();
		this.plugin = this;
		this.app.workspace.onLayoutReady(this.onLayoutReady);

		/*this.registerDomEvent(document, "click", (event) => {
			if (!(event.target instanceof HTMLInputElement)) {
				return;
			}

			const checkPointElement = event.target as HTMLInputElement;
			if (
				!checkPointElement.classList.contains("task-list-item-checkbox")
			)
				return;

			const idElement =
				checkPointElement.parentElement.parentElement.querySelectorAll(
					".cm-comment.cm-list-1"
				)[1] as HTMLElement;

			const taskId = idElement.textContent;

			if (!settingsAreCompleteAndLoggedIn(this, false)) return;

			if (checkPointElement.checked) {
				GoogleCompleteTaskById(this, taskId);
			} else {
				GoogleUnCompleteTaskById(this, taskId);
			}
		});*/

		//Create a new task command
		this.addCommand({
			id: "get-all-lists",
			name: "Log all Lists",
			checkCallback: (checking: boolean) => {
				const canRun = settingsAreCompleteAndLoggedIn(this, false);

				if (checking) {
					return canRun;
				}

				if (!canRun) {
					return;
				}

				getAllTaskLists(this).then((lists) => {
					console.log(JSON.stringify(lists, null, 1));
				});
			},
		});

		//Full scan the vault and update lists map in settings
		this.addCommand({
			id: "rescan-all",
			name: "Rescan all",
			checkCallback: (checking: boolean) => {
				const canRun = settingsAreCompleteAndLoggedIn(this, false);

				if (checking) {
					return canRun;
				}

				if (!canRun) {
					return;
				}

				FullScan(this).then(async (map) => {
					this.settings.synchronized_files = map;
					await this.plugin.saveSettings();
					console.log([
						...this.settings.synchronized_files.entries(),
					]);
				});
			},
		});

		//Create a new task command
		this.addCommand({
			id: "synchronize-tasks",
			name: "Synchronize tasks",
			checkCallback: (checking: boolean) => {
				const canRun = settingsAreCompleteAndLoggedIn(this, false);

				if (checking) {
					return canRun;
				}

				if (!canRun) {
					return;
				}

				SynchronizeAllFiles(this).then(() => {
					console.log("Synchronized!");
				});
			},
		});

		//Copy Refresh token to clipboard
		this.addCommand({
			id: "copy-google-refresh-token",
			name: "Copy Google Refresh Token to Clipboard",

			callback: () => {
				const token = getRT();
				if (token == undefined || token == "") {
					new Notice("No Refresh Token. Please Login.");
					return;
				}

				navigator.clipboard.writeText(token).then(
					function () {
						new Notice("Token copied");
					},
					function (err) {
						new Notice("Could not copy token");
					}
				);
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new GoogleTasksSettingTab(this.app, this));
	}

	onunload() {
		this.app.vault.offref(this.openEvent);
	}

	serializeSettings(settings: GoogleTasksSettings) {
		return {
			...settings,
			synchronized_files: [...settings.synchronized_files.entries()],
		};
	}

	unserializeSettings(
		data: Partial<ReturnType<GoogleTasks["serializeSettings"]>>
	): Partial<GoogleTasksSettings> {
		return {
			...data,
			synchronized_files: data.synchronized_files
				? new Map(data.synchronized_files)
				: undefined,
		};
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			this.unserializeSettings(await this.loadData())
		);
	}

	async saveSettings() {
		await this.saveData(this.serializeSettings(this.settings));
	}
}
