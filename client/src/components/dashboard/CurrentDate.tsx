// src/components/CurrentDate.tsx
import React from "react";

export const CurrentDate = () => {
  const today = new Date();
  const formatted = today.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return <span>{formatted}</span>;
};
