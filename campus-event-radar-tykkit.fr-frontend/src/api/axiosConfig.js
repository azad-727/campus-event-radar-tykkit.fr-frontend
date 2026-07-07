import axios from 'axios';
const api = axios.create({
    baseURL:'https://campus-event-radar-tykkit-fr-backend-1.onrender.com/api/v1',
});

api.interceptors.request.use(
    (config)=>{
        const token = localStorage.getItem('tykkit_jwt');
            if(token){
                config.headers['Authorization'] = `Bearer ${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
);
export default api;