#!/usr/bin/env python3
"""One-off generator: builds proposal-study-provider.tsx from pipeline/page.tsx (review after pipeline changes)."""
from pathlib import Path

root = Path("apps/web/src")
pipe_p = root / "app/(authenticated)/pipeline/page.tsx"
lines = pipe_p.read_text().splitlines()


def del_ranges(lines, ranges):
    """ranges are (start1-based, end1-based inclusive). After each delete, indices shift — apply in reverse order."""
    s = lines[:]
    for a, b in sorted(ranges, reverse=True):
        i0, i1 = a - 1, b
        del s[i0:i1]
    return s


# 1-based ranges to remove from PipelinePage body (after copy)
# handleCreateProposalClickRef + estudo deep link
ranges = [
    (1563, 1592),
    (1594, 1631),  # handleCreateDeal
    (1633, 1643),  # early returns
    (1646, 1880),  # main pipeline UI inside outer div (keep 1645 return and 1882+ Dialog)
]

# First, insert children prop: change line 603 "export default function PipelinePage(): JSX.Element {"
new_lines = lines[:]
new_lines[602] = "export function ProposalStudyProvider({ children }: { children: React.ReactNode }): JSX.Element {"

# Remove useSearchParams import line
new_lines = [l for l in new_lines if 'useSearchParams' not in l or 'from "next/navigation"' in l]
# Fix navigation import: keep useRouter only
fixed_imports = []
for l in new_lines:
    if l.strip() == 'import { useRouter, useSearchParams } from "next/navigation";':
        fixed_imports.append('import { useRouter } from "next/navigation";')
    else:
        fixed_imports.append(l)
new_lines = fixed_imports

# Remove searchParams line inside component
new_lines = [l for l in new_lines if 'const searchParams = useSearchParams()' not in l]

new_lines = del_ranges(new_lines, ranges)

# Replace opening of return: find "    <div className=\"space-y-6\">" after ProposalStudyProvider — should be gone; find first Dialog
out = []
i = 0
while i < len(new_lines):
    if new_lines[i].strip() == "return (":
        out.append(new_lines[i])
        i += 1
        # skip until first <Dialog (proposal form)
        if i < len(new_lines) and "space-y-6" in new_lines[i]:
            # skip div opener
            i += 1
            depth = 1
            while i < len(new_lines) and depth > 0:
                if "<div" in new_lines[i] and "/>" not in new_lines[i]:
                    depth += 1
                if "</div>" in new_lines[i]:
                    depth -= 1
                i += 1
            out.append("    <>")
            out.append("      {children}")
            continue
    out.append(new_lines[i])
    i += 1

new_lines = out

# Close fragment: replace last `    </div>` before `  );` that closed space-y-6 — find `      </Dialog>` sequence end
text = "\n".join(new_lines)
text = text.replace(
    "      </Dialog>\n    </div>\n  );\n}",
    "      </Dialog>\n    </>\n  );\n}",
    1,
)

# Prepend bridge import after other imports
parts = text.split("\n", 80)
# insert after line with proposal-integrator
insert_at = next(j for j, l in enumerate(parts) if "proposal-integrator" in l)
parts.insert(insert_at + 1, 'import type { ReactNode } from "react";')
parts.insert(insert_at + 2, 'import { proposalStudyBridge } from "@/components/pipeline/proposal-study-bridge";')

text = "\n".join(parts)

# Add context exports at end before last brace - skip for now; use module-level exports

out_p = root / "components/pipeline/proposal-study-provider.tsx"
out_p.write_text(text)
print("Wrote", out_p, "lines", len(text.splitlines()))
