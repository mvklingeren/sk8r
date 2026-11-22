/**
 * Normalize server input to full URL format
 * Accepts:
 * - Full URL: https://kubernetes.example.com:6443
 * - Hostname/IP: kubernetes.example.com or 192.168.1.100
 * Returns normalized URL with https:// and default port 6443 if needed
 */
export function normalizeServerUrl(input: string): string {
	if (!input || !input.trim()) {
		throw new Error('Server address is required');
	}

	const trimmed = input.trim();

	// If it already looks like a full URL, validate and return
	if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
		try {
			const url = new URL(trimmed);
			// Ensure HTTPS
			if (url.protocol !== 'https:') {
				throw new Error('Only HTTPS is supported for Kubernetes API server');
			}
			// Return without trailing slash (url.toString() adds one)
			return url.toString().replace(/\/+$/, '');
		} catch (e) {
			throw new Error(`Invalid URL format: ${e instanceof Error ? e.message : 'Unknown error'}`, {
				cause: e
			});
		}
	}

	// If it's just hostname/IP, add https:// and default port
	// Remove any trailing slashes
	const cleanHost = trimmed.replace(/\/+$/, '');

	// Check if it contains a port already
	const hasPort = /:\d+$/.test(cleanHost);

	if (hasPort) {
		// Extract hostname and port
		const lastColonIndex = cleanHost.lastIndexOf(':');
		const host = cleanHost.substring(0, lastColonIndex);
		const port = cleanHost.substring(lastColonIndex + 1);

		// Basic validation - just check it's not empty
		if (!host || !port || isNaN(parseInt(port))) {
			throw new Error('Invalid hostname/IP and port format');
		}

		return `https://${host}:${port}`;
	} else {
		// Basic validation - check it's not empty and doesn't contain invalid characters
		if (!cleanHost || /[<>"']/.test(cleanHost)) {
			throw new Error('Invalid hostname or IP address format');
		}
		// Add default port 6443
		return `https://${cleanHost}:6443`;
	}
}
