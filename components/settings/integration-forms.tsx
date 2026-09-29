"use client";

import { useActionState, useState } from "react";
import { saveAi, saveSmtp, testAi, testSmtp, type IntegrationState } from "@/actions/integrations";
import { AI_PROVIDERS, defaultModel, modelIds, OLLAMA_DEFAULT_BASE, type AiProvider } from "@/lib/ai-providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";

const fieldClass = "h-8";
const selectClass =
  "h-8 w-full min-w-0 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function SmtpIntegrationForm({
  host,
  port,
  secure,
  user,
  from,
  passwordSet,
}: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  from: string;
  passwordSet: boolean;
}) {
  const [saveState, saveAction, savePending] = useActionState<IntegrationState, FormData>(saveSmtp, {});
  const [testState, testAction, testPending] = useActionState<IntegrationState, FormData>(testSmtp, {});
  const pending = savePending || testPending;
  const { t } = useI18n();

  return (
    <form className="grid gap-2">
      <Field label={t.integrations.host} id="smtp-host">
        <Input id="smtp-host" name="host" defaultValue={host} autoComplete="off" className={fieldClass} required />
      </Field>
      <div className="grid grid-cols-[7rem_1fr] gap-2">
        <Field label={t.integrations.port} id="smtp-port">
          <Input id="smtp-port" name="port" type="number" min={1} max={65535} defaultValue={port} className={fieldClass} required />
        </Field>
        <label className="mt-6 flex items-center gap-2 text-sm">
          <input type="checkbox" name="secure" defaultChecked={secure} className="size-4 accent-primary" />
          {t.integrations.secure}
        </label>
      </div>
      <Field label={t.integrations.user} id="smtp-user">
        <Input id="smtp-user" name="user" defaultValue={user} autoComplete="off" className={fieldClass} />
      </Field>
      <Field label={t.integrations.from} id="smtp-from">
        <Input id="smtp-from" name="from" type="email" defaultValue={from} autoComplete="off" className={fieldClass} />
      </Field>
      <Field label={t.integrations.password} id="smtp-password">
        <Input
          id="smtp-password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder={passwordSet ? t.integrations.passwordKept : t.integrations.passwordEmpty}
          className={fieldClass}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" formAction={saveAction} disabled={pending}>
          {savePending ? t.common.saving : t.common.save}
        </Button>
        <Button type="submit" size="sm" variant="outline" formAction={testAction} disabled={pending}>
          {testPending ? t.integrations.testing : t.integrations.test}
        </Button>
      </div>
      <FormNotice state={saveState} />
      <FormNotice state={testState} />
    </form>
  );
}

export function AiIntegrationForm({
  provider,
  model,
  baseUrl,
  keySet,
}: {
  provider: AiProvider;
  model: string;
  baseUrl: string;
  keySet: boolean;
}) {
  const [saveState, saveAction, savePending] = useActionState<IntegrationState, FormData>(saveAi, {});
  const [testState, testAction, testPending] = useActionState<IntegrationState, FormData>(testAi, {});
  const pending = savePending || testPending;
  const { t } = useI18n();
  const [providerValue, setProviderValue] = useState(provider);
  const [modelValue, setModelValue] = useState(model);
  const [baseValue, setBaseValue] = useState(baseUrl || OLLAMA_DEFAULT_BASE);
  const choices = modelIds(providerValue);
  const modelOptions = choices.includes(modelValue) || providerValue === "ollama" ? choices : [modelValue, ...choices];
  const modelLabels: Record<string, string> = {
    "gemini-3.8-flash": t.integrations.geminiFlash,
    "gpt-4o-mini": t.integrations.gptMini,
    "llama-3.3-70b-versatile": t.integrations.llama70,
    "llama-3.1-8b-instant": t.integrations.llama8,
  };

  function changeProvider(next: AiProvider) {
    setProviderValue(next);
    setModelValue(defaultModel(next));
    if (next === "ollama" && !baseValue.trim()) setBaseValue(OLLAMA_DEFAULT_BASE);
  }

  return (
    <form className="grid gap-2">
      <Field label={t.integrations.provider} id="ai-provider">
        <select
          id="ai-provider"
          name="provider"
          value={providerValue}
          onChange={(event) => changeProvider(event.target.value as AiProvider)}
          className={selectClass}
        >
          {AI_PROVIDERS.map((item) => (
            <option key={item} value={item}>
              {t.integrations.providerName[item]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={providerValue === "ollama" ? t.integrations.localModel : t.integrations.model} id="openai-model">
        {providerValue === "ollama" ? (
          <Input
            id="openai-model"
            name="model"
            value={modelValue}
            onChange={(event) => setModelValue(event.target.value)}
            autoComplete="off"
            className={fieldClass}
            required
          />
        ) : (
          <select id="openai-model" name="model" value={modelValue} onChange={(event) => setModelValue(event.target.value)} className={selectClass}>
            {modelOptions.map((item) => (
              <option key={item} value={item}>
                {modelLabels[item] ?? item}
              </option>
            ))}
          </select>
        )}
      </Field>
      {providerValue === "ollama" ? (
        <Field label={t.integrations.baseUrl} id="ai-base-url">
          <Input
            id="ai-base-url"
            name="baseUrl"
            value={baseValue}
            onChange={(event) => setBaseValue(event.target.value)}
            autoComplete="off"
            className={fieldClass}
          />
        </Field>
      ) : (
        <input type="hidden" name="baseUrl" value={baseValue} />
      )}
      {providerValue === "ollama" ? <p className="text-xs text-muted-foreground">{t.integrations.ollamaHint}</p> : null}
      <Field label={t.integrations.apiKey} id="openai-key">
        <Input
          id="openai-key"
          name="apiKey"
          type="password"
          autoComplete="new-password"
          placeholder={keySet ? t.integrations.passwordKept : providerValue === "ollama" ? t.integrations.keyOptional : undefined}
          className={fieldClass}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" formAction={saveAction} disabled={pending}>
          {savePending ? t.common.saving : t.common.save}
        </Button>
        <Button type="submit" size="sm" variant="outline" formAction={testAction} disabled={pending}>
          {testPending ? t.integrations.testing : t.integrations.test}
        </Button>
      </div>
      <FormNotice state={saveState} />
      <FormNotice state={testState} />
    </form>
  );
}

function FormNotice({ state }: { state: IntegrationState }) {
  if (state.error) {
    return (
      <p className="text-xs text-destructive" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.ok) return <p className="text-xs text-muted-foreground">{state.ok}</p>;
  return null;
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
