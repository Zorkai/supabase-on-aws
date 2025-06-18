import { CdkCustomResourceHandler } from 'aws-lambda';
export declare const sign: (key: string[], msg: string) => any;
export declare const genSmtpPassword: (secretAccessKey: string, region: string) => string;
export declare const handler: CdkCustomResourceHandler;
