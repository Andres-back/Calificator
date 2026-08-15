import { RequireRole } from "./RequireRole";
export const routes = [
  { path: "/app/demo", element: <RequireRole allow={["profesor"]} /> },
];