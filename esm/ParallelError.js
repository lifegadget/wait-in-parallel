export default class ParallelError extends Error {
    constructor(context) {
        super();
        this.name = "ParallelError";
        const successful = context.get("successful");
        const failed = context.get("failed");
        const errors = context.get("errors");
        const results = context.get("results");
        const registrations = context.get("registrations");
        this.name = "ParallelError";
        this.message = `${context.get("failed").length} of ${failed.length +
            successful.length} parallel tasks failed. Tasks failing were: ${failed.join(", ")}.`;
        this.errors = errors;
        this.failed = failed;
        this.successful = successful;
        this.results = results;
        if (context.failFast) {
            const complete = new Set([...successful, ...failed]);
            const incomplete = Object.keys(registrations).filter(k => !complete.has(k));
            this.incomplete = incomplete;
        }
    }
}
