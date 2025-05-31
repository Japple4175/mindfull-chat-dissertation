'use client';
import type { ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppHeader } from './app-header';
import { AppSidebarNav } from './app-sidebar-nav';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Brain } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <ProtectedRoute>
      <SidebarProvider defaultOpen>
        <Sidebar variant="sidebar" collapsible="icon" side="left" className="border-r">
          <SidebarHeader className="p-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
                <Brain className="h-6 w-6 text-primary" />
                <span className="font-headline text-sidebar-foreground group-data-[collapsible=icon]:hidden">Mindful Chat</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <AppSidebarNav />
          </SidebarContent>
          <SidebarFooter className="p-4">
            {/* Optional: Footer content like version or help link */}
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <AppHeader />
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
