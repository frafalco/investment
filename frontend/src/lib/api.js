import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const WS_URL = (() => {
  const base = process.env.REACT_APP_BACKEND_URL || "";
  return base.replace(/^http/, "ws") + "/api/ws";
})();

export { API };
