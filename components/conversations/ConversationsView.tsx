"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

interface ConversationListItem {
  id: string;
  startedAtUnixSecs: number | null;
  durationSecs: number | null;
  messageCount: number | null;
  status: string | null;
  successful: boolean | null;
  agentName: string | null;
  direction: string | null;
  summary: string | null;
  title: string | null;
  userIdentifier: string | null;
  channel: "whatsapp" | null;
  preview: string;
}

interface ConversationDetail {
  id: string;
  messages: { role: "user" | "agent"; message: string; timeInCallSecs: number | null }[];
}

interface ErrorBody {
  error?: string;
}

function formatDate(unixSeconds: number | null): string {
  if (unixSeconds === null) return "Ajankohta ei tiedossa";
  return new Intl.DateTimeFormat("fi-FI", {
    timeZone: "Europe/Helsinki",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixSeconds * 1000));
}

function directionLabel(direction: string | null): string | null {
  if (!direction) return null;
  const value = direction.toLowerCase();
  if (value === "inbound") return "Saapuva";
  if (value === "outbound") return "Lähtevä";
  return direction;
}

function StatusBadge({ status, successful }: { status: string | null; successful: boolean | null }) {
  const failed = successful === false || /fail|error/i.test(status ?? "");
  if (!failed) return null;
  return (
    <span className="rounded-full bg-danger-bg px-2 py-0.5 text-[11px] font-semibold text-danger-strong">
      {status && /fail|error/i.test(status) ? status : "Epäonnistui"}
    </span>
  );
}

function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: ConversationListItem[];
  selectedId: string | null;
  onSelect: (conversation: ConversationListItem) => void;
}) {
  return (
    <div className="divide-y divide-border-subtle">
      {conversations.map((conversation) => {
        const isSelected = conversation.id === selectedId;
        return (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation)}
            className={`w-full px-4 py-4 text-left transition-colors duration-150 ${
              isSelected ? "bg-accent-subtle" : "hover:bg-sand-100"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {conversation.userIdentifier ?? "WhatsApp-käyttäjä"}
                </p>
              </div>
              <StatusBadge status={conversation.status} successful={conversation.successful} />
            </div>
            <p className="mt-1.5 line-clamp-2 text-sm text-text-secondary">{conversation.preview}</p>
            <p className="mt-2 text-xs text-text-tertiary">{formatDate(conversation.startedAtUnixSecs)}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-medium text-text-tertiary">
              {conversation.channel === "whatsapp" && <span>WhatsApp</span>}
              {conversation.channel === "whatsapp" && directionLabel(conversation.direction) && <span>·</span>}
              {directionLabel(conversation.direction) && <span>{directionLabel(conversation.direction)}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ConversationDetailPanel({
  conversation,
  detail,
  loading,
  error,
  onBack,
}: {
  conversation: ConversationListItem | null;
  detail: ConversationDetail | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
}) {
  if (!conversation) {
    return (
      <div className="hidden min-h-[460px] items-center justify-center md:flex">
        <p className="text-sm text-text-tertiary">Valitse keskustelu listalta.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[460px]">
      <div className="flex items-start gap-3 border-b border-border-subtle px-5 py-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 md:hidden" aria-label="Takaisin listaan">
          <ArrowLeft size={17} />
        </Button>
        <div className="min-w-0">
          <h2 className="font-serif text-xl text-text-primary">
            {conversation.userIdentifier ?? "WhatsApp-käyttäjä"}
          </h2>
          <p className="mt-0.5 text-xs text-text-tertiary">{formatDate(conversation.startedAtUnixSecs)}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[360px] items-center justify-center gap-2 text-sm text-text-secondary">
          <LoaderCircle size={18} className="animate-spin" /> Ladataan keskustelua…
        </div>
      ) : error ? (
        <div className="m-5 rounded-md border border-danger-strong bg-danger-bg p-4 text-sm text-danger-strong">{error}</div>
      ) : detail?.messages.length ? (
        <div className="space-y-3 p-5">
          {detail.messages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <div key={`${message.timeInCallSecs ?? "message"}-${index}`} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-6 ${
                    isUser ? "bg-accent text-accent-foreground" : "bg-sand-200 text-text-primary"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[360px] items-center justify-center px-6 text-center text-sm text-text-secondary">
          Keskustelussa ei ole näytettäviä tekstiviestejä.
        </div>
      )}
    </div>
  );
}

export function ConversationsView() {
  const [conversations, setConversations] = useState<ConversationListItem[] | null>(null);
  const [selected, setSelected] = useState<ConversationListItem | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const response = await fetch("/api/conversations", { cache: "no-store" });
      const body = (await response.json()) as { conversations?: ConversationListItem[] } & ErrorBody;
      if (!response.ok) throw new Error(body.error ?? "Keskustelujen hakeminen epäonnistui.");
      const next = body.conversations ?? [];
      setConversations(next);
      setSelected((current) => current && next.find((item) => item.id === current.id) ? current : null);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Keskustelujen hakeminen epäonnistui.");
      setConversations(null);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const selectConversation = useCallback(async (conversation: ConversationListItem) => {
    setSelected(conversation);
    setDetail(null);
    setDetailError(null);
    setLoadingDetail(true);
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversation.id)}`, { cache: "no-store" });
      const body = (await response.json()) as { conversation?: ConversationDetail } & ErrorBody;
      if (!response.ok) throw new Error(body.error ?? "Keskustelun hakeminen epäonnistui.");
      setDetail(body.conversation ?? null);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Keskustelun hakeminen epäonnistui.");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const showDetailOnMobile = selected !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-text-primary">Keskustelut</h1>
          <p className="mt-1 text-text-secondary">ElevenLabs-agentin viimeisimmät keskustelut, vain luku.</p>
        </div>
        <Button variant="secondary" onClick={() => void loadConversations()} disabled={loadingList}>
          <RefreshCw size={16} className={loadingList ? "animate-spin" : undefined} /> Päivitä
        </Button>
      </div>

      {listError ? (
        <Card className="border-danger-strong bg-danger-bg">
          <p className="text-sm text-danger-strong">{listError}</p>
        </Card>
      ) : loadingList && conversations === null ? (
        <Card className="flex min-h-56 items-center justify-center gap-2 text-sm text-text-secondary">
          <LoaderCircle size={18} className="animate-spin" /> Ladataan keskusteluja…
        </Card>
      ) : conversations?.length === 0 ? (
        <EmptyState title="Ei keskusteluja" description="ElevenLabs-agentilta ei löytynyt vielä keskusteluja." />
      ) : conversations ? (
        <Card padded={false} className="overflow-hidden">
          <div className="grid min-h-[560px] md:grid-cols-[minmax(280px,38%)_minmax(0,1fr)]">
            <aside className={`border-r border-border-subtle ${showDetailOnMobile ? "hidden md:block" : "block"}`}>
              <ConversationList conversations={conversations} selectedId={selected?.id ?? null} onSelect={selectConversation} />
            </aside>
            <section className={`${showDetailOnMobile ? "block" : "hidden md:block"}`}>
              <ConversationDetailPanel
                conversation={selected}
                detail={detail}
                loading={loadingDetail}
                error={detailError}
                onBack={() => setSelected(null)}
              />
            </section>
          </div>
        </Card>
      ) : null}

      <p className="flex items-center gap-1.5 text-xs text-text-tertiary">
        <MessageCircle size={13} /> Keskusteluja ei vastata eikä WhatsApp-viestejä lähetetä tästä näkymästä.
      </p>
    </div>
  );
}
