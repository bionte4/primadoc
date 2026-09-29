"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useMemo, useRef, useState } from "react";
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
import { useI18n } from "@/components/i18n-provider";
import { POLICY_CATEGORIES } from "@/lib/constants";
import type { DepartmentLabels } from "@/lib/department-labels";
import { DEPARTMENTS, parentTypeFor, POLICY_TYPES } from "@/lib/document-kind";
import { categoryLabel, fill } from "@/lib/i18n/labels";
import { formatVersion, nextMajorVersion, nextMinorVersion } from "@/lib/version";
import type { Department, PolicyType } from "@prisma/client";
import {
  createPolicyFormSchema,
  type PolicyFormValues,
} from "@/lib/validators/policy";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type ParentChoice = {
  id: string;
  title: string;
  documentNumber: string;
  type: PolicyType;
  department: Department;
  category: string;
};

export function PolicyForm({
  mode,
  policyId,
  defaultValues,
  currentFileName,
  currentVersion,
  parents = [],
  lockType = false,
  departmentLabels,
}: {
  mode: "create" | "edit";
  policyId?: string;
  defaultValues?: PolicyFormValues;
  currentFileName?: string | null;
  currentVersion?: string;
  parents?: ParentChoice[];
  lockType?: boolean;
  departmentLabels?: DepartmentLabels;
}) {
  const { t } = useI18n();
  const schema = useMemo(() => createPolicyFormSchema(t.validation), [t]);
  const names = departmentLabels ?? t.department;
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
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {
      title: "",
      documentNumber: "",
      category: "Umum",
      department: "CORP",
      description: "",
      type: "POLICY",
      parentId: "",
      expiresAt: "",
    },
  });
  const documentType = form.watch("type");
  const selectedParentId = form.watch("parentId");
  const isChild = documentType !== "POLICY";
  const neededParent = parentTypeFor(documentType);
  const parentOptions = parents.filter((parent) => parent.type === neededParent);

  function onSubmit(values: PolicyFormValues) {
    const file = fileRef.current?.files?.[0];
    if (mode === "create" && (!file || file.size === 0)) {
      setFileError(t.form.fileRequired);
      return;
    }
    setFileError(null);

    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("documentNumber", form.getValues("documentNumber") ?? "");
    formData.set("category", form.getValues("category"));
    formData.set("department", form.getValues("department"));
    formData.set("description", values.description);
    formData.set("expiresAt", values.expiresAt ?? "");
    formData.set("type", form.getValues("type"));
    const parentId = form.getValues("parentId");
    if (parentId) formData.set("parentId", parentId);
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
          <Label htmlFor="title">{t.form.title}</Label>
          <Input id="title" className="h-9" {...form.register("title")} />
          <FieldError message={form.formState.errors.title?.message} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="type">{t.form.type}</Label>
          <select
            id="type"
            className={fieldClass}
            disabled={lockType}
            {...form.register("type", {
              onChange: () => {
                form.setValue("parentId", "");
              },
            })}
          >
            {POLICY_TYPES.map((item) => (
              <option key={item} value={item}>
                {t.tier[item]}
              </option>
            ))}
          </select>
          <FieldError message={form.formState.errors.type?.message} />
        </div>
        {isChild && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="parentId">{t.form.parent}</Label>
            <select
              id="parentId"
              className={fieldClass}
              {...form.register("parentId", {
                onChange: (event) => {
                  const parent = parentOptions.find((item) => item.id === event.target.value);
                  if (
                    parent &&
                    POLICY_CATEGORIES.includes(parent.category as (typeof POLICY_CATEGORIES)[number])
                  ) {
                    form.setValue("category", parent.category as PolicyFormValues["category"]);
                  }
                  if (parent) form.setValue("department", parent.department);
                },
              })}
            >
              <option value="">{t.form.chooseParent}</option>
              {parentOptions.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.documentNumber} · {parent.title}
                </option>
              ))}
              {selectedParentId &&
                !parentOptions.some((parent) => parent.id === selectedParentId) && (
                  <option value={selectedParentId}>{t.form.currentParent}</option>
                )}
            </select>
            <p className="text-[11px] text-muted-foreground">
              {documentType === "PROCEDURE" ? t.form.procedureHint : t.form.guideHint}
            </p>
            <FieldError message={form.formState.errors.parentId?.message} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="department">{t.form.department}</Label>
          <select
            id="department"
            className={fieldClass}
            disabled={isChild}
            {...form.register("department")}
          >
            {DEPARTMENTS.map((item) => (
              <option key={item} value={item}>
                {names[item]}
              </option>
            ))}
          </select>
          {isChild && (
            <p className="text-[11px] text-muted-foreground">{t.form.departmentFollows}</p>
          )}
          <FieldError message={form.formState.errors.department?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="documentNumber">{t.form.number}</Label>
          {mode === "create" ? (
            <p id="documentNumber" className="flex h-9 items-center text-sm text-muted-foreground">
              {t.form.numberAuto}
            </p>
          ) : (
            <Input
              id="documentNumber"
              className="h-9"
              readOnly
              {...form.register("documentNumber")}
            />
          )}
          <FieldError message={form.formState.errors.documentNumber?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">{t.form.category}</Label>
          <select
            id="category"
            className={fieldClass}
            disabled={isChild}
            {...form.register("category")}
          >
            {POLICY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category, t)}
              </option>
            ))}
          </select>
          <FieldError message={form.formState.errors.category?.message} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">{t.form.description}</Label>
          <Textarea
            id="description"
            className="min-h-24"
            {...form.register("description")}
          />
          <FieldError message={form.formState.errors.description?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiresAt">{t.form.expires}</Label>
          <Input id="expiresAt" type="date" className="h-9" {...form.register("expiresAt")} />
          <p className="text-[11px] text-muted-foreground">{t.form.expiresHint}</p>
          <FieldError message={form.formState.errors.expiresAt?.message} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="file">{t.form.file}</Label>
          <Input
            id="file"
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
            className="h-10 pt-1.5"
          />
          <p className="text-xs text-muted-foreground">
            {t.form.fileHint}
            {currentFileName ? ` ${fill(t.form.currentFile, { name: currentFileName })}` : ""}
          </p>
          <FieldError message={fileError} />
        </div>
        {mode === "edit" && currentVersion && (
          <fieldset className="space-y-1.5 sm:col-span-2">
            <legend className="text-sm font-medium">{t.form.newVersion}</legend>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="radio"
                name="versionBump"
                value="minor"
                checked={versionBump === "minor"}
                onChange={() => setVersionBump("minor")}
              />
              {fill(t.form.minor, {
                from: formatVersion(currentVersion),
                to: formatVersion(nextMinorVersion(currentVersion)),
              })}
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="radio"
                name="versionBump"
                value="major"
                checked={versionBump === "major"}
                onChange={() => setVersionBump("major")}
              />
              {fill(t.form.major, {
                from: formatVersion(currentVersion),
                to: formatVersion(nextMajorVersion(currentVersion)),
              })}
            </label>
          </fieldset>
        )}
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? t.common.saving : mode === "create" ? t.form.saveDraft : t.form.saveChanges}
      </Button>
    </form>
  );
}

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}
