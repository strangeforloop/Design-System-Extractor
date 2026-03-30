import Color from "color";

import type { Cluster } from "../core/types.js";

export class ClusterBatcher {
  private batchSize = 10;

  groupByColorFamily(clusters: Cluster[]): Map<string, Cluster[]> {
    const families = new Map<string, Cluster[]>();

    clusters.forEach((cluster) => {
      const family = this.getColorFamily(cluster.representative);
      const existing = families.get(family) || [];
      existing.push(cluster);
      families.set(family, existing);
    });

    return families;
  }

  private getColorFamily(hex: string): string {
    const color = Color(hex);
    const [h, s, l] = color.hsl().array();

    // Grayscale (low saturation)
    if (s < 10) {
      if (l < 20) return "gray-dark";
      if (l > 80) return "gray-light";
      return "gray-mid";
    }

    // Colors by hue
    if (h >= 0 && h < 30) return "red";
    if (h >= 30 && h < 60) return "orange";
    if (h >= 60 && h < 90) return "yellow";
    if (h >= 90 && h < 150) return "green";
    if (h >= 150 && h < 210) return "cyan";
    if (h >= 210 && h < 270) return "blue";
    if (h >= 270 && h < 330) return "purple";
    if (h >= 330) return "pink";

    return "other";
  }

  createBatches(clusters: Cluster[]): Cluster[][] {
    // Group by family first
    const families = this.groupByColorFamily(clusters);

    // Create batches within each family
    const batches: Cluster[][] = [];

    families.forEach((familyClusters) => {
      // Sort by lightness (lighter to darker)
      const sorted = familyClusters.sort((a, b) => {
        const lightnessA = Color(a.representative).hsl().array()[2];
        const lightnessB = Color(b.representative).hsl().array()[2];
        return lightnessB - lightnessA; // Descending
      });

      // Split into batches of 10
      for (let i = 0; i < sorted.length; i += this.batchSize) {
        batches.push(sorted.slice(i, i + this.batchSize));
      }
    });

    return batches;
  }
}

