"use client";

import * as React from "react";

interface Props {
  firstName: string;
}

export function Greeting({ firstName }: Props) {
  // SSR neutral default; real greeting computed on client to use user's local time.
  const [greeting, setGreeting] = React.useState("Welcome");

  React.useEffect(() => {
    const hour = new Date().getHours();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: defer locale-aware greeting to client mount to avoid SSR timezone mismatch
    setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
  }, []);

  return (
    <h1 className="text-[28px] font-semibold tracking-[-0.025em]">
      {greeting}, {firstName}
    </h1>
  );
}
