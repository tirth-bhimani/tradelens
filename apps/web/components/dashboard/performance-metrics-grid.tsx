"use client";

import {
  SummaryMetricsGrid,
  type SummaryMetricsData,
  type SummaryMetricsGridProps,
  DEFAULT_SUMMARY_METRICS,
} from "./summary-metrics-grid";

export type PerformanceMetricsData = SummaryMetricsData;
export type PerformanceMetricsGridProps = SummaryMetricsGridProps;
export const DEFAULT_METRICS = DEFAULT_SUMMARY_METRICS;

/**
 * PerformanceMetricsGrid
 *
 * Backwards-compatible institutional summary metrics grid component.
 */
export function PerformanceMetricsGrid(props: PerformanceMetricsGridProps) {
  return <SummaryMetricsGrid {...props} />;
}

export { SummaryMetricsGrid };
