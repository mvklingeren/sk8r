export interface NavigationItem {
	key: string;
	label: string;
	resourceType?: string;
	icon?: string;
	color?: string;
	description?: string;
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