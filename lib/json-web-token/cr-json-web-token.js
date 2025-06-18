"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const region = process.env.AWS_REGION;
const jwtSecretArn = process.env.JWT_SECRET_ARN;
/** Get the JWT secret */
const getJwtSecret = async (secretId) => {
    const client = new client_secrets_manager_1.SecretsManagerClient({ region });
    const cmd = new client_secrets_manager_1.GetSecretValueCommand({ SecretId: secretId });
    const { SecretString } = await client.send(cmd);
    console.log('Get secret successfully.');
    client.destroy();
    return SecretString;
};
/** Generate a json web token */
const generateToken = async (payload, secretId, issuer, expiresIn) => {
    const jwtSecret = await getJwtSecret(secretId);
    const token = jsonwebtoken_1.default.sign(payload, jwtSecret, { issuer, expiresIn });
    return token;
};
const handler = async (event, _context) => {
    const payload = event.ResourceProperties.Payload;
    const role = payload.role;
    const issuer = event.ResourceProperties.Issuer;
    const expiresIn = event.ResourceProperties.ExpiresIn;
    switch (event.RequestType) {
        case 'Create': {
            const token = await generateToken(payload, jwtSecretArn, issuer, expiresIn);
            const response = {
                PhysicalResourceId: `${jwtSecretArn}:${role}`,
                Data: { Value: token, Role: role, Issuer: issuer },
            };
            return response;
        }
        case 'Update': {
            const token = await generateToken(payload, jwtSecretArn, issuer, expiresIn);
            const response = {
                PhysicalResourceId: `${jwtSecretArn}:${role}`,
                Data: { Value: token, Role: role, Issuer: issuer },
            };
            return response;
        }
        case 'Delete': {
            return {};
        }
    }
    ;
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3ItanNvbi13ZWItdG9rZW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvanNvbi13ZWItdG9rZW4vY3ItanNvbi13ZWItdG9rZW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsNEVBQW1IO0FBRW5ILGdFQUErQjtBQUUvQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQztBQUN0QyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWUsQ0FBQztBQU1qRCx5QkFBeUI7QUFDekIsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLFFBQWdCLEVBQUUsRUFBRTtJQUM5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLDZDQUFvQixDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUNwRCxNQUFNLEdBQUcsR0FBRyxJQUFJLDhDQUFxQixDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDOUQsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNoRCxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUM7SUFDeEMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLE9BQU8sWUFBYSxDQUFDO0FBQ3ZCLENBQUMsQ0FBQztBQUVGLGdDQUFnQztBQUNoQyxNQUFNLGFBQWEsR0FBRyxLQUFLLEVBQUUsT0FBZSxFQUFFLFFBQWdCLEVBQUUsTUFBZSxFQUFFLFNBQWtCLEVBQUUsRUFBRTtJQUNyRyxNQUFNLFNBQVMsR0FBRyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMvQyxNQUFNLEtBQUssR0FBRyxzQkFBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7SUFDbEUsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDLENBQUM7QUFFSyxNQUFNLE9BQU8sR0FBNkIsS0FBSyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRTtJQUN6RSxNQUFNLE9BQU8sR0FBWSxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDO0lBQzFELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7SUFDMUIsTUFBTSxNQUFNLEdBQXFCLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUM7SUFDakUsTUFBTSxTQUFTLEdBQXFCLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUM7SUFFdkUsUUFBUSxLQUFLLENBQUMsV0FBVyxFQUFFO1FBQ3pCLEtBQUssUUFBUSxDQUFDLENBQUM7WUFDYixNQUFNLEtBQUssR0FBRyxNQUFNLGFBQWEsQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1RSxNQUFNLFFBQVEsR0FBOEI7Z0JBQzFDLGtCQUFrQixFQUFFLEdBQUcsWUFBWSxJQUFJLElBQUksRUFBRTtnQkFDN0MsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7YUFDbkQsQ0FBQztZQUNGLE9BQU8sUUFBUSxDQUFDO1NBQ2pCO1FBQ0QsS0FBSyxRQUFRLENBQUMsQ0FBQztZQUNiLE1BQU0sS0FBSyxHQUFHLE1BQU0sYUFBYSxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVFLE1BQU0sUUFBUSxHQUE4QjtnQkFDMUMsa0JBQWtCLEVBQUUsR0FBRyxZQUFZLElBQUksSUFBSSxFQUFFO2dCQUM3QyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRTthQUNuRCxDQUFDO1lBQ0YsT0FBTyxRQUFRLENBQUM7U0FDakI7UUFDRCxLQUFLLFFBQVEsQ0FBQyxDQUFDO1lBQ2IsT0FBTyxFQUFFLENBQUM7U0FDWDtLQUNGO0lBQUEsQ0FBQztBQUNKLENBQUMsQ0FBQztBQTNCVyxRQUFBLE9BQU8sV0EyQmxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU2VjcmV0c01hbmFnZXJDbGllbnQsIEdldFNlY3JldFZhbHVlQ29tbWFuZCwgVXBkYXRlU2VjcmV0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zZWNyZXRzLW1hbmFnZXInO1xyXG5pbXBvcnQgeyBDZGtDdXN0b21SZXNvdXJjZUhhbmRsZXIsIENka0N1c3RvbVJlc291cmNlUmVzcG9uc2UgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IGp3dCBmcm9tICdqc29ud2VidG9rZW4nO1xyXG5cclxuY29uc3QgcmVnaW9uID0gcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTjtcclxuY29uc3Qgand0U2VjcmV0QXJuID0gcHJvY2Vzcy5lbnYuSldUX1NFQ1JFVF9BUk4hO1xyXG5cclxuaW50ZXJmYWNlIFBheWxvYWQgZXh0ZW5kcyBPYmplY3Qge1xyXG4gIHJvbGU6IHN0cmluZztcclxufVxyXG5cclxuLyoqIEdldCB0aGUgSldUIHNlY3JldCAqL1xyXG5jb25zdCBnZXRKd3RTZWNyZXQgPSBhc3luYyAoc2VjcmV0SWQ6IHN0cmluZykgPT4ge1xyXG4gIGNvbnN0IGNsaWVudCA9IG5ldyBTZWNyZXRzTWFuYWdlckNsaWVudCh7IHJlZ2lvbiB9KTtcclxuICBjb25zdCBjbWQgPSBuZXcgR2V0U2VjcmV0VmFsdWVDb21tYW5kKHsgU2VjcmV0SWQ6IHNlY3JldElkIH0pO1xyXG4gIGNvbnN0IHsgU2VjcmV0U3RyaW5nIH0gPSBhd2FpdCBjbGllbnQuc2VuZChjbWQpO1xyXG4gIGNvbnNvbGUubG9nKCdHZXQgc2VjcmV0IHN1Y2Nlc3NmdWxseS4nKTtcclxuICBjbGllbnQuZGVzdHJveSgpO1xyXG4gIHJldHVybiBTZWNyZXRTdHJpbmchO1xyXG59O1xyXG5cclxuLyoqIEdlbmVyYXRlIGEganNvbiB3ZWIgdG9rZW4gKi9cclxuY29uc3QgZ2VuZXJhdGVUb2tlbiA9IGFzeW5jIChwYXlsb2FkOiBvYmplY3QsIHNlY3JldElkOiBzdHJpbmcsIGlzc3Vlcj86IHN0cmluZywgZXhwaXJlc0luPzogc3RyaW5nKSA9PiB7XHJcbiAgY29uc3Qgand0U2VjcmV0ID0gYXdhaXQgZ2V0Snd0U2VjcmV0KHNlY3JldElkKTtcclxuICBjb25zdCB0b2tlbiA9IGp3dC5zaWduKHBheWxvYWQsIGp3dFNlY3JldCwgeyBpc3N1ZXIsIGV4cGlyZXNJbiB9KTtcclxuICByZXR1cm4gdG9rZW47XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlcjogQ2RrQ3VzdG9tUmVzb3VyY2VIYW5kbGVyID0gYXN5bmMgKGV2ZW50LCBfY29udGV4dCkgPT4ge1xyXG4gIGNvbnN0IHBheWxvYWQ6IFBheWxvYWQgPSBldmVudC5SZXNvdXJjZVByb3BlcnRpZXMuUGF5bG9hZDtcclxuICBjb25zdCByb2xlID0gcGF5bG9hZC5yb2xlO1xyXG4gIGNvbnN0IGlzc3Vlcjogc3RyaW5nfHVuZGVmaW5lZCA9IGV2ZW50LlJlc291cmNlUHJvcGVydGllcy5Jc3N1ZXI7XHJcbiAgY29uc3QgZXhwaXJlc0luOiBzdHJpbmd8dW5kZWZpbmVkID0gZXZlbnQuUmVzb3VyY2VQcm9wZXJ0aWVzLkV4cGlyZXNJbjtcclxuXHJcbiAgc3dpdGNoIChldmVudC5SZXF1ZXN0VHlwZSkge1xyXG4gICAgY2FzZSAnQ3JlYXRlJzoge1xyXG4gICAgICBjb25zdCB0b2tlbiA9IGF3YWl0IGdlbmVyYXRlVG9rZW4ocGF5bG9hZCwgand0U2VjcmV0QXJuLCBpc3N1ZXIsIGV4cGlyZXNJbik7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlOiBDZGtDdXN0b21SZXNvdXJjZVJlc3BvbnNlID0ge1xyXG4gICAgICAgIFBoeXNpY2FsUmVzb3VyY2VJZDogYCR7and0U2VjcmV0QXJufToke3JvbGV9YCxcclxuICAgICAgICBEYXRhOiB7IFZhbHVlOiB0b2tlbiwgUm9sZTogcm9sZSwgSXNzdWVyOiBpc3N1ZXIgfSxcclxuICAgICAgfTtcclxuICAgICAgcmV0dXJuIHJlc3BvbnNlO1xyXG4gICAgfVxyXG4gICAgY2FzZSAnVXBkYXRlJzoge1xyXG4gICAgICBjb25zdCB0b2tlbiA9IGF3YWl0IGdlbmVyYXRlVG9rZW4ocGF5bG9hZCwgand0U2VjcmV0QXJuLCBpc3N1ZXIsIGV4cGlyZXNJbik7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlOiBDZGtDdXN0b21SZXNvdXJjZVJlc3BvbnNlID0ge1xyXG4gICAgICAgIFBoeXNpY2FsUmVzb3VyY2VJZDogYCR7and0U2VjcmV0QXJufToke3JvbGV9YCxcclxuICAgICAgICBEYXRhOiB7IFZhbHVlOiB0b2tlbiwgUm9sZTogcm9sZSwgSXNzdWVyOiBpc3N1ZXIgfSxcclxuICAgICAgfTtcclxuICAgICAgcmV0dXJuIHJlc3BvbnNlO1xyXG4gICAgfVxyXG4gICAgY2FzZSAnRGVsZXRlJzoge1xyXG4gICAgICByZXR1cm4ge307XHJcbiAgICB9XHJcbiAgfTtcclxufTsiXX0=