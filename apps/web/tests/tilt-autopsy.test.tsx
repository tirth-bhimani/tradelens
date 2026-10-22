import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { detectTiltCascades } from "../lib/tilt/detector";
import { SAMPLE_TILT_CASCADES, TiltCascadeEvent } from "../lib/tilt/types";
import { CascadeTimeline } from "../components/tilt/cascade-timeline";
import { CircuitBreakerCard } from "../components/tilt/circuit-breaker-card";
import { TiltAutopsyView } from "../components/tilt/tilt-autopsy-view";

describe("Forensic Tilt Autopsy & Cascade Sequencer", () => {
  describe("detectTiltCascades Engine", () => {
    it("falls back to rich sample cascades when empty dataset provided", () => {
      const overview = detectTiltCascades([]);

      expect(overview.total_cascades_detected).toBeGreaterThan(0);
      expect(overview.total_capital_drained_by_tilt_inr).toBeGreaterThan(0);
      expect(overview.potential_capital_recoverable_inr).toBeGreaterThan(0);
      expect(overview.cascades[0].trades.length).toBeGreaterThan(1);
    });

    it("correctly identifies trigger trade, velocity compression, and revenge sizing", () => {
      const mockRawTrades = [
        {
          id: "trade-01",
          symbol: "NIFTY26SEP24500CE",
          entry_time: "2026-09-01T10:00:00+05:30",
          exit_time: "2026-09-01T10:15:00+05:30",
          quantity: 50,
          net_pnl: -3500, // Trigger loss (>1500)
        },
        {
          id: "trade-02",
          symbol: "NIFTY26SEP24450PE",
          entry_time: "2026-09-01T10:20:00+05:30", // 5m gap (compressed)
          exit_time: "2026-09-01T10:30:00+05:30",
          quantity: 100, // 2.0x size inflation
          net_pnl: -5000,
        },
        {
          id: "trade-03",
          symbol: "NIFTY26SEP24400PE",
          entry_time: "2026-09-01T10:34:00+05:30", // 4m gap
          exit_time: "2026-09-01T10:45:00+05:30",
          quantity: 150, // 3.0x size inflation
          net_pnl: -6000,
        },
      ];

      const overview = detectTiltCascades(mockRawTrades);
      expect(overview.total_cascades_detected).toBe(1);

      const cascade = overview.cascades[0];
      expect(cascade.total_trades_count).toBe(3);
      expect(cascade.trigger_loss_inr).toBe(3500);
      expect(cascade.subsequent_spiral_loss_inr).toBe(11000); // 5000 + 6000
      expect(cascade.total_cascade_loss_inr).toBe(14500); // 3500 + 11000
      expect(cascade.min_reentry_interval_minutes).toBe(4);
      expect(cascade.max_size_inflation).toBe(3);
      expect(cascade.counterfactual_circuit_breaker.avoided_loss_inr).toBe(11000);
      expect(cascade.counterfactual_circuit_breaker.trades_prevented_count).toBe(2);
    });
  });

  describe("CascadeTimeline Component", () => {
    it("renders step-by-step nodes, velocity badges, and running loss waterfall", () => {
      const sample = SAMPLE_TILT_CASCADES[0];
      const html = renderToStaticMarkup(<CascadeTimeline cascade={sample} />);

      expect(html).toContain("Forensic Sequence Timeline");
      expect(html).toContain("T0");
      expect(html).toContain("T1");
      expect(html).toContain("TRIGGER LOSS");
      expect(html).toContain("3m re-entry"); // Velocity badge
      expect(html).toContain("BANKNIFTY");
    });
  });

  describe("CircuitBreakerCard Component", () => {
    it("renders percentage saved, counterfactual matrix, and direct Rule Lab link", () => {
      const sample = SAMPLE_TILT_CASCADES[0];
      const html = renderToStaticMarkup(<CircuitBreakerCard cascade={sample} />);

      expect(html).toContain("Counterfactual Circuit Breaker Simulation");
      expect(html).toContain("Actual Spiral Outcome");
      expect(html).toContain("Simulated with Circuit Breaker");
      expect(html).toContain("Capital Saved");
      expect(html).toContain("Backtest in Rule Lab");
      expect(html).toContain("prefillRule=COOL_OFF_AFTER_LOSS");
    });
  });

  describe("TiltAutopsyView Component", () => {
    it("renders 4-metric high-level KPI ribbon and incident selectors", () => {
      const overview = detectTiltCascades([]);
      const html = renderToStaticMarkup(<TiltAutopsyView overview={overview} />);

      expect(html).toContain("Tilt Cascades Detected");
      expect(html).toContain("Capital Drained by Tilt");
      expect(html).toContain("Avg Spiral Velocity");
      expect(html).toContain("Recoverable with Rules");
      expect(html).toContain("Isolated Tilt Incident Records");
    });
  });
});
