import { IDictionary } from "common-types";
export interface IParallelDone {
    hadErrors: boolean;
    failed: string[];
    successfull: string[];
    errors: IDictionary<Error[]>;
    error?: Error;
}
export declare type DelayedPromise<T> = () => Promise<T>;
export declare type ParallelTask<T> = Promise<T> | DelayedPromise<T>;
export declare type IParallelFailureNotification = (which: string, error: Error) => void;
export declare type IParallelSuccessNotification<T = any> = (which: string, result: T) => void;
export default class Parallel {
    private options;
    private _tasks;
    private _errors;
    private _results;
    private _successful;
    private _failed;
    private _registrations;
    private _failFast;
    private _failureCallbacks;
    private _successCallbacks;
    static create(): Parallel;
    constructor(options?: IDictionary);
    get(prop: string): any;
    add<T = any>(name: string, promise: ParallelTask<T>, timeout?: number): this;
    notifyOnFailure(fn: IParallelFailureNotification): this;
    notifyOnSuccess(fn: IParallelSuccessNotification): this;
    clear(): this;
    failFast(flag?: boolean): this;
    isDone(): Promise<IDictionary>;
    private register<T>(name, promise, options);
    private handleSuccess<T>(name, result);
    private handleFailure<T>(name, err);
    private startDelayedTasks();
}
