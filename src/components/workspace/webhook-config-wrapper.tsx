"use client";

import dynamic from "next/dynamic";
import { useColunas } from "@/hooks/use-colunas";

const RepoWebhookConfig = dynamic(
  () =>
    import("@/components/workspace/repo-webhook-config").then(
      (m) => m.RepoWebhookConfig
    ),
  { ssr: false }
);

interface WebhookConfigWrapperProps {
  repoId: string;
  repoDb: {
    webhook_secret?: string | null;
    coluna_review_id?: string | null;
    coluna_done_id?: string | null;
    coluna_doing_id?: string | null;
  };
  sprintId: string | undefined;
  workspaceId: string;
}

export function WebhookConfigWrapper({
  repoId,
  repoDb,
  sprintId,
  workspaceId,
}: WebhookConfigWrapperProps) {
  const { colunas } = useColunas(sprintId ?? "");

  return (
    <div
      className="max-w-xl rounded-[var(--tf-radius-md)] p-5"
      style={{
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-border)",
      }}
    >
      {!sprintId ? (
        <p
          className="text-xs"
          style={{ color: "var(--tf-text-secondary)" }}
        >
          Crie um sprint primeiro para poder configurar as colunas do webhook.
        </p>
      ) : (
        <RepoWebhookConfig
          repoId={repoId}
          workspaceId={workspaceId}
          colunas={colunas}
          webhookSecret={repoDb.webhook_secret ?? null}
          colunaReviewId={repoDb.coluna_review_id ?? null}
          colunaDoneId={repoDb.coluna_done_id ?? null}
          colunaDoingId={repoDb.coluna_doing_id ?? null}
          onSalvar={() => {}}
        />
      )}
    </div>
  );
}
