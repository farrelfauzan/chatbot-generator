import axios from "axios";
import config from "./config";

export const apiClient = axios.create({
  baseURL: config.apiUrl,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ?? error.message ?? "An error occurred";
    return Promise.reject(new Error(message));
  },
);

export type ApiResponse<T> = T;
