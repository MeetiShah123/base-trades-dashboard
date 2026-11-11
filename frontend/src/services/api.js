
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

// Fetch previously stored trades
export const fetchTrades = async (page = 1, limit = 100) => {
  const response = await api.get("/api/trades", {
    params: { page, limit }
  });

  return response.data;
};

// Start a new background pull
export const startTradePull = async () => {
  const response = await api.post("/api/pulls");
  return response.data;
};

// Fetch pull job status
export const fetchPullStatus = async (jobId) => {
  const response = await api.get(`/api/pulls/${jobId}`);
  return response.data;
};
export const fetchActivePull = async () => {
  const response = await api.get("/api/pulls/active");
  return response.data;
};
export default api;