'use client';

import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';

export default function Home() {
  return (
    <main className="h-screen overflow-hidden">
      <Sidebar />
      <ChatArea />
    </main>
  );
}
