"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Checkbox,
  CardBody,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Radio,
  RadioGroup,
  Textarea,
} from "@evermora/ui";
import type { MemorialGender } from "@evermora/types";
import { updateMemorialProfileAction } from "@/lib/actions/memorials";
import { FormError } from "@/components/form";
import type { MemorialProfile } from "@/lib/data/memorials";

type Fields = {
  fullName: string;
  preferredName: string;
  headline: string;
  survivedBy: string;
  /** "" = not set / prefer not to say. */
  gender: MemorialGender | "";
  biographySummary: string;
  dateOfBirth: string;
  /** Only the birth year is known; `birthYear` is edited instead of the date. */
  birthYearOnly: boolean;
  birthYear: string;
  dateOfDeath: string;
  birthPlace: string;
  restingPlace: string;
};

function toFields(p: MemorialProfile): Fields {
  return {
    fullName: p.fullName,
    preferredName: p.preferredName ?? "",
    headline: p.headline ?? "",
    survivedBy: p.survivedBy ?? "",
    gender: p.gender ?? "",
    biographySummary: p.biographySummary ?? "",
    dateOfBirth: p.birthYearOnly ? "" : (p.dateOfBirth ?? ""),
    birthYearOnly: p.birthYearOnly,
    birthYear: p.birthYearOnly && p.dateOfBirth ? p.dateOfBirth.slice(0, 4) : "",
    dateOfDeath: p.dateOfDeath ?? "",
    birthPlace: p.birthPlace ?? "",
    restingPlace: p.restingPlace ?? "",
  };
}

export function EditProfileForm({
  memorialId,
  profile,
}: {
  memorialId: string;
  profile: MemorialProfile;
}) {
  const router = useRouter();
  const initial = toFields(profile);
  const [fields, setFields] = useState<Fields>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = (Object.keys(fields) as (keyof Fields)[]).some((k) => fields[k] !== initial[k]);

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (fields.fullName.trim().length === 0) {
      setError("A name is required.");
      return;
    }
    if (fields.birthYearOnly && fields.birthYear && !/^\d{4}$/.test(fields.birthYear)) {
      setError("Enter the year of birth as four digits, e.g. 1947.");
      return;
    }
    startTransition(async () => {
      const res = await updateMemorialProfileAction({
        memorialId,
        fullName: fields.fullName.trim(),
        preferredName: fields.preferredName.trim(),
        headline: fields.headline.trim(),
        survivedBy: fields.survivedBy.trim(),
        gender: fields.gender === "" ? null : fields.gender,
        biographySummary: fields.biographySummary.trim(),
        dateOfBirth: fields.birthYearOnly
          ? fields.birthYear
            ? `${fields.birthYear}-01-01`
            : null
          : fields.dateOfBirth || null,
        birthYearOnly: fields.birthYearOnly,
        dateOfDeath: fields.dateOfDeath || null,
        birthPlace: fields.birthPlace.trim(),
        restingPlace: fields.restingPlace.trim(),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error.message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <FormError message={error} />

      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          <FormField label="Full name" required>
            <Input
              value={fields.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              required
            />
          </FormField>
          <FormField
            label="Preferred name"
            description="What most people called them, if different."
          >
            <Input
              value={fields.preferredName}
              onChange={(e) => set("preferredName", e.target.value)}
            />
          </FormField>
          <FormField
            label="A short line about them"
            description={"e.g. “Teacher, gardener, grandmother of nine.”"}
          >
            <Input
              value={fields.headline}
              onChange={(e) => set("headline", e.target.value)}
              maxLength={500}
            />
          </FormField>
          <FormField
            label="Survived by"
            description={'e.g. "Wives, Children, Grand Children, and Great Grand Children."'}
          >
            <Input
              value={fields.survivedBy}
              onChange={(e) => set("survivedBy", e.target.value)}
              maxLength={500}
            />
          </FormField>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-[13.5px] font-semibold text-fg">Gender</legend>
            <p className="text-[12.5px] text-fg-subtle">
              Optional — used only to phrase the tribute form naturally (e.g. “How you knew him”).
            </p>
            <RadioGroup
              value={fields.gender === "" ? "unset" : fields.gender}
              onValueChange={(v) => set("gender", v === "unset" ? "" : (v as MemorialGender))}
              className="mt-1 flex flex-wrap gap-x-6 gap-y-2"
            >
              <Radio id="gender-male" value="male" label="Male" />
              <Radio id="gender-female" value="female" label="Female" />
              <Radio id="gender-unset" value="unset" label="Prefer not to say" />
            </RadioGroup>
          </fieldset>
          <FormField
            label="A few sentences"
            description={'You can write the full story later in "Their story".'}
          >
            <Textarea
              value={fields.biographySummary}
              onChange={(e) => set("biographySummary", e.target.value)}
              rows={4}
              maxLength={2000}
            />
          </FormField>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dates &amp; places</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            {fields.birthYearOnly ? (
              <FormField label="Year of birth">
                <Input
                  inputMode="numeric"
                  placeholder="e.g. 1947"
                  maxLength={4}
                  value={fields.birthYear}
                  onChange={(e) => set("birthYear", e.target.value.replace(/\D/g, ""))}
                />
              </FormField>
            ) : (
              <FormField label="Date of birth">
                <Input
                  type="date"
                  value={fields.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                />
              </FormField>
            )}
            <Checkbox
              id="birth-year-only"
              label="I only know the year"
              checked={fields.birthYearOnly}
              onCheckedChange={(c) => {
                const yearOnly = c === true;
                setFields((f) => ({
                  ...f,
                  birthYearOnly: yearOnly,
                  // Carry the year across so switching modes doesn't lose it.
                  birthYear: yearOnly ? f.dateOfBirth.slice(0, 4) || f.birthYear : f.birthYear,
                }));
                setSaved(false);
              }}
            />
          </div>
          <FormField label="Date of death">
            <Input
              type="date"
              value={fields.dateOfDeath}
              onChange={(e) => set("dateOfDeath", e.target.value)}
            />
          </FormField>
          <FormField label="Place of birth">
            <Input value={fields.birthPlace} onChange={(e) => set("birthPlace", e.target.value)} />
          </FormField>
          <FormField label="Resting place" description="Often kept members-only in Privacy.">
            <Input
              value={fields.restingPlace}
              onChange={(e) => set("restingPlace", e.target.value)}
            />
          </FormField>
        </CardBody>
      </Card>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 rounded-lg border border-line bg-raised/95 px-4 py-3 shadow-e2 backdrop-blur-sm">
        <p className="text-[13px] text-fg-subtle" role="status">
          {pending
            ? "Saving…"
            : dirty
              ? "You have unsaved changes"
              : saved
                ? "Saved."
                : "All changes saved"}
        </p>
        <div className="flex items-center gap-2">
          {dirty && !pending ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFields(initial);
                setError(null);
              }}
            >
              Discard
            </Button>
          ) : null}
          <Button type="submit" size="sm" loading={pending} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </div>
    </form>
  );
}
