# Transport regression evidence

Revision: `f47f77500f06df55ac5d5d3461be4c2162d145df`, with the regression tests added
in the working checkout.

The real oRPC HTTP handler returned 500 for typed infrastructure failures before
moving error translation outside the Effect runner. See
[the original failing run](runtime-boundaries-red.txt).

The intermediate implementation classified defects as retryable failures.
[The defect regression](transport-defect-red.txt) fails with 503 instead of 500
before narrowing translation to typed infrastructure failures.

Commands are recorded in `docs/test-evidence.json` and the captured runner output.
