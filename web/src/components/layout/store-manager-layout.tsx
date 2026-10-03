import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/store-manager-sidebar"; // Path based on your structure

export function StoreManagerLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveNavId = () => {
    if (location.pathname.includes("/deliveries")) return "deliveries";
    if (location.pathname.includes("/orders")) return "orders";
    return "overview";
  };

  const navConfig = [
    { id: "overview", label: "Overview", iconName: "home" as const, path: "/store-manager" },
    {
      id: "orders",
      label: "Orders",
      iconName: "orders" as const,
      path: "/store-manager/orders",
    },
    {
      id: "deliveries",
      label: "Deliveries",
      iconName: "deliveries" as const,
      path: "/store-manager/deliveries",
    },
  ];

  return (
    <div className="w-full min-h-screen bg-stone-50 flex justify-start items-start">
      {/* Fixed Sidebar */}
      <Sidebar
        outletName="Fresh · Ja-Ela"
        activeNavId={getActiveNavId()}
        navItems={navConfig}
        user={{
          name: "Dispatcher User",
          initials: "DJ",
          role: "Dispatcher",
          status: "Signed in",
        }}
        onNavSelect={(id) => {
          const target = navConfig.find((n) => n.id === id);
          if (target) navigate(target.path);
        }}
        onLogout={() => navigate("/store-manager/login")}
      />

      {/* Dynamic Page Content */}
      <div className="flex-1 overflow-y-auto h-screen">
        <Outlet />
      </div>
    </div>
  );
}
