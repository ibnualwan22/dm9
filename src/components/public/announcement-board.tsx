import { Pin, ExternalLink, Calendar } from "lucide-react";
import { formatDateID } from "@/lib/utils";

export interface AnnouncementItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  isImportant: boolean;
  attachmentUrl: string | null;
  createdAt: Date | string;
}

interface AnnouncementBoardProps {
  announcements: AnnouncementItem[];
}

export function AnnouncementBoard({ announcements }: AnnouncementBoardProps) {
  if (announcements.length === 0) {
    return (
      <div className="card-surface p-6 text-center text-sm text-ink-muted">
        Belum ada pengumuman resmi yang diterbitkan.
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {announcements.map((item) => (
        <article
          key={item.id}
          className={`rounded-2xl border p-5 backdrop-blur-md transition-colors ${
            item.isImportant
              ? "border-[#D97706]/35 bg-[#FFFFFC]/78"
              : "border-[#2A2622]/10 bg-[#FFFFFC]/65"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {item.isImportant ? (
                <span className="inline-flex items-center gap-1 rounded-lg border border-[#D97706]/30 bg-[#FFAE3F]/25 px-2.5 py-0.5 text-xs font-semibold text-[#2A2622]">
                  <Pin className="h-3 w-3 text-brand" />
                  <span>Penting</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg border border-[#2A2622]/10 bg-[#FFFFFC]/60 px-2.5 py-0.5 text-xs font-medium text-ink-secondary">
                  Informasi
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDateID(item.createdAt)}</span>
              </span>
            </div>

            {item.attachmentUrl && (
              <a
                href={item.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-hover underline-offset-4 hover:underline"
              >
                <span>Unduh Lampiran</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <h3 className="sonorous-display mt-2.5 text-xl font-normal text-[#2A2622]">
            {item.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary whitespace-pre-line max-w-prose">
            {item.content}
          </p>
        </article>
      ))}
    </div>
  );
}
