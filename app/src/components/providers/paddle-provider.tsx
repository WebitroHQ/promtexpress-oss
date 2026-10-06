"use client";

import * as React from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";

type PaddleContextValue = {
  paddle: Paddle | null;
  ready: boolean;
};

const PaddleContext = React.createContext<PaddleContextValue>({
  paddle: null,
  ready: false,
});

export function PaddleProvider({ children }: { children: React.ReactNode }) {
  const [paddle, setPaddle] = React.useState<Paddle | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) {
      console.warn("[Paddle] NEXT_PUBLIC_PADDLE_CLIENT_TOKEN missing — checkout disabled");
      return;
    }
    const environment =
      process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";

    initializePaddle({ token, environment })
      .then((p) => {
        if (p) {
          setPaddle(p);
          setReady(true);
        }
      })
      .catch((err) => {
        console.error("[Paddle] init failed", err);
      });
  }, []);

  return (
    <PaddleContext.Provider value={{ paddle, ready }}>{children}</PaddleContext.Provider>
  );
}

export function usePaddleContext() {
  return React.useContext(PaddleContext);
}
