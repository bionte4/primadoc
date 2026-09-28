"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  createPolicy,
  updatePolicy,
  type ActionState,
} from "@/actions/policies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { POLICY_CATEGORIES } from "@/lib/constants";
import { formatVersion, nextMajorVersion, nextMinorVersion } from "@/lib/version";
import {
  policyFormSchema,
  type PolicyFormValues,
} from "@/lib/validators/policy";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function PolicyForm({
  mode,
  policyId,
  defaultValues,
  currentFileName,
  currentVersion,
}: {
  mode: "create" | "edit";
  policyId?: string;
  defaultValues?: PolicyFormValues;
  currentFileName?: string | null;
  currentVersion?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [versionBump, setVersionBump] = useState<"minor" | "major">("minor");
  const action =
    mode === "create" ? createPolicy : updatePolicy.bind(null, policyId ?? "");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: defaultValues ?? {
      title: "",
      documentNumber: "",
      category: "Umum",
      description: "",
    },
  });

  function onSubmit(values: PolicyFormValues) {
    const file = fileRef.current?.files?.[0];
    if (mode === "create" && (!file || file.size === 0)) {
      setFileError("Lampirkan berkas kebijakan.");
      return;
    }
    setFileError(null);

    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("documentNumber", values.documentNumber);
    formData.set("category", values.category);
    formData.set("description", values.description);
    if (mode === "edit") formData.set("versionBump", versionBump);
    if (file && file.size > 0) formData.set("file", file);
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Judul</Label>
          <Input id="title" className="h-9" {...form.register("title")} />
          <FieldError message={form.formState.errors.title?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="documentNumber">Nomor dokumen</Label>
          <Input
            id="documentNumber"
            className="h-9 uppercase"
            placeholder="POL-SDM-001"
            {...form.register("documentNumber")}
          />
          <FieldError message={form.formState.errors.documentNumber?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Kategori</Label>
          <select id="category" className={fieldClass} {...form.register("category")}>
            {POLICY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <FieldError message={form.formState.errors.category?.message} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Deskripsi</Label>
          <Textarea
            id="description"
            className="min-h-24"
            {...form.register("description")}
          />
          <FieldError message={form.formState.errors.description?.message} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="file">Berkas</Label>
          <Input
            id="file"
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
            className="h-10 pt-1.5"
          />
          <p className="text-xs text-muted-foreground">
            PDF, DOC, DOCX, PNG, atau JPG. Maksimal 10 MB.
            {currentFileName ? ` Berkas saat ini: ${currentFileName}.` : ""}
          </p>
          <FieldError message={fileError} />
        </div>
        {mode === "edit" && currentVersion && (
          <fieldset className="space-y-1.5 sm:col-span-2">
            <legend className="text-sm font-medium">Versi baru</legend>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="radio"
                name="versionBump"
                value="minor"
                checked={versionBump === "minor"}
                onChange={() => setVersionBump("minor")}
              />
              Minor, {formatVersion(currentVersion)} menjadi {formatVersion(nextMinorVersion(currentVersion))}
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="radio"
                name="versionBump"
                value="major"
                checked={versionBump === "major"}
                onChange={() => setVersionBump("major")}
              />
              Mayor, {formatVersion(currentVersion)} menjadi {formatVersion(nextMajorVersion(currentVersion))}
            </label>
          </fieldset>
        )}
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : mode === "create" ? "Simpan draf" : "Simpan perubahan"}
      </Button>
    </form>
  );
}

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}
