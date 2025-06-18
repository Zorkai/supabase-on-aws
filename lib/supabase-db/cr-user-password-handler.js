"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const pg_1 = __importStar(require("@databases/pg"));
;
const dbSecretArn = process.env.DB_SECRET_ARN;
/** API Client for Secrets Manager */
const secretsManager = new client_secrets_manager_1.SecretsManagerClient({});
/** Get secret from Secrets Manager */
const getSecret = async (secretId) => {
    const cmd = new client_secrets_manager_1.GetSecretValueCommand({ SecretId: secretId });
    const { SecretString } = await secretsManager.send(cmd);
    const secret = JSON.parse(SecretString);
    return secret;
};
/** Put secret to Secrets Manager */
const putSecret = async (secretId, SecretValue) => {
    const cmd = new client_secrets_manager_1.PutSecretValueCommand({ SecretId: secretId, SecretString: JSON.stringify(SecretValue) });
    await secretsManager.send(cmd);
};
/** Escape a parameter for DDL */
const raw = (text) => pg_1.sql.__dangerous__rawValue(text);
/** Set password */
const setUserPassword = async (db, username, password) => {
    await db.query((0, pg_1.sql) `ALTER USER ${raw(username)} WITH PASSWORD '${raw(password)}'`);
};
const handler = async (event, _context) => {
    /** The name of user to be created or droped */
    const username = event.ResourceProperties.Username;
    /** The secret of user to be created */
    const secretId = event.ResourceProperties.SecretId;
    /** The secret used for database connections */
    const dbSecret = await getSecret(dbSecretArn);
    const { host, port, dbname, username: rootUsername, password: rootPassword } = dbSecret;
    /** Database connection */
    const db = (0, pg_1.default)({
        host,
        port: Number(port),
        user: rootUsername,
        password: rootPassword,
        database: dbname || 'postgres',
        ssl: 'disable',
    });
    console.log('Connected to PostgreSQL database');
    let physicalResourceId;
    switch (event.RequestType) {
        case 'Create': {
            const { password } = await getSecret(secretId);
            await setUserPassword(db, username, password);
            await putSecret(secretId, {
                ...dbSecret,
                username,
                password,
                uri: `postgres://${username}:${password}@${host}:${port}/${dbname}`,
            });
            physicalResourceId = `${username}@${dbSecret.host}`;
            break;
        }
        case 'Update': {
            const { password } = await getSecret(secretId);
            await setUserPassword(db, username, password);
            await putSecret(secretId, {
                ...dbSecret,
                username,
                password,
                uri: `postgres://${username}:${password}@${host}:${port}/${dbname}`,
            });
            physicalResourceId = `${username}@${dbSecret.host}`;
            break;
        }
        case 'Delete': {
            break;
        }
    }
    ;
    await db.dispose();
    return { PhysicalResourceId: physicalResourceId };
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3ItdXNlci1wYXNzd29yZC1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3N1cGFiYXNlLWRiL2NyLXVzZXItcGFzc3dvcmQtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRFQUFxSDtBQUNySCxvREFBNkQ7QUFZNUQsQ0FBQztBQUVGLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYyxDQUFDO0FBRS9DLHFDQUFxQztBQUNyQyxNQUFNLGNBQWMsR0FBRyxJQUFJLDZDQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBRXBELHNDQUFzQztBQUN0QyxNQUFNLFNBQVMsR0FBRyxLQUFLLEVBQUUsUUFBZ0IsRUFBcUIsRUFBRTtJQUM5RCxNQUFNLEdBQUcsR0FBRyxJQUFJLDhDQUFxQixDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDOUQsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLE1BQU0sY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQWEsQ0FBYSxDQUFDO0lBQ3JELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUMsQ0FBQztBQUVGLG9DQUFvQztBQUNwQyxNQUFNLFNBQVMsR0FBRyxLQUFLLEVBQUUsUUFBZ0IsRUFBRSxXQUFtQixFQUFFLEVBQUU7SUFDaEUsTUFBTSxHQUFHLEdBQUcsSUFBSSw4Q0FBcUIsQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3pHLE1BQU0sY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNqQyxDQUFDLENBQUM7QUFFRixpQ0FBaUM7QUFDakMsTUFB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QkFBa0IsRUFBRSxDQUFDO0FBQ3BELENBQUMsQ0FBQztBQXZEVyxRQUFBLE9BQU8sV0F1RGxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU2VjcmV0c01hbmFnZXJDbGllbnQsIEdldFNlY3JldFZhbHVlQ29tbWFuZCwgUHV0U2VjcmV0VmFsdWVDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXNlY3JldHMtbWFuYWdlcic7XHJcbmltcG9ydCBjb25uZWN0LCB7IHNxbCwgQ29ubmVjdGlvblBvb2wgfSBmcm9tICdAZGF0YWJhc2VzL3BnJztcclxuaW1wb3J0IHsgQ2RrQ3VzdG9tUmVzb3VyY2VIYW5kbGVyIH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcblxyXG5pbnRlcmZhY2UgZGJTZWNyZXQge1xyXG4gIGVuZ2luZTogc3RyaW5nO1xyXG4gIGhvc3Q6IHN0cmluZztcclxuICBwb3J0OiBzdHJpbmc7XHJcbiAgdXNlcm5hbWU6IHN0cmluZztcclxuICBwYXNzd29yZDogc3RyaW5nO1xyXG4gIGRibmFtZT86IHN0cmluZztcclxuICBkYkNsdXN0ZXJJZGVudGlmaWVyPzogc3RyaW5nO1xyXG4gIGRiSW5zdGFuY2VJZGVudGlmaWVyPzogc3RyaW5nO1xyXG59O1xyXG5cclxuY29uc3QgZGJTZWNyZXRBcm4gPSBwcm9jZXNzLmVudi5EQl9TRUNSRVRfQVJOITtcclxuXHJcbi8qKiBBUEkgQ2xpZW50IGZvciBTZWNyZXRzIE1hbmFnZXIgKi9cclxuY29uc3Qgc2VjcmV0c01hbmFnZXIgPSBuZXcgU2VjcmV0c01hbmFnZXJDbGllbnQoe30pO1xyXG5cclxuLyoqIEdldCBzZWNyZXQgZnJvbSBTZWNyZXRzIE1hbmFnZXIgKi9cclxuY29uc3QgZ2V0U2VjcmV0ID0gYXN5bmMgKHNlY3JldElkOiBzdHJpbmcpOiBQcm9taXNlPGRiU2VjcmV0PiA9PiB7XHJcbiAgY29uc3QgY21kID0gbmV3IEdldFNlY3JldFZhbHVlQ29tbWFuZCh7IFNlY3JldElkOiBzZWNyZXRJZCB9KTtcclxuICBjb25zdCB7IFNlY3JldFN0cmluZyB9ID0gYXdhaXQgc2VjcmV0c01hbmFnZXIuc2VuZChjbWQpO1xyXG4gIGNvbnN0IHNlY3JldCA9IEpTT04ucGFyc2UoU2VjcmV0U3RyaW5nISkgYXMgZGJTZWNyZXQ7XHJcbiAgcmV0dXJuIHNlY3JldDtcclxufTtcclxuXHJcbi8qKiBQdXQgc2VjcmV0IHRvIFNlY3JldHMgTWFuYWdlciAqL1xyXG5jb25zdCBwdXRTZWNyZXQgPSBhc3luYyAoc2VjcmV0SWQ6IHN0cmluZywgU2VjcmV0VmFsdWU6IG9iamVjdCkgPT4ge1xyXG4gIGNvbnN0IGNtZCA9IG5ldyBQdXRTZWNyZXRWYWx1ZUNvbW1hbmQoeyBTZWNyZXRJZDogc2VjcmV0SWQsIFNlY3JldFN0cmluZzogSlNPTi5zdHJpbmdpZnkoU2VjcmV0VmFsdWUpIH0pO1xyXG4gIGF3YWl0IHNlY3JldHNNYW5hZ2VyLnNlbmQoY21kKTtcclxufTtcclxuXHJcbi8qKiBFc2NhcGUgYSBwYXJhbWV0ZXIgZm9yIERETCAqL1xyXG5jb25zdCByYXcgPSAodGV4dDogc3RyaW5nKSA9PiBzcWwuX19kYW5nZXJvdXNfX3Jhd1ZhbHVlKHRleHQpO1xyXG5cclxuLyoqIFNldCBwYXNzd29yZCAqL1xyXG5jb25zdCBzZXRVc2VyUGFzc3dvcmQgPSBhc3luYyAoZGI6IENvbm5lY3Rpb25Qb29sLCB1c2VybmFtZTogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nKSA9PiB7XHJcbiAgYXdhaXQgZGIucXVlcnkoc3FsYEFMVEVSIFVTRVIgJHtyYXcodXNlcm5hbWUpfSBXSVRIIFBBU1NXT1JEICcke3JhdyhwYXNzd29yZCl9J2ApO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXI6IENka0N1c3RvbVJlc291cmNlSGFuZGxlciA9IGFzeW5jIChldmVudCwgX2NvbnRleHQpID0+IHtcclxuICAvKiogVGhlIG5hbWUgb2YgdXNlciB0byBiZSBjcmVhdGVkIG9yIGRyb3BlZCAqL1xyXG4gIGNvbnN0IHVzZXJuYW1lOiBzdHJpbmcgPSBldmVudC5SZXNvdXJjZVByb3BlcnRpZXMuVXNlcm5hbWU7XHJcbiAgLyoqIFRoZSBzZWNyZXQgb2YgdXNlciB0byBiZSBjcmVhdGVkICovXHJcbiAgY29uc3Qgc2VjcmV0SWQ6IHN0cmluZyA9IGV2ZW50LlJlc291cmNlUHJvcGVydGllcy5TZWNyZXRJZDtcclxuXHJcbiAgLyoqIFRoZSBzZWNyZXQgdXNlZCBmb3IgZGF0YWJhc2UgY29ubmVjdGlvbnMgKi9cclxuICBjb25zdCBkYlNlY3JldCA9IGF3YWl0IGdldFNlY3JldChkYlNlY3JldEFybik7XHJcbiAgY29uc3QgeyBob3N0LCBwb3J0LCBkYm5hbWUsIHVzZXJuYW1lOiByb290VXNlcm5hbWUsIHBhc3N3b3JkOiByb290UGFzc3dvcmQgfSA9IGRiU2VjcmV0O1xyXG5cclxuICAvKiogRGF0YWJhc2UgY29ubmVjdGlvbiAqL1xyXG4gIGNvbnN0IGRiID0gY29ubmVjdCh7XHJcbiAgICBob3N0LFxyXG4gICAgcG9ydDogTnVtYmVyKHBvcnQpLFxyXG4gICAgdXNlcjogcm9vdFVzZXJuYW1lLFxyXG4gICAgcGFzc3dvcmQ6IHJvb3RQYXNzd29yZCxcclxuICAgIGRhdGFiYXNlOiBkYm5hbWUgfHwgJ3Bvc3RncmVzJyxcclxuICAgIHNzbDogJ2Rpc2FibGUnLFxyXG4gIH0pO1xyXG4gIGNvbnNvbGUubG9nKCdDb25uZWN0ZWQgdG8gUG9zdGdyZVNRTCBkYXRhYmFzZScpO1xyXG5cclxuICBsZXQgcGh5c2ljYWxSZXNvdXJjZUlkOiBzdHJpbmd8dW5kZWZpbmVkO1xyXG5cclxuICBzd2l0Y2ggKGV2ZW50LlJlcXVlc3RUeXBlKSB7XHJcbiAgICBjYXNlICdDcmVhdGUnOiB7XHJcbiAgICAgIGNvbnN0IHsgcGFzc3dvcmQgfSA9IGF3YWl0IGdldFNlY3JldChzZWNyZXRJZCk7XHJcbiAgICAgIGF3YWl0IHNldFVzZXJQYXNzd29yZChkYiwgdXNlcm5hbWUsIHBhc3N3b3JkKTtcclxuICAgICAgYXdhaXQgcHV0U2VjcmV0KHNlY3JldElkLCB7XHJcbiAgICAgICAgLi4uZGJTZWNyZXQsXHJcbiAgICAgICAgdXNlcm5hbWUsXHJcbiAgICAgICAgcGFzc3dvcmQsXHJcbiAgICAgICAgdXJpOiBgcG9zdGdyZXM6Ly8ke3VzZXJuYW1lfToke3Bhc3N3b3JkfUAke2hvc3R9OiR7cG9ydH0vJHtkYm5hbWV9YCxcclxuICAgICAgfSk7XHJcbiAgICAgIHBoeXNpY2FsUmVzb3VyY2VJZCA9IGAke3VzZXJuYW1lfUAke2RiU2VjcmV0Lmhvc3R9YDtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgICBjYXNlICdVcGRhdGUnOiB7XHJcbiAgICAgIGNvbnN0IHsgcGFzc3dvcmQgfSA9IGF3YWl0IGdldFNlY3JldChzZWNyZXRJZCk7XHJcbiAgICAgIGF3YWl0IHNldFVzZXJQYXNzd29yZChkYiwgdXNlcm5hbWUsIHBhc3N3b3JkKTtcclxuICAgICAgYXdhaXQgcHV0U2VjcmV0KHNlY3JldElkLCB7XHJcbiAgICAgICAgLi4uZGJTZWNyZXQsXHJcbiAgICAgICAgdXNlcm5hbWUsXHJcbiAgICAgICAgcGFzc3dvcmQsXHJcbiAgICAgICAgdXJpOiBgcG9zdGdyZXM6Ly8ke3VzZXJuYW1lfToke3Bhc3N3b3JkfUAke2hvc3R9OiR7cG9ydH0vJHtkYm5hbWV9YCxcclxuICAgICAgfSk7XHJcbiAgICAgIHBoeXNpY2FsUmVzb3VyY2VJZCA9IGAke3VzZXJuYW1lfUAke2RiU2VjcmV0Lmhvc3R9YDtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgICBjYXNlICdEZWxldGUnOiB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGF3YWl0IGRiLmRpc3Bvc2UoKTtcclxuICByZXR1cm4geyBQaHlzaWNhbFJlc291cmNlSWQ6IHBoeXNpY2FsUmVzb3VyY2VJZCB9O1xyXG59OyJdfQ==