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
exports.handler = exports.genSmtpPassword = exports.sign = void 0;
const crypto = __importStar(require("crypto"));
const utf8 = __importStar(require("utf8"));
const sign = (key, msg) => {
    const hmac = crypto.createHmac('sha256', Buffer.from(key.map((a) => a.charCodeAt(0)))).update(utf8.encode(msg));
    return hmac.digest('binary').toString().split('');
};
exports.sign = sign;
const genSmtpPassword = (secretAccessKey, region) => {
    const date = '11111111';
    const service = 'ses';
    const terminal = 'aws4_request';
    const message = 'SendRawEmail';
    const versionInBytes = [0x04];
    let signature = (0, exports.sign)(utf8.encode('AWS4' + secretAccessKey).split(''), date);
    signature = (0, exports.sign)(signature, region);
    signature = (0, exports.sign)(signature, service);
    signature = (0, exports.sign)(signature, terminal);
    signature = (0, exports.sign)(signature, message);
    const signatureAndVersion = versionInBytes.slice(); //copy of array
    signature.forEach((a) => signatureAndVersion.push(a.charCodeAt(0)));
    return Buffer.from(signatureAndVersion).toString('base64');
};
exports.genSmtpPassword = genSmtpPassword;
const handler = async (event, _context) => {
    const secretAccessKey = event.ResourceProperties.SecretAccessKey;
    const region = event.ResourceProperties.Region;
    const smtpHost = `email-smtp.${region}.amazonaws.com`;
    const physicalResourceId = `${smtpHost}/password`;
    switch (event.RequestType) {
        case 'Create': {
            const smtpPassword = (0, exports.genSmtpPassword)(secretAccessKey, region);
            return { PhysicalResourceId: physicalResourceId, Data: { Password: smtpPassword, Host: smtpHost } };
        }
        case 'Update': {
            const smtpPassword = (0, exports.genSmtpPassword)(secretAccessKey, region);
            return { PhysicalResourceId: physicalResourceId, Data: { Password: smtpPassword, Host: smtpHost } };
        }
        case 'Delete': {
            return {};
        }
    }
    ;
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Itc210cC1wYXNzd29yZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9hbWF6b24tc2VzLXNtdHAvY3Itc210cC1wYXNzd29yZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtDQUFpQztBQUVqQywyQ0FBNkI7QUFFdEIsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFhLEVBQUUsR0FBVyxFQUFFLEVBQUU7SUFDakQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFRLENBQUM7SUFDdkgsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNwRCxDQUFDLENBQUM7QUFIVyxRQUFBLElBQUksUUFHZjtBQUVLLE1BQU0sZUFBZSxHQUFHLENBQUMsZUFBdUIsRUFBRSxNQUFjLEVBQUUsRUFBRTtJQUN6RSxNQUFNLElBQUksR0FBRyxVQUFVLENBQUM7SUFDeEIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBQ3RCLE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUNoQyxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUM7SUFDL0IsTUFBTSxjQUFjLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUU5QixJQUFJLFNBQVMsR0FBRyxJQUFBLFlBQUksRUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxlQUFlLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUUsU0FBUyxHQUFHLElBQUEsWUFBSSxFQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNwQyxTQUFTLEdBQUcsSUFBQSxZQUFJLEVBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3JDLFNBQVMsR0FBRyxJQUFBLFlBQUksRUFBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDdEMsU0FBUyxHQUFHLElBQUEsWUFBSSxFQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUVyQyxNQUFNLG1CQUFtQixHQUFHLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLGVBQWU7SUFFbkUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTVFLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM3RCxDQUFDLENBQUM7QUFsQlcsUUFBQSxlQUFlLG1CQWtCMUI7QUFFSyxNQUFNLE9BQU8sR0FBNkIsS0FBSyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRTtJQUN6RSxNQUFNLGVBQWUsR0FBVyxLQUFLLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDO0lBQ3pFLE1BQU0sTUFBTSxHQUFXLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUM7SUFDdkQsTUFBTSxRQUFRLEdBQUcsY0FBYyxNQUFNLGdCQUFnQixDQUFDO0lBQ3RELE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxRQUFRLFdBQVcsQ0FBQztJQUVsRCxRQUFRLEtBQUssQ0FBQyxXQUFXLEVBQUU7UUFDekIsS0FBSyxRQUFRLENBQUMsQ0FBQztZQUNiLE1BQU0sWUFBWSxHQUFHLElBQUEsdUJBQWUsRUFBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUM7U0FDckc7UUFDRCxLQUFLLFFBQVEsQ0FBQyxDQUFDO1lBQ2IsTUFBTSxZQUFZLEdBQUcsSUFBQSx1QkFBZSxFQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUM5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQztTQUNyRztRQUNELEtBQUssUUFBUSxDQUFDLENBQUM7WUFDYixPQUFPLEVBQUUsQ0FBQztTQUNYO0tBQ0Y7SUFBQSxDQUFDO0FBQ0osQ0FBQyxDQUFDO0FBbkJXLFFBQUEsT0FBTyxXQW1CbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjcnlwdG8gZnJvbSAnY3J5cHRvJztcclxuaW1wb3J0IHsgQ2RrQ3VzdG9tUmVzb3VyY2VIYW5kbGVyIH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIHV0ZjggZnJvbSAndXRmOCc7XHJcblxyXG5leHBvcnQgY29uc3Qgc2lnbiA9IChrZXk6IHN0cmluZ1tdLCBtc2c6IHN0cmluZykgPT4ge1xyXG4gIGNvbnN0IGhtYWMgPSBjcnlwdG8uY3JlYXRlSG1hYygnc2hhMjU2JywgQnVmZmVyLmZyb20oa2V5Lm1hcCgoYSkgPT4gYS5jaGFyQ29kZUF0KDApKSkpLnVwZGF0ZSh1dGY4LmVuY29kZShtc2cpKSBhcyBhbnk7XHJcbiAgcmV0dXJuIGhtYWMuZGlnZXN0KCdiaW5hcnknKS50b1N0cmluZygpLnNwbGl0KCcnKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBnZW5TbXRwUGFzc3dvcmQgPSAoc2VjcmV0QWNjZXNzS2V5OiBzdHJpbmcsIHJlZ2lvbjogc3RyaW5nKSA9PiB7XHJcbiAgY29uc3QgZGF0ZSA9ICcxMTExMTExMSc7XHJcbiAgY29uc3Qgc2VydmljZSA9ICdzZXMnO1xyXG4gIGNvbnN0IHRlcm1pbmFsID0gJ2F3czRfcmVxdWVzdCc7XHJcbiAgY29uc3QgbWVzc2FnZSA9ICdTZW5kUmF3RW1haWwnO1xyXG4gIGNvbnN0IHZlcnNpb25JbkJ5dGVzID0gWzB4MDRdO1xyXG5cclxuICBsZXQgc2lnbmF0dXJlID0gc2lnbih1dGY4LmVuY29kZSgnQVdTNCcgKyBzZWNyZXRBY2Nlc3NLZXkpLnNwbGl0KCcnKSwgZGF0ZSk7XHJcbiAgc2lnbmF0dXJlID0gc2lnbihzaWduYXR1cmUsIHJlZ2lvbik7XHJcbiAgc2lnbmF0dXJlID0gc2lnbihzaWduYXR1cmUsIHNlcnZpY2UpO1xyXG4gIHNpZ25hdHVyZSA9IHNpZ24oc2lnbmF0dXJlLCB0ZXJtaW5hbCk7XHJcbiAgc2lnbmF0dXJlID0gc2lnbihzaWduYXR1cmUsIG1lc3NhZ2UpO1xyXG5cclxuICBjb25zdCBzaWduYXR1cmVBbmRWZXJzaW9uID0gdmVyc2lvbkluQnl0ZXMuc2xpY2UoKTsgLy9jb3B5IG9mIGFycmF5XHJcblxyXG4gIHNpZ25hdHVyZS5mb3JFYWNoKChhOiBzdHJpbmcpID0+IHNpZ25hdHVyZUFuZFZlcnNpb24ucHVzaChhLmNoYXJDb2RlQXQoMCkpKTtcclxuXHJcbiAgcmV0dXJuIEJ1ZmZlci5mcm9tKHNpZ25hdHVyZUFuZFZlcnNpb24pLnRvU3RyaW5nKCdiYXNlNjQnKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyOiBDZGtDdXN0b21SZXNvdXJjZUhhbmRsZXIgPSBhc3luYyAoZXZlbnQsIF9jb250ZXh0KSA9PiB7XHJcbiAgY29uc3Qgc2VjcmV0QWNjZXNzS2V5OiBzdHJpbmcgPSBldmVudC5SZXNvdXJjZVByb3BlcnRpZXMuU2VjcmV0QWNjZXNzS2V5O1xyXG4gIGNvbnN0IHJlZ2lvbjogc3RyaW5nID0gZXZlbnQuUmVzb3VyY2VQcm9wZXJ0aWVzLlJlZ2lvbjtcclxuICBjb25zdCBzbXRwSG9zdCA9IGBlbWFpbC1zbXRwLiR7cmVnaW9ufS5hbWF6b25hd3MuY29tYDtcclxuICBjb25zdCBwaHlzaWNhbFJlc291cmNlSWQgPSBgJHtzbXRwSG9zdH0vcGFzc3dvcmRgO1xyXG5cclxuICBzd2l0Y2ggKGV2ZW50LlJlcXVlc3RUeXBlKSB7XHJcbiAgICBjYXNlICdDcmVhdGUnOiB7XHJcbiAgICAgIGNvbnN0IHNtdHBQYXNzd29yZCA9IGdlblNtdHBQYXNzd29yZChzZWNyZXRBY2Nlc3NLZXksIHJlZ2lvbik7XHJcbiAgICAgIHJldHVybiB7IFBoeXNpY2FsUmVzb3VyY2VJZDogcGh5c2ljYWxSZXNvdXJjZUlkLCBEYXRhOiB7IFBhc3N3b3JkOiBzbXRwUGFzc3dvcmQsIEhvc3Q6IHNtdHBIb3N0IH0gfTtcclxuICAgIH1cclxuICAgIGNhc2UgJ1VwZGF0ZSc6IHtcclxuICAgICAgY29uc3Qgc210cFBhc3N3b3JkID0gZ2VuU210cFBhc3N3b3JkKHNlY3JldEFjY2Vzc0tleSwgcmVnaW9uKTtcclxuICAgICAgcmV0dXJuIHsgUGh5c2ljYWxSZXNvdXJjZUlkOiBwaHlzaWNhbFJlc291cmNlSWQsIERhdGE6IHsgUGFzc3dvcmQ6IHNtdHBQYXNzd29yZCwgSG9zdDogc210cEhvc3QgfSB9O1xyXG4gICAgfVxyXG4gICAgY2FzZSAnRGVsZXRlJzoge1xyXG4gICAgICByZXR1cm4ge307XHJcbiAgICB9XHJcbiAgfTtcclxufTsiXX0=