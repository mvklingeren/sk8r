import type { ComponentType } from 'svelte';
import {
	Package,
	Layers,
	Network,
	HardDrive,
	Shield,
	Puzzle,
	Home,
	Box,
	Calendar,
	Clock,
	Server,
	FileText,
	Lock,
	Share2,
	Globe,
	Database,
	Key,
	Users,
	UserCheck,
	Cpu,
	Settings,
	ShieldCheck,
	Folder,
	Rocket,
	Copy,
	Play,
	ArrowRight,
	Target,
	User,
	Link,
	Link2,
	Route,
	Filter,
	Badge,
	FilePlus,
	Award
} from 'lucide-svelte';

// Map icon names to Lucide components
export const iconMap: Record<string, ComponentType> = {
	// Section icons
	'server': Server,
	'cpu': Cpu,
	'network': Network,
	'settings': Settings,
	'shield-check': ShieldCheck,
	'puzzle': Puzzle,
	
	// Item icons
	'folder': Folder,
	'box': Box,
	'rocket': Rocket,
	'database': Database,
	'layers': Layers,
	'copy': Copy,
	'play': Play,
	'clock': Clock,
	'globe': Globe,
	'arrow-right': ArrowRight,
	'target': Target,
	'shield': Shield,
	'file-text': FileText,
	'key': Key,
	'hard-drive': HardDrive,
	'user': User,
	'user-check': UserCheck,
	'users': Users,
	'link': Link,
	'link-2': Link2,
	'route': Route,
	'filter': Filter,
	'lock': Lock,
	'certificate': Badge,
	'file-plus': FilePlus,
	'award': Award,
	'share2': Share2
};

export function getIcon(iconName?: string): ComponentType {
	if (!iconName) return Box; // Default fallback
	return iconMap[iconName] || Box;
}