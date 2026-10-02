import { Home, ListOrdered, Truck, LogOut } from "lucide-react";
import { Logo } from "../logo";

interface NavItem {
  id: string;
  label: string;
  iconName: "home" | "orders" | "deliveries";
  path: string;
}

interface UserProfile {
  name: string;
  initials: string;
  role: string;
  status: string;
}

interface SidebarProps {
  outletName: string;
  activeNavId: string;
  navItems: NavItem[];
  user: UserProfile;
  onNavSelect: (id: string) => void;
  onLogout: () => void;
}

export function Sidebar({
  outletName,
  activeNavId,
  navItems,
  user,
  onNavSelect,
  onLogout,
}: SidebarProps) {
  // Helper to render the correct icon dynamically
  const renderIcon = (iconName: NavItem["iconName"]) => {
    switch (iconName) {
      case "home":
        return <Home className="h-5 w-5" />;
      case "orders":
        return <ListOrdered className="h-5 w-5" />;
      case "deliveries":
        return <Truck className="h-5 w-5" />;
      default:
        return <Home className="h-5 w-5" />;
    }
  };

  return (
    <aside className="w-60 self-stretch bg-stone-50 flex flex-col justify-between items-center shrink-0">
      <div className="self-stretch flex flex-col justify-start items-start gap-8">
        <div className="self-stretch flex flex-col justify-start items-center gap-6">
          {/* Logo & Outlet Tag */}
          <div className="self-stretch px-6 pt-6 flex justify-start items-end gap-3">
            <Logo showText={false} />
            <div className="px-2 py-1 bg-zinc-100 rounded-sm">
              <span className="text-neutral-500 text-xs font-medium">
                {outletName}
              </span>
            </div>
          </div>

          <div className="w-48 h-px bg-stone-200" />

          {/* Dynamic Navigation Links */}
          <nav className="self-stretch px-3 flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = activeNavId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => onNavSelect(item.id)}
                  className="w-52 flex items-center gap-2 cursor-pointer"
                >
                  {/* Active yellow highlight bar indicator */}
                  {isActive ? (
                    <div className="w-1 h-8 bg-yellow-400 rounded-r" />
                  ) : (
                    <div className="w-1 h-8" />
                  )}

                  <div
                    className={`flex-1 p-4 rounded-lg flex items-center gap-3 transition-colors ${
                      isActive
                        ? "bg-neutral-100 text-stone-900"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-600"
                    }`}
                  >
                    <span
                      className={isActive ? "text-stone-900" : "text-stone-600"}
                    >
                      {renderIcon(item.iconName)}
                    </span>
                    <span
                      className={`text-sm font-medium ${isActive ? "text-stone-900 font-semibold" : "text-stone-600"}`}
                    >
                      {item.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Profile / Logout Footer */}
      <div className="self-stretch p-2">
        <div className="p-4 bg-stone-900 rounded-lg flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-stone-900 font-bold text-sm">
              {user.initials}
            </div>
            <div className="flex flex-col">
              <span className="text-neutral-100 text-sm font-semibold">
                {user.role}
              </span>
              <span className="text-stone-400 text-xs">{user.status}</span>
            </div>
          </div>
          <div className="h-px bg-stone-700" />
          <div
            onClick={onLogout}
            className="flex items-center gap-2 cursor-pointer text-stone-300 hover:text-white transition-colors py-1"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Log out</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
