import { describe, expect, it } from "vitest";

import { ColorClusterer } from "../../../src/clustering/color-clusterer.js";
import type { DesignValue } from "../../../src/core/types.js";

describe("ColorClusterer", () => {
  const clusterer = new ColorClusterer();

  it("should cluster very similar colors together", () => {
    const colors: DesignValue[] = [
      {
        type: "color",
        value: "#3B82F6",
        file: "Button.tsx",
        line: 5,
        context: "background",
        occurrences: 30,
      },
      {
        type: "color",
        value: "#3B83F6",
        file: "Modal.tsx",
        line: 10,
        context: "background",
        occurrences: 3,
      },
      {
        type: "color",
        value: "#3B81F6",
        file: "Form.tsx",
        line: 8,
        context: "background",
        occurrences: 2,
      },
    ];

    const clusters = clusterer.cluster(colors);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].representative).toBe("#3B82F6");
    expect(clusters[0].values).toHaveLength(3);
    expect(clusters[0].confidence).toBeGreaterThanOrEqual(85);
  });

  it("should keep distinct colors separate", () => {
    const colors: DesignValue[] = [
      {
        type: "color",
        value: "#3B82F6",
        file: "Button.tsx",
        line: 5,
        context: "background",
        occurrences: 10,
      },
      {
        type: "color",
        value: "#EF4444",
        file: "Alert.tsx",
        line: 10,
        context: "background",
        occurrences: 8,
      },
    ];

    const clusters = clusterer.cluster(colors);

    expect(clusters).toHaveLength(2);
  });

  it("should track variations", () => {
    const colors: DesignValue[] = [
      {
        type: "color",
        value: "#3B82F6",
        file: "Button.tsx",
        line: 5,
        context: "background",
        occurrences: 24,
      },
      {
        type: "color",
        value: "#3B83F6",
        file: "Modal.tsx",
        line: 10,
        context: "background",
        occurrences: 3,
      },
    ];

    const clusters = clusterer.cluster(colors);

    expect(clusters[0].metadata.variations).toHaveLength(1);
    expect(clusters[0].metadata.variations?.[0].value).toBe("#3B83F6");
    expect(clusters[0].metadata.variations?.[0].occurrences).toBe(3);
  });

  it("should discard low-confidence merged clusters", () => {
    const colors: DesignValue[] = [
      {
        type: "color",
        value: "#3B82F6",
        file: "Button.tsx",
        line: 5,
        context: "background",
        occurrences: 6,
      },
      {
        type: "color",
        value: "#3B83F6",
        file: "Modal.tsx",
        line: 10,
        context: "background",
        occurrences: 4,
      },
    ];

    const clusters = clusterer.cluster(colors);
    expect(clusters).toHaveLength(0);
  });
});

