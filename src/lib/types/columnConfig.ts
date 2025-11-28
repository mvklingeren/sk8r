export interface ColumnConfig {
	key: string;
	label: string;
	path: string;
	type: 'text' | 'link' | 'badge' | 'fraction' | 'timestamp' | 'age' | 'list';
	formatter?: string;
	colorMap?: Record<string, string>;
	flex?: number;
	sortable?: boolean;
}

export interface ResourceColumnConfig {
	columns: ColumnConfig[];
}

export type ResourceColumnConfigs = Record<string, ResourceColumnConfig>;