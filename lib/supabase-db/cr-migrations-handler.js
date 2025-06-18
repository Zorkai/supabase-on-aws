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
const fs = __importStar(require("fs"));
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
/** Run queries under the directory */
const runQueries = async (db, dir) => {
    /** SQL files under the directory */
    const files = fs.readdirSync(dir).filter(name => name.endsWith('.sql'));
    for await (let file of files) {
        const query = pg_1.sql.file(`${dir}${file}`);
        try {
            console.info(`Run: ${file}`);
            const result = await db.query(query);
            if (result.length > 0) {
                console.info(result);
            }
        }
        catch (err) {
            console.error(err);
        }
    }
};
const handler = async (event, _context) => {
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
    console.info('Connected to PostgreSQL database');
    switch (event.RequestType) {
        case 'Create': {
            await runQueries(db, './init-for-rds/');
            await runQueries(db, './init-scripts/');
            await runQueries(db, './migrations/');
            break;
        }
        case 'Update': {
            await runQueries(db, './init-for-rds/');
            await runQueries(db, './init-scripts/');
            await runQueries(db, './migrations/');
            break;
        }
        case 'Delete': {
            break;
        }
    }
    ;
    await db.dispose();
    return {};
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3ItbWlncmF0aW9ucy1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3N1cGFiYXNlLWRiL2NyLW1pZ3JhdGlvbnMtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUF5QjtBQUN6Qiw0RUFBOEY7QUFDOUYsb0RBQTZEO0FBWTVELENBQUM7QUFFRixNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWMsQ0FBQztBQUUvQyxxQ0FBcUM7QUFDckMsTUFBTSxjQUFjLEdBQUcsSUFBSSw2Q0FBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUVwRCxzQ0FBc0M7QUFDdEMsTUFBTSxTQUFTLEdBQUcsS0FBSyxFQUFFLFFBQWdCLEVBQXFCLEVBQUU7SUFDOUQsTUFBTSxHQUFHLEdBQUcsSUFBSSw4Q0FBcUIsQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQzlELE1BQU0sRUFBRSxZQUFZLEVBQUUsR0FBRyxNQUFNLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDeEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFhLENBQWEsQ0FBQztJQUNyRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDLENBQUM7QUFFRixzQ0FBc0M7QUFDdEMsTUFBTSxVQUFVLEdBQUcsS0FBSyxFQUFFLEVBQWtCLEVBQUUsR0FBVyxFQUFFLEVBQUU7SUFDM0Qsb0NBQW9DO0lBQ3BDLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBRXhFLElBQUksS0FBSyxFQUFFLElBQUksSUFBSSxJQUFJLEtBQUssRUFBRTtRQUM1QixNQUFNLEtBQUssR0FBRyxRQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUM7UUFDeEMsSUFBSTtZQUNGLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQzdCLE1BQU0sTUFBTSxHQUFHLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNyQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUNyQixPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ3RCO1NBQ0Y7UUFBQyxPQUFPLEdBQVEsRUFBRTtZQUNqQixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3BCO0tBQ0Y7QUFDSCxDQUFDLENBQUM7QUFFSyxNQUFNLE9BQU8sR0FBNkIsS0FBSyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRTtJQUN6RSwrQ0FBK0M7SUFDL0MsTUFBTSxRQUFRLEdBQUcsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDOUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxHQUFHLFFBQVEsQ0FBQztJQUV4RiwwQkFBMEI7SUFDMUIsTUFBTSxFQUFFLEdBQUcsSUFBQSxZQUFPLEVBQUM7UUFDakIsSUFBSTtRQUNKLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ2xCLElBQUksRUFBRSxZQUFZO1FBQ2xCLFFBQVEsRUFBRSxZQUFZO1FBQ3RCLFFBQVEsRUFBRSxNQUFNLElBQUksVUFBVTtRQUM5QixHQUFHLEVBQUUsU0FBUztLQUNmLENBQUMsQ0FBQztJQUNILE9BQU8sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLENBQUMsQ0FBQztJQUVqRCxRQUFRLEtBQUssQ0FBQyxXQUFXLEVBQUU7UUFDekIsS0FBSyxRQUFRLENBQUMsQ0FBQztZQUNiLE1BQU0sVUFBVSxDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3hDLE1BQU0sVUFBVSxDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3hDLE1BQU0sVUFBVSxDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUN0QyxNQUFNO1NBQ1A7UUFDRCxLQUFLLFFBQVEsQ0FBQyxDQUFDO1lBQ2IsTUFBTSxVQUFVLENBQUMsRUFBRSxFQUFFLGlCQUFpQixDQUFDLENBQUM7WUFDeEMsTUFBTSxVQUFVLENBQUMsRUFBRSxFQUFFLGlCQUFpQixDQUFDLENBQUM7WUFDeEMsTUFBTSxVQUFVLENBQUMsRUFBRSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBQ3RDLE1BQU07U0FDUDtRQUNELEtBQUssUUFBUSxDQUFDLENBQUM7WUFDYixNQUFNO1NBQ1A7S0FDRjtJQUFBLENBQUM7SUFFRixNQUFNLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNuQixPQUFPLEVBQUUsQ0FBQztBQUNaLENBQUMsQ0FBQztBQXBDVyxRQUFBLE9BQU8sV0FvQ2xCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyBTZWNyZXRzTWFuYWdlckNsaWVudCwgR2V0U2VjcmV0VmFsdWVDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXNlY3JldHMtbWFuYWdlcic7XHJcbmltcG9ydCBjb25uZWN0LCB7IHNxbCwgQ29ubmVjdGlvblBvb2wgfSBmcm9tICdAZGF0YWJhc2VzL3BnJztcclxuaW1wb3J0IHsgQ2RrQ3VzdG9tUmVzb3VyY2VIYW5kbGVyIH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcblxyXG5pbnRlcmZhY2UgZGJTZWNyZXQge1xyXG4gIGVuZ2luZTogc3RyaW5nO1xyXG4gIGhvc3Q6IHN0cmluZztcclxuICBwb3J0OiBzdHJpbmc7XHJcbiAgdXNlcm5hbWU6IHN0cmluZztcclxuICBwYXNzd29yZDogc3RyaW5nO1xyXG4gIGRibmFtZT86IHN0cmluZztcclxuICBkYkNsdXN0ZXJJZGVudGlmaWVyPzogc3RyaW5nO1xyXG4gIGRiSW5zdGFuY2VJZGVudGlmaWVyPzogc3RyaW5nO1xyXG59O1xyXG5cclxuY29uc3QgZGJTZWNyZXRBcm4gPSBwcm9jZXNzLmVudi5EQl9TRUNSRVRfQVJOITtcclxuXHJcbi8qKiBBUEkgQ2xpZW50IGZvciBTZWNyZXRzIE1hbmFnZXIgKi9cclxuY29uc3Qgc2VjcmV0c01hbmFnZXIgPSBuZXcgU2VjcmV0c01hbmFnZXJDbGllbnQoe30pO1xyXG5cclxuLyoqIEdldCBzZWNyZXQgZnJvbSBTZWNyZXRzIE1hbmFnZXIgKi9cclxuY29uc3QgZ2V0U2VjcmV0ID0gYXN5bmMgKHNlY3JldElkOiBzdHJpbmcpOiBQcm9taXNlPGRiU2VjcmV0PiA9PiB7XHJcbiAgY29uc3QgY21kID0gbmV3IEdldFNlY3JldFZhbHVlQ29tbWFuZCh7IFNlY3JldElkOiBzZWNyZXRJZCB9KTtcclxuICBjb25zdCB7IFNlY3JldFN0cmluZyB9ID0gYXdhaXQgc2VjcmV0c01hbmFnZXIuc2VuZChjbWQpO1xyXG4gIGNvbnN0IHNlY3JldCA9IEpTT04ucGFyc2UoU2VjcmV0U3RyaW5nISkgYXMgZGJTZWNyZXQ7XHJcbiAgcmV0dXJuIHNlY3JldDtcclxufTtcclxuXHJcbi8qKiBSdW4gcXVlcmllcyB1bmRlciB0aGUgZGlyZWN0b3J5ICovXHJcbmNvbnN0IHJ1blF1ZXJpZXMgPSBhc3luYyAoZGI6IENvbm5lY3Rpb25Qb29sLCBkaXI6IHN0cmluZykgPT4ge1xyXG4gIC8qKiBTUUwgZmlsZXMgdW5kZXIgdGhlIGRpcmVjdG9yeSAqL1xyXG4gIGNvbnN0IGZpbGVzID0gZnMucmVhZGRpclN5bmMoZGlyKS5maWx0ZXIobmFtZSA9PiBuYW1lLmVuZHNXaXRoKCcuc3FsJykpO1xyXG5cclxuICBmb3IgYXdhaXQgKGxldCBmaWxlIG9mIGZpbGVzKSB7XHJcbiAgICBjb25zdCBxdWVyeSA9IHNxbC5maWxlKGAke2Rpcn0ke2ZpbGV9YCk7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmluZm8oYFJ1bjogJHtmaWxlfWApO1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkYi5xdWVyeShxdWVyeSk7XHJcbiAgICAgIGlmIChyZXN1bHQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnNvbGUuaW5mbyhyZXN1bHQpO1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGVycik7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXI6IENka0N1c3RvbVJlc291cmNlSGFuZGxlciA9IGFzeW5jIChldmVudCwgX2NvbnRleHQpID0+IHtcclxuICAvKiogVGhlIHNlY3JldCB1c2VkIGZvciBkYXRhYmFzZSBjb25uZWN0aW9ucyAqL1xyXG4gIGNvbnN0IGRiU2VjcmV0ID0gYXdhaXQgZ2V0U2VjcmV0KGRiU2VjcmV0QXJuKTtcclxuICBjb25zdCB7IGhvc3QsIHBvcnQsIGRibmFtZSwgdXNlcm5hbWU6IHJvb3RVc2VybmFtZSwgcGFzc3dvcmQ6IHJvb3RQYXNzd29yZCB9ID0gZGJTZWNyZXQ7XHJcblxyXG4gIC8qKiBEYXRhYmFzZSBjb25uZWN0aW9uICovXHJcbiAgY29uc3QgZGIgPSBjb25uZWN0KHtcclxuICAgIGhvc3QsXHJcbiAgICBwb3J0OiBOdW1iZXIocG9ydCksXHJcbiAgICB1c2VyOiByb290VXNlcm5hbWUsXHJcbiAgICBwYXNzd29yZDogcm9vdFBhc3N3b3JkLFxyXG4gICAgZGF0YWJhc2U6IGRibmFtZSB8fCAncG9zdGdyZXMnLFxyXG4gICAgc3NsOiAnZGlzYWJsZScsXHJcbiAgfSk7XHJcbiAgY29uc29sZS5pbmZvKCdDb25uZWN0ZWQgdG8gUG9zdGdyZVNRTCBkYXRhYmFzZScpO1xyXG5cclxuICBzd2l0Y2ggKGV2ZW50LlJlcXVlc3RUeXBlKSB7XHJcbiAgICBjYXNlICdDcmVhdGUnOiB7XHJcbiAgICAgIGF3YWl0IHJ1blF1ZXJpZXMoZGIsICcuL2luaXQtZm9yLXJkcy8nKTtcclxuICAgICAgYXdhaXQgcnVuUXVlcmllcyhkYiwgJy4vaW5pdC1zY3JpcHRzLycpO1xyXG4gICAgICBhd2FpdCBydW5RdWVyaWVzKGRiLCAnLi9taWdyYXRpb25zLycpO1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuICAgIGNhc2UgJ1VwZGF0ZSc6IHtcclxuICAgICAgYXdhaXQgcnVuUXVlcmllcyhkYiwgJy4vaW5pdC1mb3ItcmRzLycpO1xyXG4gICAgICBhd2FpdCBydW5RdWVyaWVzKGRiLCAnLi9pbml0LXNjcmlwdHMvJyk7XHJcbiAgICAgIGF3YWl0IHJ1blF1ZXJpZXMoZGIsICcuL21pZ3JhdGlvbnMvJyk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gICAgY2FzZSAnRGVsZXRlJzoge1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBhd2FpdCBkYi5kaXNwb3NlKCk7XHJcbiAgcmV0dXJuIHt9O1xyXG59OyJdfQ==