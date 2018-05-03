import { IDictionary } from "common-types";
import Parallel from ".";
export default class ParallelError<T = any> extends Error {
    name: string;
    message: string;
    failed: string[];
    successful: string[];
    incomplete?: string[];
    errors: IDictionary<Error>;
    results: IDictionary<T>;
    constructor(context: Parallel);
}
