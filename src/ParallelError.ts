import { IDictionary } from "common-types";
import Parallel from ".";

export default class ParallelError<T = any> extends Error {
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
    const successful = context.get("successful");
    const failed = context.get("failed");
    const errors = context.get("errors");
    const results = context.get("results");
    const registrations = context.get("registrations");

    this.name = "ParallelError";
    this.message = `${context.get("failed").length} of ${failed.length +
      successful.length} parallel tasks failed. Tasks failing were: ${failed.join(
      ", "
    )}.`;
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
