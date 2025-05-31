'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { LayoutDashboard, BarChart3, MessageCircle, Settings, NotebookText } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Log Mood', icon: NotebookText, tooltip: 'Log Mood' },
  { href: '/trends', label: 'Mood Trends', icon: BarChart3, tooltip: 'Mood Trends' },
  { href: '/chat', label: 'Chatbot', icon: MessageCircle, tooltip: 'AI Chatbot' },
  { href: '/settings', label: 'Settings', icon: Settings, tooltip: 'Settings' },
];

export function AppSidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
              tooltip={{ children: item.tooltip, side: 'right', align: 'center' }}
              className="justify-start"
            >
              <a>
                <item.icon className="h-5 w-5" />
                <span className="font-body">{item.label}</span>
              </a>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
