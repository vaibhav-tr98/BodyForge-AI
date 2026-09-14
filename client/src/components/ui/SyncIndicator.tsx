import { useState, useRef, useEffect } from "react";
import { useSyncStatus, retryFailedMutations } from "../../lib/syncQueue";
import { CloudOff, RefreshCw, AlertTriangle, CloudRain } from "lucide-react";

export default function SyncIndicator() {
  const status = useSyncStatus();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Determine state priority: CONFLICT > FAILED > SYNCING > OFFLINE > ONLINE
  const hasConflict = status.conflictCount > 0;
  const hasFailed = status.failedCount > 0;
  const hasPending = status.pendingCount > 0;
  const isSyncing = status.isSyncing;
  const isOffline = !status.isOnline;

  const isIdleOnline = !hasConflict && !hasFailed && !isSyncing && !isOffline && !hasPending;

  // Don't render anything if everything is fine and idle
  if (isIdleOnline) {
    return null;
  }

  let Icon = RefreshCw;
  let iconClass = "text-slate-400";
  let label = "Sync Status";

  if (hasConflict || hasFailed) {
    Icon = AlertTriangle;
    iconClass = "text-red-400";
    label = hasConflict ? "Sync conflict" : "Sync failed";
  } else if (isSyncing) {
    Icon = RefreshCw;
    iconClass = "text-cyan-400 animate-spin";
    label = "Syncing";
  } else if (isOffline) {
    Icon = CloudOff;
    iconClass = "text-amber-400";
    label = "Offline";
  } else if (hasPending) {
    Icon = CloudRain; // Use something to indicate waiting to sync
    iconClass = "text-slate-300";
    label = "Pending sync";
  }

  return (
    <div className="relative flex items-center" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-11 w-11 items-center justify-center rounded-lg transition hover:bg-slate-800 ${
          isOpen ? "bg-slate-800" : ""
        }`}
        aria-label={label}
        aria-expanded={isOpen}
      >
        <Icon size={20} className={iconClass} />
        <span className="sr-only" aria-live="polite">
          {label}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-xl z-50">
          <h3 className="mb-2 text-sm font-semibold text-white">Sync Status</h3>
          
          <div className="flex flex-col gap-2 text-sm text-slate-300">
            {isOffline && (
              <p className="flex items-center gap-2">
                <CloudOff size={16} className="text-amber-400" />
                Offline. Changes are being saved locally.
              </p>
            )}
            
            {isSyncing && (
              <p className="flex items-center gap-2">
                <RefreshCw size={16} className="animate-spin text-cyan-400" />
                Synchronizing offline workout changes.
              </p>
            )}

            {!isSyncing && hasPending && (
              <p>
                {status.pendingCount} workout change(s) waiting to sync.
              </p>
            )}

            {hasFailed && (
              <div className="mt-1 rounded-lg bg-red-950/50 p-3 text-red-200">
                <p className="mb-2 font-medium flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  {status.failedCount} workout(s) failed to sync.
                </p>
                <button
                  onClick={() => {
                    retryFailedMutations();
                    setIsOpen(false);
                  }}
                  className="w-full rounded bg-red-900/50 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800/80 transition"
                >
                  Retry Sync
                </button>
              </div>
            )}

            {hasConflict && (
              <div className="mt-1 rounded-lg bg-red-950/50 p-3 text-red-200 border border-red-900/50">
                <p className="font-medium flex items-center gap-2 mb-1">
                  <AlertTriangle size={16} className="text-red-400" />
                  {status.conflictCount} workout(s) have conflicts.
                </p>
                <p className="text-xs opacity-80">
                  Please go to the affected workout session to resolve it.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
