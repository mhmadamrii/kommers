import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { QueryClientProvider } from "@tanstack/solid-query";
import { Suspense } from "solid-js";
import { Toaster } from "somoto";
import { createQueryClient } from "~/lib/query-client";
import "~/app.css";

export default function App() {
  const queryClient = createQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <Router root={(props) => <Suspense>{props.children}</Suspense>}>
        <FileRoutes />
      </Router>
      <Toaster theme="light" />
    </QueryClientProvider>
  );
}
