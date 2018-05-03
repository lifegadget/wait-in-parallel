import { IDictionary } from "common-types";

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
}
