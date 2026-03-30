import Color from "color";

import type { Cluster, DesignValue } from "../core/types.js";

export interface ClusterContext {
  id: string;
  value: string;
  usedIn: {
    files: string[];
    components: string[];
    properties: string[];
  };
  occurrences: number;
  visualProperties: {
    hue: number;
    lightness: number;
    saturation: number;
  };
}

export class ContextBuilder {
  buildClusterContext(cluster: Cluster): ClusterContext {
    const color = Color(cluster.representative);
    const [h, s, l] = color.hsl().array();

    // Extract component names from file paths
    const components = this.extractComponents(cluster.values);

    // Extract CSS properties
    const properties = [...new Set(cluster.values.map((v) => v.context))];

    const clusterWithOptionalId = cluster as Cluster & { id?: string };

    return {
      id: clusterWithOptionalId.id || this.generateId(cluster),
      value: cluster.representative,
      usedIn: {
        files: [...new Set(cluster.values.map((v) => v.file))],
        components,
        properties,
      },
      occurrences: cluster.values.reduce(
        (sum, v) => sum + (v.occurrences ?? 1),
        0,
      ),
      visualProperties: {
        hue: Math.round(h),
        lightness: Math.round(l),
        saturation: Math.round(s),
      },
    };
  }

  private extractComponents(values: DesignValue[]): string[] {
    const components = values
      .map((v) => {
        // Extract component name from file path
        // Button.tsx -> Button
        // components/forms/Input.tsx -> Input
        const match = v.file.match(/([A-Z][a-zA-Z0-9]+)\.(tsx|jsx)$/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    return [...new Set(components)] as string[];
  }

  private generateId(cluster: Cluster): string {
    // Generate stable ID based on representative value
    return `cluster_${cluster.representative.replace("#", "")}`;
  }
}

