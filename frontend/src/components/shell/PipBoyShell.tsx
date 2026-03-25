import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import CrtOverlay from './CrtOverlay';
import StatusBar from './StatusBar';
import SideNav from './SideNav';
import BootScreen from './BootScreen';

export default function PipBoyShell() {
  const [booted, setBooted] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="h-dvh p-2 md:p-4">
      <div
        className="relative w-full h-full flex flex-col border-[3px] border-[var(--pip-primary)] rounded-2xl overflow-hidden crt-power-on"
        style={{ boxShadow: '0 0 30px rgba(255,213,44,0.12), inset 0 0 60px rgba(0,0,0,0.7)' }}
      >
        <StatusBar />
        {!booted ? (
          <main className="flex-1 p-3 md:p-8 overflow-y-auto min-h-0 flex items-center justify-center">
            <BootScreen onComplete={() => setBooted(true)} />
          </main>
        ) : (
          <div className="flex flex-col md:flex-row flex-1 min-h-0 animate-[content-fade-in_0.5s_ease-out]">
            <div className="hidden md:flex">
              <SideNav />
            </div>
            <main ref={mainRef} className="flex-1 p-3 md:p-8 overflow-y-auto min-h-0">
              <Outlet />
            </main>
            <div className="md:hidden shrink-0">
              <SideNav />
            </div>
          </div>
        )}
        <CrtOverlay />
      </div>
    </div>
  );
}
