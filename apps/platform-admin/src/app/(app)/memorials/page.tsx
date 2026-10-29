import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  cn,
  EmptyState,
  Input,
  PageHeader,
  Table,
  TableWrap,
  Tbody,
  Th,
  Thead,
  Tr,
} from "@evermora/ui";
import { PageShell } from "@/components/page-shell";
import { searchMemorials } from "@/lib/data/admin";
import { MemorialRow } from "./memorial-row";

export const metadata: Metadata = { title: "Memorials" };

const FILTERS = [
  { value: "", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "suspended", label: "Suspended" },
  { value: "archived", label: "Archived" },
];

export default async function MemorialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = "", status = "" } = await searchParams;
  const memorials = (await searchMemorials(q)).filter((m) => !status || m.status === status);

  const filterHref = (value: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (value) p.set("status", value);
    const s = p.toString();
    return s ? `?${s}` : "/memorials";
  };

  return (
    <PageShell size="dashboard">
      <PageHeader title="Memorials" description="Every memorial on the platform." />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <form className="relative">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
          />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search by name…"
            aria-label="Search memorials by name"
            className="w-72 pl-9"
          />
        </form>
        <nav className="flex flex-wrap gap-1" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={filterHref(f.value)}
              aria-current={status === f.value ? "page" : undefined}
              className={cn(
                "rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors",
                status === f.value
                  ? "bg-brand-soft text-brand-hover"
                  : "text-fg-muted hover:bg-surface-subtle hover:text-fg",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </div>

      {memorials.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="No memorials match"
          description={q || status ? "Try a different search or filter." : "Nothing here yet."}
        />
      ) : (
        <TableWrap className="mt-4">
          <Table className="min-w-[40rem]">
            <Thead>
              <Tr>
                <Th>Memorial</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {memorials.map((m) => (
                <MemorialRow key={m.id} memorial={m} />
              ))}
            </Tbody>
          </Table>
        </TableWrap>
      )}

      <p className="mt-3 text-xs text-fg-subtle">
        Showing up to 50 of the most recent name matches. A full memorial-detail view and pagination
        are a follow-up.
      </p>
    </PageShell>
  );
}
