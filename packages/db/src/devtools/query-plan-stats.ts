import { z } from "zod";

// This schema is deliberately the production-statistics contract, not a
// Generic JSON object check. Unknown exports are rejected before they can
// Influence fixture sizing or plan-risk classification.

const tableStatisticsSchema = z.object({
  estimatedPages: z.number().nonnegative(),
  estimatedRows: z.number().nonnegative(),
  name: z.string(),
});
const productionStatsSchema = z.object({
  databaseVersion: z.string(),
  source: z.string(),
  tables: z.array(tableStatisticsSchema),
  version: z.literal(1),
});

type ProductionStats = z.infer<typeof productionStatsSchema>;

export { productionStatsSchema };
export type { ProductionStats };
