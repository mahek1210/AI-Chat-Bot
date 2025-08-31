export type MetricsSnapshot = {
  totalRequests: number;
  avgLatency: number;
  totalTokens: number;
  totalCostUSD: number;
  requestsByModel: Record<string, number>;
};

type InternalMetrics = {
  totalRequests: number;
  totalLatencyMs: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCostUSD: number;
  requestsByModel: Record<string, number>;
};

const metrics: InternalMetrics = {
  totalRequests: 0,
  totalLatencyMs: 0,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalCostUSD: 0,
  requestsByModel: {},
};

export function recordRequest(params: {
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  costUSD?: number;
}) {
  const { model, latencyMs, promptTokens, completionTokens, costUSD } = params;
  metrics.totalRequests += 1;
  metrics.totalLatencyMs += Math.max(0, latencyMs || 0);
  metrics.totalPromptTokens += Math.max(0, promptTokens || 0);
  metrics.totalCompletionTokens += Math.max(0, completionTokens || 0);
  if (typeof costUSD === 'number') {
    metrics.totalCostUSD += Math.max(0, costUSD);
  }
  metrics.requestsByModel[model] = (metrics.requestsByModel[model] || 0) + 1;
}

export function getMetrics(): MetricsSnapshot {
  const totalTokens = metrics.totalPromptTokens + metrics.totalCompletionTokens;
  const avgLatency = metrics.totalRequests
    ? Math.round((metrics.totalLatencyMs / metrics.totalRequests) * 100) / 100
    : 0;
  const totalCostUSD = Math.round(metrics.totalCostUSD * 10000) / 10000;

  return {
    totalRequests: metrics.totalRequests,
    avgLatency,
    totalTokens,
    totalCostUSD,
    requestsByModel: { ...metrics.requestsByModel },
  };
}
