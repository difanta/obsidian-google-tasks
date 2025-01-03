export interface GoogleTasksSettings {
	googleRefreshToken: string;
	googleClientId: string;
	googleClientSecret: string;
	refreshInterval: number;
	showNotice: boolean;
	synchronized_files: Map<
		string,
		{ lists: Array<string>; udpated_at: number }
	>;
}

export interface TaskList {
	kind: string;
	id: string;
	etag: string;
	title: string;
	updated: string;
	selfLink: string;
}

export interface TaskListForUpload {
	kind: string;
	id: string;
	title: string;
}

export interface LocalTaskList {
	id: string;
	title: string;
}

export interface Task {
	kind: string;
	id: string;
	etag: string;
	title: string;
	updated: string;
	selfLink: string;
	parent: string;
	position: string;
	notes: string | undefined;
	status: string;
	due: string | undefined;
	completed: string;
	deleted: boolean;
	hidden: boolean;
	links: {
		type: string;
		description: string;
		link: string;
	}[];
	previous: string | null;
	children: Task[];
}

export interface TaskForUpload {
	kind: string;
	id: string;
	title: string;
	notes: string | undefined;
	status: string;
	due: string | undefined;
	links: {
		type: string;
		description: string;
		link: string;
	}[];
	parent: string | null;
	previous: string | null;
	children: TaskForUpload[];
}

export interface LocalTask {
	id: string;
	title: string;
	completed: boolean;
	description: string | undefined;
	date_time: Date | undefined;
	position: string;
	parent: string | null;
	previous: string | null;
	children: LocalTask[];
}

export interface TaskListResponse {
	kind: string;
	etag: string;
	items: TaskList[];
}

export interface TaskResponse {
	kind: string;
	etag: string;
	nextPageToken?: string;
	items: Task[];
}
