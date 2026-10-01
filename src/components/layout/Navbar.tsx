import React from 'react';
import {
  Sparkles,
  LayoutDashboard,
  FileText,
  CheckSquare,
  ListTodo,
  Boxes,
  Workflow,
  FlaskConical,
  Settings,
  PlusCircle,
  Building2,
  User as UserIcon,
} from 'lucide-react';
import { User, Workspace } from '../../types';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  pendingApprovalsCount: number;
  user?: User;
  workspace?: Workspace;
  onOpenIngest: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount,
  user,
  workspace,
  onOpenIngest,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'meetings', label: 'Meetings', icon: FileText },
    {
      id: 'approvals',
      label: 'Review & Approvals',
      icon: CheckSquare,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    { id: 'tasks', label: 'Tasks & Board', icon: ListTodo },
    { id: 'integrations', label: 'Integrations', icon: Boxes },
    { id: 'automation', label: 'Automation & n8n', icon: Workflow },
    { id: 'tests', label: 'Automated Tests', icon: FlaskConical },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 via-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">MeetingMind</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  AI Agent
                </span>
              </div>
              <p className="text-xs text-slate-500">Autonomous Meeting-to-Action Engine</p>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-purple-50 text-purple-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[11px] font-semibold bg-amber-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Actions: Ingest Button & Workspace/User Badge */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenIngest}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs lg:text-sm font-medium shadow-sm transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ingest Meeting</span>
            </button>

            {/* Workspace & User Profile */}
            <div className="hidden sm:flex items-center pl-3 border-l border-slate-200 space-x-2">
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-800 flex items-center justify-end space-x-1">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  <span>{workspace?.name || 'Acme Cloud'}</span>
                </div>
                <div className="text-[11px] text-slate-500">{user?.name || 'Sarah Chen'} (Lead)</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-xs border border-indigo-200">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SC'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden flex overflow-x-auto py-2 px-4 border-t border-slate-100 space-x-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`shrink-0 flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium ${
                isActive ? 'bg-purple-100 text-purple-800' : 'text-slate-600 bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="px-1 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
