import React, { useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import {
  Volume2,
  Copy,
  Check,
  Send,
  MessageSquare,
  Sparkles,
  Cpu,
  CornerDownRight,
  ExternalLink,
} from "lucide-react";

interface ChatHUDProps {
  messages: ChatMessage[];
  onReplayVoice: (text: string) => void;
  onExecuteQuickAction?: (actionType: string, details: any) => void;
  onClearChat: () => void;
}

export const ChatHUD: React.FC<ChatHUDProps> = ({
  messages,
  onReplayVoice,
  onClearChat,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
      {/* HUD Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            Vani Terminal & Command Feed
          </span>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-mono">
            en-IN
          </span>
        </div>

        <button
          onClick={onClearChat}
          className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-800/60 font-mono"
        >
          Clear Feed
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500 space-y-2">
            <Sparkles className="w-8 h-8 text-amber-400/40 animate-pulse" />
            <p className="text-sm font-medium text-slate-400">
              Bharat Vani is standing by for your command.
            </p>
            <p className="text-xs text-slate-500 max-w-sm">
              Speak or type <span className="text-amber-400 font-semibold">"Hey Vani, open Chrome"</span> or{" "}
              <span className="text-amber-400 font-semibold">"Take a screenshot"</span> to begin.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === "user";

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-full`}
              >
                {/* Sender badge & timestamp */}
                <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-mono text-slate-400">
                  {isUser ? (
                    <>
                      <span>{msg.timestamp}</span>
                      <span className="font-semibold text-sky-400">You 🇮🇳</span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-amber-400">
                        Bharat Vani 🤖
                      </span>
                      {msg.engine && (
                        <span className="text-[10px] text-slate-500 px-1.5 py-0.2 rounded bg-slate-800/80 border border-slate-700/50">
                          {msg.engine}
                        </span>
                      )}
                      <span>{msg.timestamp}</span>
                    </>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`group relative max-w-[88%] rounded-xl px-4 py-3 text-sm shadow-md transition-all ${
                    isUser
                      ? "bg-gradient-to-br from-sky-950/80 to-blue-900/60 border border-sky-600/40 text-sky-50 rounded-tr-none"
                      : "bg-gradient-to-br from-slate-900/90 to-slate-800/70 border border-slate-700/70 text-slate-100 rounded-tl-none"
                  }`}
                >
                  {/* Action Badge if an action was executed */}
                  {msg.isAction && msg.actionType && (
                    <div className="mb-2 flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
                      <Cpu className="w-3.5 h-3.5 text-amber-400" />
                      <span className="uppercase font-bold">Action Dispatched:</span>
                      <span className="font-medium text-amber-200">
                        {msg.actionType.replace("_", " ")}
                      </span>
                      {msg.actionDetails?.target && (
                        <span className="text-slate-400">
                          → {msg.actionDetails.target}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </div>

                  {/* WhatsApp Specific Interactive Link Preview */}
                  {msg.actionType === "whatsapp_message" && msg.actionDetails && (
                    <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between gap-2">
                      <div className="truncate">
                        <span className="font-bold text-emerald-400">WhatsApp Dispatch: </span>
                        <span>"{msg.actionDetails.message}" to <strong>{msg.actionDetails.target}</strong></span>
                      </div>
                      <button
                        onClick={() => {
                          fetch("/api/system/launch-app", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              target: "whatsapp",
                              message: msg.actionDetails.message || "Hi",
                              recipient: msg.actionDetails.target,
                            }),
                          }).catch(() => {
                            window.location.href = `whatsapp://send?text=${encodeURIComponent(
                              msg.actionDetails.message || "Hi"
                            )}`;
                          });
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shrink-0 cursor-pointer transition-colors"
                      >
                        <span>Open WhatsApp</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Calendar Event Preview */}
                  {msg.actionType === "add_calendar_event" && msg.actionDetails && (
                    <div className="mt-3 p-2.5 rounded-lg bg-sky-950/60 border border-sky-500/30 text-sky-200 text-xs flex items-center justify-between gap-2 font-mono">
                      <div>
                        <span className="font-bold text-sky-400">📅 Calendar Scheduled: </span>
                        <span>{msg.actionDetails.eventTitle || "Meeting"} ({msg.actionDetails.eventDate || "today"} at {msg.actionDetails.eventTime || "15:00"})</span>
                      </div>
                      <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/30">
                        Synced (.ICS ready)
                      </span>
                    </div>
                  )}

                  {/* Voice Reminder Preview */}
                  {msg.actionType === "set_reminder" && msg.actionDetails && (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2 font-mono">
                      <div>
                        <span className="font-bold text-amber-400">⏰ Alarm Scheduled: </span>
                        <span>"{msg.actionDetails.reminderText}" at {msg.actionDetails.reminderTime}</span>
                      </div>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                        Active Alert
                      </span>
                    </div>
                  )}

                  {/* Actions & Utilities on Hover */}
                  {!isUser && (
                    <div className="mt-2 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        {msg.spokenResponse && (
                          <button
                            onClick={() => onReplayVoice(msg.spokenResponse || msg.text)}
                            className="flex items-center gap-1 hover:text-amber-300 transition-colors"
                            title="Replay Voice (Windows SAPI)"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Speak Voice</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="flex items-center gap-1 hover:text-slate-200 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
