import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

// Access token lives in module scope — memory only, never localStorage
let _token = '';
export const setAccessToken = (t) => { _token = t; };
export const getAccessToken = () => _token;

const api = axios.create({ baseURL: BASE, withCredentials: true, timeout: 15_000 });

// Attach token on every request
api.interceptors.request.use((cfg) => {
  if (_token) cfg.headers.Authorization = `Bearer ${_token}`;
  return cfg;
});

// Silent JWT refresh on 401 with request queue to deduplicate concurrent calls
let refreshing = false;
let waiters = [];

const flush = (err, token) => {
  waiters.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token)));
  waiters = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config;
    if (error.response?.status !== 401 || orig._retry) return Promise.reject(error);

    orig._retry = true;

    if (refreshing) {
      return new Promise((resolve, reject) => waiters.push({ resolve, reject })).then(
        (token) => { orig.headers.Authorization = `Bearer ${token}`; return api(orig); }
      );
    }

    refreshing = true;
    return axios
      .post(`${BASE}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        flush(null, data.accessToken);
        orig.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(orig);
      })
      .catch((err) => {
        flush(err, null);
        setAccessToken('');
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return Promise.reject(err);
      })
      .finally(() => { refreshing = false; });
  }
);

export default api;
