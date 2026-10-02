# Planner regression evidence

Revision: `f47f77500f06df55ac5d5d3461be4c2162d145df`, with the extracted planner
implementation and regression tests added in the working checkout.

Command: `pnpm --filter @template/db exec vitest run src/tests/devtools/planner-safety.test.ts`

- [Before the analysis fix](planner-analysis-red.txt), a selective scan of a
  million-row relation passed and a cost-only change lacked its previous plan.
- [Removing the target identity guard](planner-target-red.txt) allowed an
  ordinary or mismatched database URL. The safety assertions reject it.

Both failures were observed; temporary mutations were restored.
