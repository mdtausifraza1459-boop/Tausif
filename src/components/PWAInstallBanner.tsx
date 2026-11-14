import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { Smartphone, Share, X, WifiOff } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { canPromptInstall, isIOS, promptInstall } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  return (
    <>
      {!isOnline && (
        <div className="bg-[#92400E] text-white px-4 py-1.5 text-[11px] font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are viewing Zohra Luxe offline. Saved catalog browsing remains available.</span>
        </div>
      )}

      {!dismissed && (canPromptInstall || isIOS) && (
        <div className="bg-[#ECF4F1] border-b border-[#164E3F]/20 px-4 py-2 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-[#141413] min-w-0">
            <Smartphone className="w-4 h-4 text-[#164E3F] shrink-0" />
            {canPromptInstall ? (
              <span className="truncate">
                Install <strong>Zohra Luxe</strong> App for faster browsing &amp; instant order alerts.
              </span>
            ) : (
              <span className="truncate flex items-center gap-1">
                Install on iPhone: Tap <Share className="w-3.5 h-3.5 inline text-[#164E3F]" /> then{' '}
                <strong>Add to Home Screen</strong>.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canPromptInstall && (
              <button
                type="button"
                onClick={promptInstall}
                className="px-3 py-1 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-[11px] font-semibold rounded cursor-pointer"
              >
                Install App
              </button>
            )}
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss install banner"
              className="p-1 text-[#63615C] hover:text-[#141413] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
