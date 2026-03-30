import { describe, expect, it } from "vitest";

import { SpacingClusterer } from "../../../src/clustering/spacing-clusterer.js";
import type { DesignValue } from "../../../src/core/types.js";

describe("SpacingClusterer", () => {
  const clusterer = new SpacingClusterer();

  it("should cluster similar spacing values", () => {
    const spacing: DesignValue[] = [
      {
        type: "spacing",
        value: "15px",
        file: "Button.tsx",
        line: 5,
        context: "padding",
        occurrences: 20,
      },
      {
        type: "spacing",
        value: "16px",
        file: "Card.tsx",
        line: 10,
        context: "padding",
        occurrences: 2,
      },
      {
        type: "spacing",
        value: "17px",
        file: "Hero.tsx",
        line: 8,
        context: "padding",
        occurrences: 1,
      },
    ];

    const clusters = clusterer.cluster(spacing);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].representative).toBe("15px");
    expect(clusters[0].confidence).toBeGreaterThanOrEqual(85);
    expect(clusters[0].values).toHaveLength(3);
  });

  it("should detect 8px grid pattern", () => {
    const spacing: DesignValue[] = [
      {
        type: "spacing",
        value: "8px",
        file: "Button.tsx",
        line: 5,
        context: "padding",
        occurrences: 5,
      },
      {
        type: "spacing",
        value: "16px",
        file: "Card.tsx",
        line: 10,
        context: "padding",
        occurrences: 8,
      },
      {
        type: "spacing",
        value: "24px",
        file: "Hero.tsx",
        line: 8,
        context: "padding",
        occurrences: 3,
      },
    ];

    const clusters = clusterer.cluster(spacing);

    expect(clusters[0].metadata.gridPattern).toBe("8px");
    expect(clusters[1].metadata.gridPattern).toBe("8px");
    expect(clusters[2].metadata.gridPattern).toBe("8px");
  });

  it("should keep distinct spacing values separate", () => {
    const spacing: DesignValue[] = [
      {
        type: "spacing",
        value: "8px",
        file: "Button.tsx",
        line: 5,
        context: "padding",
        occurrences: 5,
      },
      {
        type: "spacing",
        value: "24px",
        file: "Card.tsx",
        line: 10,
        context: "padding",
        occurrences: 8,
      },
    ];

    const clusters = clusterer.cluster(spacing);

    expect(clusters).toHaveLength(2);
  });

  it("should expand shorthand spacing values like '16px 24px'", () => {
    const spacing: DesignValue[] = [
      {
        type: "spacing",
        value: "16px 24px",
        file: "Button.tsx",
        line: 5,
        context: "padding",
        occurrences: 2,
      },
      {
        type: "spacing",
        value: "16px",
        file: "Card.tsx",
        line: 10,
        context: "paddingTop",
        occurrences: 3,
      },
      {
        type: "spacing",
        value: "24px",
        file: "Card.tsx",
        line: 11,
        context: "paddingRight",
        occurrences: 3,
      },
    ];

    const clusters = clusterer.cluster(spacing);

    expect(clusters).toHaveLength(2);
    const reps = clusters.map((c) => c.representative).sort();
    expect(reps).toEqual(["16px", "24px"]);
    expect(clusters.every((c) => c.values.length >= 2)).toBe(true);
  });

  it("should discard low-confidence spacing clusters", () => {
    const spacing: DesignValue[] = [
      {
        type: "spacing",
        value: "15px",
        file: "Button.tsx",
        line: 5,
        context: "padding",
        occurrences: 6,
      },
      {
        type: "spacing",
        value: "16px",
        file: "Card.tsx",
        line: 10,
        context: "padding",
        occurrences: 4,
      },
    ];

    const clusters = clusterer.cluster(spacing);
    expect(clusters).toHaveLength(0);
  });
});

