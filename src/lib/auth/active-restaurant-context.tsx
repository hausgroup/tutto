"use client";

import * as React from "react";

const ActiveRestaurantContext = React.createContext<{
  restaurantId: string;
  setRestaurantIdOptimistic: (id: string) => void;
} | null>(null);

export function ActiveRestaurantProvider({
  initialRestaurantId,
  children,
}: {
  initialRestaurantId: string;
  children: React.ReactNode;
}) {
  const [restaurantId, setRestaurantId] = React.useState(initialRestaurantId);

  React.useEffect(() => {
    setRestaurantId(initialRestaurantId);
  }, [initialRestaurantId]);

  const setRestaurantIdOptimistic = React.useCallback((id: string) => {
    setRestaurantId(id);
  }, []);

  const value = React.useMemo(
    () => ({ restaurantId, setRestaurantIdOptimistic }),
    [restaurantId, setRestaurantIdOptimistic],
  );

  return (
    <ActiveRestaurantContext.Provider value={value}>
      {children}
    </ActiveRestaurantContext.Provider>
  );
}

export function useActiveRestaurantId(): string {
  const ctx = React.useContext(ActiveRestaurantContext);
  if (!ctx) {
    throw new Error(
      "useActiveRestaurantId must be used within ActiveRestaurantProvider",
    );
  }
  return ctx.restaurantId;
}

export function useSetActiveRestaurantOptimistic():
  (id: string) => void {
  const ctx = React.useContext(ActiveRestaurantContext);
  if (!ctx) {
    throw new Error(
      "useSetActiveRestaurantOptimistic must be used within ActiveRestaurantProvider",
    );
  }
  return ctx.setRestaurantIdOptimistic;
}
