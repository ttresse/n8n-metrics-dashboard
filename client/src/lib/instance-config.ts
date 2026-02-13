// Instance URL utilities
// The n8n_instance field in the database now contains the full URL

/**
 * Normalize URL to ensure it has https:// protocol
 */
export function normalizeInstanceUrl(url: string | null): string {
  if (!url) return "";

  let normalized = url.trim();

  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, "");

  // If no protocol, add https://
  if (!normalized.match(/^https?:\/\//i)) {
    normalized = `https://${normalized}`;
  }

  return normalized;
}

/**
 * Format instance URL for display (without https://)
 */
export function formatInstanceForDisplay(instance: string | null): string {
  if (!instance) return "";

  return instance
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

/**
 * Build the n8n execution URL for a given execution
 * Uses the instance field directly as the base URL
 */
export function buildN8nExecutionUrl(
  instanceUrl: string | null,
  workflowId: string,
  executionId: string
): string | null {
  if (!instanceUrl) return null;

  const baseUrl = normalizeInstanceUrl(instanceUrl);
  return `${baseUrl}/workflow/${workflowId}/executions/${executionId}`;
}
