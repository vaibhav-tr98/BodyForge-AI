import React from "react";
import ReactDOM from "react-dom/client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import App from "./App";
import "./index.css";
import { queryClient, shouldPersistQuery } from "./lib/queryClient";
import { bodyForgePersister } from "./lib/queryPersister";
import { AuthProvider } from "./context/AuthContext";
import "./lib/syncQueue"; // Initialize SyncManager global listeners

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: bodyForgePersister,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        buster: "bodyforge-query-cache-v1",
        dehydrateOptions: {
          shouldDehydrateQuery: shouldPersistQuery,
        },
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </PersistQueryClientProvider>
  </React.StrictMode>
);