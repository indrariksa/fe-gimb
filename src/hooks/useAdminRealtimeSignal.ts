import { useEffect, useState } from "react";

export function useAdminRealtimeSignal() {
  const [realtimeRefreshKey, setRealtimeRefreshKey] = useState(0);

  useEffect(() => {
    const refreshOnNotification = () => setRealtimeRefreshKey((current) => current + 1);
    window.addEventListener("gimb:admin-notification", refreshOnNotification);
    return () => window.removeEventListener("gimb:admin-notification", refreshOnNotification);
  }, []);

  return realtimeRefreshKey;
}
