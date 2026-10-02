import { DeferOrderDialog } from "./components/defer-order-dialog";
import { NotificationDialog } from "./components/notification-dialog";

function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      <NotificationDialog />
      <DeferOrderDialog />
    </div>
  );
}

export default App;
