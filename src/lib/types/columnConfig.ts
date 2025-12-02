export interface ColumnConfig {
	key: string;
	label: string;
	path: string;
	type: 'text' | 'link' | 'badge' | 'fraction' | 'timestamp' | 'age' | 'list' | 'labels';
	formatter?: string;
	colorMap?: Record<string, string>;
	flex?: number;
	sortable?: boolean;
	maxWidth?: string; // e.g., '300px', '20rem'
}

export interface ResourceColumnConfig {
	columns: ColumnConfig[];
}

export type ResourceColumnConfigs = Record<string, ResourceColumnConfig>;