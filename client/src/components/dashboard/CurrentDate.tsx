// src/components/CurrentDate.tsx
import React, { useState, useEffect } from "react";

export const CurrentDate = () => {
  const [dateText, setDateText] = useState("October 18, 2026");

  useEffect(() => {
    fetch("/api/escalation/latest-date")
      .then((res) => res.json())
      .then((data) => {
        if (data?.formatted) {
          setDateText(data.formatted);
        }
      })
      .catch(() => {
        // Fallback to latest database telemetry date
        setDateText("October 18, 2026");
      });
  }, []);

  return <span>{dateText}</span>;
};
