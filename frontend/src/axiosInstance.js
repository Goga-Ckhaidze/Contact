import axios from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://contact-qia9.onrender.com",
  withCredentials: true,
});

export default instance;