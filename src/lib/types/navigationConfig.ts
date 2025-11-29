export interface CliCommand {
	description: string;
	command: string;
}

export interface LearningContent {
	title: string;
	summary: string;
	details: string;
	docsPath: string; // Path relative to https://kubernetes.io/docs/concepts/
	cliCommands?: CliCommand[];
}

export interface NavigationItem {
	key: string;
	label: string;
	resourceType?: string;
	icon?: string;
	color?: string;
	description?: string;
	learning?: LearningContent;
}

export interface NavigationSection {
	key: string;
	label: string;
	icon?: string;
	items: NavigationItem[];
	collapsed?: boolean;
}

export interface NavigationConfig {
	sections: NavigationSection[];
}