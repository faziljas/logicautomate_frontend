"use client";

import React, { useState, useEffect } from "react";

interface TimerProps {
  startedAt: string; // ISO string
  durationMinutes?: number;
  className?: string;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function Timer({ startedAt, durationMinutes, className = "" }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const hours = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const display = `${pad(hours)}:${pad(mins)}:${pad(secs)}`;

  const overDuration =
    durationMinutes != null && elapsed > durationMinutes * 60;

  return (
    <div
      className={
        overDuration
          ? `rounded-lg bg-amber-100 px-4 py-2 text-lg font-mono font-semibold text-amber-800 ${className}`
          : `rounded-lg bg-slate-100 px-4 py-2 text-lg font-mono font-semibold text-slate-800 ${className}`
      }
    >
      {display}
      {overDuration && (
        <span className="ml-2 text-sm">(over {durationMinutes} min)</span>
      )}
    </div>
  );
}
