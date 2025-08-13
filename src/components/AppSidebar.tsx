import { Film, LogIn, LayoutDashboard } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";


const items = [
  { title: "ダッシュボード", url: "/", icon: LayoutDashboard },
  { title: "初期セットアップ", url: "/setup", icon: LogIn },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

  return (
    <>
      <header className="sticky top-0 z-40 h-14 flex items-center border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/40">
        <div className="w-full px-4 md:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="ml-1" />
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" />
              <span className="text-sm sm:text-base font-semibold">Xバズポストショート動画変換</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100svh-3.5rem)] w-full">
        <Sidebar className={collapsed ? "w-14" : "w-60"}>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>メニュー</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <NavLink to={item.url} end className={getNavCls}>
                          <item.icon className="mr-2 h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      
      <div className="min-h-screen flex w-full">{children}</div>
    </SidebarProvider>
  );
}
