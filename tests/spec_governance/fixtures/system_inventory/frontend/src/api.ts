import { api } from "./client";
export const getDemo = (id: string) => api.get(`/demo/${id}`);
export const createDemo = () => api.post("/demo");