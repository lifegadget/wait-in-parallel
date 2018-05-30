import { IDictionary } from "common-types";
import Parallel from ".";

export class ParallelError<T = any> extends Error {
  name = "ParallelError";
  /** an overall health message about the tasks within the parallel task */
  public message: string;

  /** a list of the failed tasks within the parallel effort */
  public failed: string[];
  /** a list of the successful tasks within the parallel effort */
  public successful: string[];
  /** a list of the tasks which have not yet completed (only shows up when fail-fast is on) */
  public incomplete?: string[];
  /** a dictionary of one or more errors which are referenced by the tasks name */
  public errors: IDictionary<Error>;
  /** a dictionary of successful results that were achieved */
  public results: IDictionary<T>;

  constructor(context: Parallel) {
    super();
    const successful = context._get("successful");
    const failed = context._get("failed");
    const errors: IDictionary<Error> = context._get("errors");
    const results = context._get("results");
    const registrations = context._get("registrations");
    const getFirstErrorLocation = (stack: string) => {
      if (!stack) {
        return "";
      }
      const lines = stack.split(/\n/).map(l => l.replace(/^.*at /, "").split("("));
      lines.shift();
      let [fn, where] = lines[0];
      where = where
        ? where
            .split("/")
            .slice(-1)[0]
            .replace(")", "")
        : null;
      fn = fn.trim();
      return where ? `@ ${fn}::${where}` : `@ ${fn}`;
    };

    this.name = "ParallelError";
    const errorSummary = failed
      .map((f: any) => {
        const inspect = (e: ParallelError) => {
          const subErrors: any[] = [];
          const subError = e.errors;

          Object.keys(subError).map(k =>
            subErrors.push(
              `${k}: ${subError[k].name} ${getFirstErrorLocation(subError[k].stack)}`
            )
          );
          return subErrors.join(", ");
        };

        return errors[f].name === "ParallelError"
          ? `\n\t- ${f} [ParallelError { ${inspect(errors[f] as ParallelError)} }]`
          : `\n\t- ${f} [${errors[f].name} ${getFirstErrorLocation(errors[f].stack)}]`;
      })
      .join(", ");

    this.message = `${context._get("failed").length} of ${failed.length +
      successful.length} parallel tasks failed. Tasks failing were: ${errorSummary}.`;
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
