"use client";

import {
  AlertTriangle,
  Bell,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Inbox,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  FormField,
  IconButton,
  Input,
  PageHeader,
  Radio,
  RadioGroup,
  SectionHeader,
  Select,
  Skeleton,
  StatCard,
  StatusBadge,
  Switch,
  Table,
  TableWrap,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tbody,
  Td,
  Textarea,
  Th,
  Thead,
  ToastProvider,
  Tooltip,
  TooltipProvider,
  Tr,
  useToast,
} from "@evermora/ui";

function Bench({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-6" id={title.toLowerCase().replace(/[^a-z]+/g, "-")}>
      <div className="mb-4">
        <h2 className="font-serif text-xl font-medium text-fg">{title}</h2>
        {note ? <p className="mt-1 max-w-prose text-sm text-fg-muted">{note}</p> : null}
      </div>
      <div className="rounded-lg border border-line bg-surface p-5">{children}</div>
    </section>
  );
}

export function DesignCatalogue() {
  return (
    <ToastProvider>
      <TooltipProvider>
        <CatalogueBody />
      </TooltipProvider>
    </ToastProvider>
  );
}

function CatalogueBody() {
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");

  return (
    <>
      {/* The catalogue paints its own canvas ground so the tokens read true,
          independent of the admin shell's current (pre-6A.3) surface. */}
      <div className="flex flex-col gap-10 rounded-lg border border-line bg-canvas p-6 text-fg sm:p-8">
        <PageHeader
          title="Evermora Design System"
          breadcrumb={[{ label: "Admin", href: "/" }, { label: "Design system" }]}
          meta="@evermora/ui · Phase 6A.0 · Palette A — Evergreen & Bronze"
          actions={
            <Button
              variant="secondary"
              trailingIcon={<ExternalLink />}
              onClick={() => toast({ title: "This is the live catalogue", tone: "info" })}
            >
              About this page
            </Button>
          }
        />

        <Bench
          title="Colour"
          note="Every value is a token — no hex in components. All three text tones meet WCAG AA."
        >
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
            {[
              ["canvas", "bg-canvas"],
              ["surface", "bg-surface"],
              ["surface-subtle", "bg-surface-subtle"],
              ["raised", "bg-raised"],
              ["brand", "bg-brand"],
              ["brand-soft", "bg-brand-soft"],
              ["accent", "bg-accent"],
              ["accent-soft", "bg-accent-soft"],
              ["ok", "bg-ok"],
              ["warn", "bg-warn"],
              ["bad", "bg-bad"],
              ["info", "bg-info"],
            ].map(([name, cls]) => (
              <div key={name} className="bg-raised p-3">
                <div className={`mb-2 h-10 rounded-sm border border-black/10 ${cls}`} />
                <div className="font-mono text-[11px] text-fg">--color-{name}</div>
              </div>
            ))}
          </div>
        </Bench>

        <Bench
          title="Typography"
          note="Newsreader for names and headlines, Public Sans for the interface, IBM Plex Mono for data."
        >
          <div className="flex flex-col gap-3">
            <p className="font-serif text-[40px] leading-tight font-medium tracking-tight text-fg">
              A place to remember
            </p>
            <p className="font-serif text-2xl font-medium text-fg">Their Story</p>
            <p className="text-lg text-fg-muted">
              He taught primary school for forty years in Enugu and led the church choir.
            </p>
            <p className="text-base text-fg">
              Only people you invite can see this memorial while it is private.
            </p>
            <p className="text-sm text-fg-subtle">Last edited 2 hours ago by the Olaleye Family.</p>
            <p className="font-mono text-[13px] text-fg-subtle">
              ceed3042 · 2026-08-26 · /joseph-olaleye
            </p>
          </div>
        </Bench>

        <Bench
          title="Buttons"
          note="Five variants, one weight, three sizes (sm 36 / md 44 / lg 48). Filled evergreen is the dominant action of a context."
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-end gap-3">
              <Button leadingIcon={<Plus />}>Publish memorial</Button>
              <Button variant="secondary">Preview</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="danger">Suspend memorial</Button>
              <IconButton aria-label="More">
                <MoreHorizontal />
              </IconButton>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Button size="sm">Small · 36</Button>
              <Button size="md">Default · 44</Button>
              <Button size="lg">Large · 48</Button>
              <Button loading>Publishing…</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
        </Bench>

        <Bench
          title="Form controls"
          note="Real labels, 2px evergreen focus, error state driven by aria-invalid."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              label="Their full name"
              required
              description="As it should appear on the memorial."
            >
              <Input defaultValue="Joseph Olayiwola Olaleye" />
            </FormField>
            <FormField
              label="Memorial address"
              required
              error="Use lowercase letters and hyphens only."
            >
              <Input defaultValue="joseph olaleye" />
            </FormField>
            <FormField label="Visibility">
              <Select defaultValue="private">
                <option value="public">Public — anyone can find it</option>
                <option value="link">Anyone with the link</option>
                <option value="private">Private — only people you invite</option>
              </Select>
            </FormField>
            <FormField label="A short line about them">
              <Textarea defaultValue="Teacher, matriarch, and lover of hymns." />
            </FormField>
          </div>
          <div className="mt-6 flex flex-wrap gap-8">
            <div className="flex flex-col gap-3">
              <Checkbox id="c1" defaultChecked label="List in the public directory" />
              <Checkbox id="c2" label="Allow search engines to index this page" />
            </div>
            <RadioGroup defaultValue="approve" className="flex flex-col gap-3">
              <Radio id="r1" value="approve" label="Tributes need my approval" />
              <Radio id="r2" value="auto" label="Tributes appear immediately" />
            </RadioGroup>
            <div className="flex flex-col gap-3">
              <Switch id="s1" defaultChecked label="Accepting tributes" />
              <Switch id="s2" label="Show the guestbook" />
            </div>
          </div>
        </Bench>

        <Bench
          title="Status & badges"
          note="One tone per state, mapped from the real enums. Never colour alone — a dot and the word carry it."
        >
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="published" />
            <StatusBadge status="draft" />
            <StatusBadge status="suspended" />
            <StatusBadge status="public" />
            <StatusBadge status="anyone_with_link" />
            <StatusBadge status="private" />
            <StatusBadge status="pending" />
            <StatusBadge status="approved" />
            <StatusBadge status="rejected" />
            <Badge tone="accent">Editorial accent</Badge>
          </div>
        </Bench>

        <Bench
          title="Cards & data"
          note="Not everything is a card. The stat that needs attention shifts colour, not just size."
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-3">
              <StatCard label="Published" value="18" hint="of 24 memorials" />
              <StatCard
                label="Awaiting review"
                value="5"
                tone="attention"
                hint="oldest 3 days ago"
              />
              <StatCard label="Open reports" value="2" tone="attention" hint="1 unassigned" />
              <StatCard label="Suspended" value="1" hint="impersonation" />
            </div>
            <Card className="max-w-sm">
              <CardHeader>
                <CardTitle>Family access</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-fg-muted">Three people can manage this memorial.</p>
              </CardBody>
              <CardFooter>
                <Button variant="secondary" size="sm">
                  Manage access
                </Button>
              </CardFooter>
            </Card>
            <TableWrap>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Status</Th>
                    <Th>Visibility</Th>
                    <Th>Address</Th>
                    <Th />
                  </Tr>
                </Thead>
                <Tbody>
                  {(
                    [
                      ["Joseph Olayiwola Olaleye", "published", "public", "/joseph-olaleye"],
                      ["Grace Adeyemi", "draft", "private", "—"],
                      ["Emmanuel Okonkwo", "suspended", "anyone_with_link", "/emmanuel-okonkwo"],
                    ] as const
                  ).map(([name, status, vis, addr]) => (
                    <Tr key={name}>
                      <Td className="font-medium text-fg">{name}</Td>
                      <Td>
                        <StatusBadge status={status} />
                      </Td>
                      <Td>
                        <StatusBadge status={vis} />
                      </Td>
                      <Td className="font-mono text-[12.5px]">{addr}</Td>
                      <Td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <IconButton aria-label="Row actions" variant="ghost" size="sm">
                              <MoreHorizontal />
                            </IconButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <ExternalLink /> Open memorial
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy /> Copy address
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem destructive>
                              <Trash2 /> Suspend
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableWrap>
          </div>
        </Bench>

        <Bench
          title="Navigation"
          note="Active state is unambiguous — evergreen with a 2px underline, never a faint shift."
        >
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="story">Their Story</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="tributes">Tributes</TabsTrigger>
              <TabsTrigger value="funeral">Funeral</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="pt-4 text-sm text-fg-muted">
              Panel for <span className="font-medium text-fg">{tab}</span>.
            </TabsContent>
          </Tabs>
          <div className="mt-6">
            <SectionHeader
              title="Section header"
              description="A lighter divider inside a page."
              action={
                <Button size="sm" variant="secondary">
                  Action
                </Button>
              }
            />
          </div>
        </Bench>

        <Bench title="Empty, loading, feedback" note="A blank region is a bug.">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-md border border-line bg-raised">
              <EmptyState
                icon={<Inbox />}
                title="No tributes awaiting review"
                description="When a visitor leaves a tribute it appears here for you to approve."
                action={
                  <Button variant="secondary" size="sm">
                    View published tributes
                  </Button>
                }
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-md border border-line bg-raised p-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-6 w-11" />
                <Skeleton className="mt-2 h-2.5 w-20" />
              </div>
              <div className="rounded-md border border-line bg-raised p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-6 w-10" />
                <Skeleton className="mt-2 h-2.5 w-16" />
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              onClick={() =>
                toast({
                  title: "Memorial published",
                  description: "Live at evermora.com/joseph-olaleye.",
                })
              }
            >
              Fire a toast
            </Button>
            <Tooltip content="Only staff can see this field">
              <IconButton aria-label="Help" variant="secondary" size="sm">
                <Bell />
              </IconButton>
            </Tooltip>
            <Avatar name="Olaleye Family" />
          </div>
        </Bench>

        <Bench
          title="Overlays"
          note="Radix-backed: focus trapped, Esc closes, trigger regains focus."
        >
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Open dialog</Button>
              </DialogTrigger>
              <DialogContent
                title="Copy the memorial link"
                description="Share this with family so they can view and add tributes."
                footer={
                  <>
                    <Button variant="ghost">Close</Button>
                    <Button leadingIcon={<Check />}>Copy link</Button>
                  </>
                }
              >
                <p className="font-mono text-[13px]">evermora.com/joseph-olaleye</p>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="danger" leadingIcon={<AlertTriangle />}>
                  Suspend memorial
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent
                title="Suspend this memorial?"
                description="Visitors will see a brief notice instead of the memorial. The family keeps their content and you can restore it at any time. This action is recorded in the audit log."
                confirmLabel="Suspend memorial"
                cancelLabel="Keep visible"
                onConfirm={() => toast({ title: "Memorial suspended", tone: "warning" })}
              />
            </AlertDialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" trailingIcon={<ChevronDown />}>
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>staff@evermora.test</DropdownMenuLabel>
                <DropdownMenuItem>Account settings</DropdownMenuItem>
                <DropdownMenuItem>Audit log</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Bench>
      </div>
    </>
  );
}
