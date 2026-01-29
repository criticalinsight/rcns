import { Env } from './types';
import { RCNS_DO } from './RCNS_DO';
export { RCNS_DO };

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const id = env.RCNS_DO.idFromName('default');
        const stub = env.RCNS_DO.get(id);
        return stub.fetch(request);
    },

    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        const id = env.RCNS_DO.idFromName('default');
        const stub = env.RCNS_DO.get(id);
        // Trigger heartbeat
        ctx.waitUntil(stub.handleScheduled());
    }
};
