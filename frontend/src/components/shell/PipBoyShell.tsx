import { Outlet } from 'react-router-dom';
import CrtOverlay from './CrtOverlay';
import StatusBar from './StatusBar';
import SideNav from './SideNav';

export default function PipBoyShell() {
  return (
    <div className="min-h-screen p-2 md:p-4">
      <div
        className="relative w-full min-h-[calc(100vh-2rem)] border-[3px] border-[var(--pip-primary)] rounded-2xl overflow-hidden motion-safe:animate-[flicker_4s_ease-in-out_infinite]"
        style={{ boxShadow: '0 0 30px rgba(255,213,44,0.12), inset 0 0 60px rgba(0,0,0,0.7)' }}
      >
        <StatusBar />
        <div className="flex min-h-[80vh]">
          <SideNav />
          <main className="flex-1 p-8 overflow-y-auto max-h-[85vh] pb-20 md:pb-8">
            <Outlet />
          </main>
        </div>
        <CrtOverlay />
      </div>
    </div>
  );
}
