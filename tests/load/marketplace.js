import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
    vus: Number(__ENV.VUS || 5),
    duration: __ENV.DURATION || "30s",
    thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<800"] },
};

function marketplaceLoad() {
    const base = __ENV.BASE_URL || "http://127.0.0.1:3000";
    for (const path of ["/api/health", "/api/v1/services", "/api/v1/workers"]) {
        const response = http.get(`${base}${path}`);
        check(response, { [`${path} returns a response`]: (result) => result.status > 0 });
    }
    sleep(1);
}

export default marketplaceLoad;
