import { useState, useEffect, useRef, useCallback } from 'react';
import { useConfirm } from './ConfirmDialog';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import NotificationBell from './NotificationBell';
import AppLogo from './AppLogo';
import OfferBanner from './OfferBanner';
import {
  LayoutDashboard, Users, FileText, MessageSquare, Clock,
  CheckSquare, BookOpen, FolderKanban, Trophy, LogOut,
  CalendarCheck, ChevronLeft, ChevronRight,
  Menu, X, Tag, Image, Sun, Moon, MoreHorizontal, Settings,
} from 'lucide-react';

// ─── Nav definitions ──────────────────────────────────────────────────────────
const superAdminNav = [
  { to: '/superadmin',                         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/superadmin/staff',                   icon: Users,           label: 'Staff Details' },
  { to: '/superadmin/attendance',              icon: Clock,           label: 'Attendance' },
  { to: '/superadmin/leaves',                  icon: CalendarCheck,   label: 'Leave Requests' },
  { to: '/superadmin/projects',                icon: FolderKanban,    label: 'Projects' },
  { to: '/superadmin/tutorials',               icon: BookOpen,        label: 'Tutorials' },
  { to: '/superadmin/reports',                 icon: FileText,        label: 'Reports' },
  { to: '/superadmin/settings',                icon: Settings,        label: 'Settings' },
];

const adminNav = [
  { to: '/admin/dashboard',             icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/admin/staff',                 icon: Users,           label: 'Staff Details' },
  { to: '/admin/reports',               icon: FileText,        label: 'Reports' },
  { to: '/admin/feedback',              icon: MessageSquare,   label: 'Feedback' },
  { to: '/admin/attendance',            icon: Clock,           label: 'Attendance' },
  { to: '/admin/todos',                 icon: CheckSquare,     label: 'To-Do List' },
  { to: '/admin/tutorials',             icon: BookOpen,        label: 'Tutorials' },
  { to: '/admin/projects',              icon: FolderKanban,    label: 'Projects' },
  { to: '/admin/achievements',          icon: Trophy,          label: 'Achievements' },
  { to: '/admin/offers',                icon: Tag,             label: 'Offers' },
  { to: '/admin/banners',               icon: Image,           label: 'Banners' },
  { to: '/admin/settings',              icon: Settings,        label: 'Settings' },
];

const staffNav = [
  { to: '/staff',                          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/staff/achievements',             icon: Trophy,          label: 'Achievements' },
  { to: '/staff/projects',                 icon: FolderKanban,    label: 'Projects' },
  { to: '/staff/attendance',               icon: Clock,           label: 'Attendance' },
  { to: '/staff/reports',                  icon: FileText,        label: 'My Reports' },
  { to: '/staff/todos',                    icon: CheckSquare,     label: 'To-Do List' },
  { to: '/staff/feedback',                 icon: MessageSquare,   label: 'Feedback' },
  { to: '/staff/tutorials',                icon: BookOpen,        label: 'Tutorials' },
  { to: '/staff/leaves',                   icon: CalendarCheck,   label: 'Request Leave' },
  { to: '/staff/settings',                 icon: Settings,        label: 'Settings' },
  // Offers removed — displayed as OfferBanner strip in the top bar instead
];

// Bottom-nav: first 4 items + "More" for the rest
const BOTTOM_NAV_COUNT = 4;

export default function Layout({ children, role }) {
  const { user, logout }  = useAuth();
  const { dark, toggle }  = useTheme();
  const navigate          = useNavigate();
  const location          = useLocation();
  const confirm           = useConfirm();

  const [collapsed,  setCollapsed]  = useState(true);   // desktop sidebar
  const [mobileOpen, setMobileOpen] = useState(false);  // mobile overlay

  // ── Sidebar scroll persistence (prevent auto-scroll-to-top on navigation) ──
  const sidebarNavRef  = useRef(null);
  const sidebarScrollY = useRef(0);

  const saveSidebarScroll = useCallback(() => {
    if (sidebarNavRef.current) sidebarScrollY.current = sidebarNavRef.current.scrollTop;
  }, []);

  // After every render restore the saved scroll position
  useEffect(() => {
    if (sidebarNavRef.current) sidebarNavRef.current.scrollTop = sidebarScrollY.current;
  });

  const nav = role === 'super_admin' ? superAdminNav
            : role === 'admin'       ? adminNav
            : staffNav;

  // close mobile overlay on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // close on desktop resize
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: 'You will be returned to the login screen.',
      variant: 'logout',
      confirmText: 'Sign Out',
    });
    if (ok) { logout(); navigate('/login'); }
  };
  const userInitial  = (user?.full_name || user?.username || 'U')[0].toUpperCase();

  // ─── shared nav item renderer ────────────────────────────────────────────
  const NavItem = ({ to, icon: Icon, label, closeSidebar }) => (
    <NavLink
      to={to}
      end={to === '/admin' || to === '/admin/dashboard' || to === '/staff' || to === '/superadmin' || to === '/superadmin/staff'}
      onClick={closeSidebar}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 outline-none
         ${collapsed
           ? 'justify-center py-3 mx-1 px-0'
           : 'px-3 py-2.5'}
         ${isActive
           ? 'bg-white/15 text-white shadow-inner'
           : 'text-blue-200 hover:bg-white/8 hover:text-white'}`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-150
            ${isActive ? 'bg-accent shadow-md shadow-accent/40' : 'group-hover:bg-white/10'}`}>
            <Icon size={16} />
          </span>
          {!collapsed && (
            <span className="truncate leading-tight">{label}</span>
          )}
          {isActive && !collapsed && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          )}
        </>
      )}
    </NavLink>
  );

  // ─── Desktop sidebar ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── Desktop sidebar (fixed) ── */}
      <aside className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-30
        bg-[#1a3a6b] dark:bg-gray-900 shadow-xl transition-[width] duration-200 ease-in-out overflow-hidden
        ${collapsed ? 'w-16' : 'w-[220px]'}`}>

        {/* Logo / header */}
        <div className={`flex items-center shrink-0 border-b border-white/10 py-4
          ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          {collapsed ? (
            <button onClick={() => setCollapsed(false)} title="Expand menu"
              className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/10 transition-colors">
              <AppLogo size={26} variant="icon" className="rounded-lg" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <AppLogo size={30} variant="icon" className="rounded-lg shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm leading-tight">i5 Nexus</p>
                  <p className="text-[11px] text-blue-300 capitalize">{role === 'super_admin' ? 'Super Admin' : role} Portal</p>
                </div>
              </div>
              <button onClick={() => setCollapsed(true)} title="Collapse menu"
                className="shrink-0 text-blue-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                <ChevronLeft size={16} />
              </button>
            </>
          )}
        </div>

        {/* User chip — expanded only */}
        {!collapsed && (
          <div className="px-3 py-2.5 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-2.5 bg-white/8 rounded-xl px-2.5 py-2">
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white font-bold text-xs shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-[10px] text-blue-300 truncate">
                  {user?.position || user?.department || role}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav
          ref={sidebarNavRef}
          onScroll={saveSidebarScroll}
          className="sidebar-nav flex-1 px-2 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {nav.map(item => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* Bottom controls */}
        <div className="shrink-0 border-t border-white/10 px-2 py-2 space-y-0.5">
          {/* Expand arrow — only when collapsed */}
          {collapsed && (
            <button onClick={() => setCollapsed(false)} title="Expand menu"
              className="flex items-center justify-center w-full py-2.5 rounded-xl text-blue-400 hover:text-white hover:bg-white/10 transition-colors">
              <ChevronRight size={16} />
            </button>
          )}
          {/* Logout */}
          <button onClick={handleLogout} title={collapsed ? 'Logout' : undefined}
            className={`flex items-center gap-3 w-full rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-colors
              ${collapsed ? 'justify-center py-2.5 mx-1 px-0' : 'px-3 py-2.5'}`}>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 group-hover:bg-white/10">
              <LogOut size={16} />
            </span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile overlay sidebar ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)} />

          {/* Drawer */}
          <div className="relative z-10 flex flex-col w-72 max-w-[85vw] bg-[#1a3a6b] dark:bg-gray-900 shadow-2xl h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <AppLogo size={30} variant="icon" className="rounded-lg" />
                <div>
                  <p className="font-bold text-white text-sm">i5 Nexus</p>
                  <p className="text-[11px] text-blue-300 capitalize">{role === 'super_admin' ? 'Super Admin' : role} Portal</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)}
                className="text-blue-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* User card */}
            <div className="px-4 py-3 border-b border-white/8 shrink-0">
              <div className="flex items-center gap-3 bg-white/8 rounded-xl px-3 py-2.5">
                <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {user?.full_name || user?.username}
                  </p>
                  <p className="text-xs text-blue-300 truncate">
                    {user?.position || user?.department || role}
                  </p>
                </div>
              </div>
            </div>

            {/* Nav — sidebar-nav applies the dark-blending scrollbar from index.css */}
            <nav className="sidebar-nav flex-1 px-3 py-3 space-y-1 overflow-y-auto">
              {nav.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to}
                  end={to === '/admin' || to === '/admin/dashboard' || to === '/staff' || to === '/superadmin' || to === '/superadmin/staff'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors
                     ${isActive
                       ? 'bg-white/15 text-white'
                       : 'text-blue-200 hover:bg-white/10 hover:text-white'}`
                  }>
                  {({ isActive }) => (
                    <>
                      <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0
                        ${isActive ? 'bg-accent shadow-md' : 'bg-white/8'}`}>
                        <Icon size={16} />
                      </span>
                      <span>{label}</span>
                      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Logout */}
            <div className="px-3 py-3 border-t border-white/10 shrink-0">
              <button onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-colors w-full">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/8">
                  <LogOut size={16} />
                </span>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content column ── */}
      {/* NOTE: md:ml-16 / md:ml-[220px] match the sidebar widths exactly.
          On mobile (< md) no margin is applied — sidebar is hidden. */}
      <div className={`flex flex-col min-h-screen transition-[margin-left] duration-200 ease-in-out
        ${collapsed ? 'md:ml-16' : 'md:ml-[220px]'}`}>

        {/* ── Mobile top bar ── */}
        <header className="md:hidden sticky top-0 z-20 bg-[#1a3a6b] dark:bg-gray-900 shadow-md shrink-0">
          <div className="flex items-center gap-3 px-4 h-14">
            <button onClick={() => setMobileOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-xl text-white hover:bg-white/10 transition-colors">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <AppLogo size={24} variant="icon" className="rounded-md shrink-0" />
              <span className="font-bold text-white text-sm">i5 Nexus</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={toggle}
                className="flex items-center justify-center w-9 h-9 rounded-xl text-blue-300 hover:text-white hover:bg-white/10 transition-colors">
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* ── Desktop top bar ── */}
        <header className="hidden md:flex items-center justify-between px-6 h-12 bg-white dark:bg-gray-900
          border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20 shadow-sm shrink-0">
          {/* Breadcrumb-style page title could go here */}
          <div />
          <div className="flex items-center gap-2">
            <button onClick={toggle}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-[#1a3a6b] dark:hover:text-white
                px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium">
              {dark ? <Sun size={14} /> : <Moon size={14} />}
              {dark ? 'Light' : 'Dark'}
            </button>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
            <NotificationBell />
          </div>
        </header>

        {/* Offer banner */}
        {role === 'staff' && <OfferBanner />}

        {/* ── Page content ── */}
        {/* pb-20 on mobile leaves room above the bottom nav bar */}
        <main className="flex-1 p-4 sm:p-6 w-full pb-24 md:pb-6 dark:text-gray-100 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom navigation bar ── */}
      {/* Shown only on mobile. Sits above the system chrome. */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40
        bg-white/95 dark:bg-gray-900/95 backdrop-blur-md
        border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-stretch h-[60px] px-1">
          {nav.slice(0, BOTTOM_NAV_COUNT).map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              end={to === '/admin' || to === '/admin/dashboard' || to === '/staff' || to === '/superadmin' || to === '/superadmin/staff'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 pt-1 pb-1 min-w-0
                 rounded-xl mx-0.5 transition-colors
                 ${isActive
                   ? 'text-[#1a3a6b] dark:text-blue-400'
                   : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`
              }>
              {({ isActive }) => (
                <>
                  <span className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all
                    ${isActive ? 'bg-[#1a3a6b]/10 dark:bg-blue-500/20' : ''}`}>
                    <Icon size={17} />
                  </span>
                  <span className="text-[9px] font-semibold leading-tight truncate w-full text-center px-0.5">
                    {label.split(' ')[0]}
                  </span>
                  {isActive && <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-[#1a3a6b] dark:bg-blue-400" />}
                </>
              )}
            </NavLink>
          ))}

          {/* "More" button — opens full overlay */}
          <button onClick={() => setMobileOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 pt-1 pb-1 min-w-0 rounded-xl mx-0.5
              text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg">
              <MoreHorizontal size={17} />
            </span>
            <span className="text-[9px] font-semibold leading-tight">More</span>
          </button>
        </div>
        {/* iOS safe-area spacer */}
        <div className="h-safe-bottom" style={{ height: 'env(safe-area-inset-bottom)' }} />
      </nav>
    </div>
  );
}
