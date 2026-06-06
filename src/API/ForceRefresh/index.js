import { getToken } from "../../Utils/UpdateUserState";

/**
 * Streams the force-refresh pipeline via SSE over fetch (supports JWT headers).
 * @param {(log: {level: string, message: string}) => void} onLog - called for each log line
 * @param {(status: string) => void} onDone - called once when the stream ends
 * @param {{ scope?: "month" | "year", month?: string, year?: string }} [scope] - optional scope params
 * @returns {AbortController} — call .abort() to cancel the stream
 */
export const streamForceRefresh = (onLog, onDone, scope) => {
  const controller = new AbortController();
  const token = getToken();

  const qs = new URLSearchParams();
  if (scope?.scope === "month" && scope.month) {
    qs.set("scope", "month");
    qs.set("month", scope.month);
  } else if (scope?.scope === "year" && scope.year) {
    qs.set("scope", "year");
    qs.set("year", scope.year);
  }
  const query = qs.toString();
  const url = `${process.env.REACT_APP_BACKEND_URL}force-refresh/${query ? `?${query}` : ""}`;

  fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
    },
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) {
        onDone("error");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let doneCalled = false;

      const read = () => {
        reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              if (!doneCalled) onDone("completed", null);
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "done") {
                  doneCalled = true;
                  // If proxy swallowed the error log lines, surface the summary here
                  if (data.status === "failed" && data.error) {
                    onLog({ level: "error", message: `✖ ${data.failed_step || "Step"} failed: ${data.error}` });
                  }
                  onDone(data.status, data.duration || null);
                } else if (data.type === "log") {
                  onLog({ level: data.level, message: data.message });
                }
              } catch (_) {}
            }
            read();
          })
          .catch((err) => {
            if (err.name !== "AbortError") onDone("error");
          });
      };
      read();
    })
    .catch((err) => {
      if (err.name !== "AbortError") onDone("error");
    });

  return controller;
};
