"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_ses_1 = require("@aws-sdk/client-ses");
const client_workmail_1 = require("@aws-sdk/client-workmail");
const checkVerificationStatus = async (region, identity) => {
    const client = new client_ses_1.SESClient({ region });
    const cmd = new client_ses_1.GetIdentityVerificationAttributesCommand({ Identities: [identity] });
    const { VerificationAttributes } = await client.send(cmd);
    client.destroy();
    const verificationStatus = VerificationAttributes === null || VerificationAttributes === void 0 ? void 0 : VerificationAttributes[identity].VerificationStatus;
    if (verificationStatus == 'Success') {
        return true;
    }
    else {
        return false;
    }
};
const checkOrganizationState = async (region, organizationId) => {
    const client = new client_workmail_1.WorkMailClient({ region });
    const cmd = new client_workmail_1.DescribeOrganizationCommand({ OrganizationId: organizationId });
    let state, alias;
    try {
        const output = await client.send(cmd);
        state = output.State;
        alias = output.Alias;
    }
    catch (error) {
        return { IsComplete: false };
    }
    finally {
        client.destroy();
    }
    if (state != 'Active') {
        return { IsComplete: false };
    }
    else {
        const sesIdentity = `${alias}.awsapps.com`;
        const verificationStatus = await checkVerificationStatus(region, sesIdentity);
        if (verificationStatus) {
            return { IsComplete: true };
        }
        else {
            return { IsComplete: false };
        }
    }
};
const handler = async (event, _context) => {
    const region = event.ResourceProperties.Region;
    const organizationId = event.PhysicalResourceId;
    switch (event.RequestType) {
        case 'Create': {
            return checkOrganizationState(region, organizationId);
        }
        case 'Update': {
            return checkOrganizationState(region, organizationId);
        }
        default: {
            return { IsComplete: true };
        }
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2std29ya21haWwtb3JnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2F3cy13b3JrbWFpbC9jaGVjay13b3JrbWFpbC1vcmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0RBQTBGO0FBQzFGLDhEQUF1RjtBQUd2RixNQUFNLHVCQUF1QixHQUFHLEtBQUssRUFBRSxNQUFjLEVBQUUsUUFBZ0IsRUFBb0IsRUFBRTtJQUMzRixNQUFNLE1BQU0sR0FBRyxJQUFJLHNCQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQ3pDLE1BQU0sR0FBRyxHQUFHLElBQUkscURBQXdDLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDckYsTUFBTSxFQUFFLHNCQUFzQixFQUFFLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzFELE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixNQUFNLGtCQUFrQixHQUFHLHNCQUFzQixhQUF0QixzQkFBc0IsdUJBQXRCLHNCQUFzQixDQUFHLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQztJQUNqRixJQUFJLGtCQUFrQixJQUFJLFNBQVMsRUFBRTtRQUNuQyxPQUFPLElBQUksQ0FBQztLQUNiO1NBQU07UUFDTCxPQUFPLEtBQUssQ0FBQztLQUNkO0FBQ0gsQ0FBQyxDQUFDO0FBRUYsTUFBTSxzQkFBc0IsR0FBRyxLQUFLLEVBQUUsTUFBYyxFQUFFLGNBQXVCLEVBQWdELEVBQUU7SUFDN0gsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUM5QyxNQUFNLEdBQUcsR0FBRyxJQUFJLDZDQUEyQixDQUFDLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFDaEYsSUFBSSxLQUF1QixFQUFFLEtBQXVCLENBQUM7SUFDckQsSUFBSTtRQUNGLE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0QyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztRQUNyQixLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztLQUN0QjtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ2QsT0FBTyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQztLQUM5QjtZQUFTO1FBQ1IsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0tBQ2xCO0lBQ0QsSUFBSSxLQUFLLElBQUksUUFBUSxFQUFFO1FBQ3JCLE9BQU8sRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUM7S0FDOUI7U0FBTTtRQUNMLE1BQU0sV0FBVyxHQUFHLEdBQUcsS0FBSyxjQUFjLENBQUM7UUFDM0MsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUM5RSxJQUFJLGtCQUFrQixFQUFFO1lBQ3RCLE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUM7U0FDN0I7YUFBTTtZQUNMLE9BQU8sRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUM7U0FDOUI7S0FDRjtBQUNILENBQUMsQ0FBQztBQUdLLE1BQU0sT0FBTyxHQUF1QyxLQUFLLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFO0lBQ25GLE1BQU0sTUFBTSxHQUFXLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUM7SUFDdkQsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDO0lBQ2hELFFBQVEsS0FBSyxDQUFDLFdBQVcsRUFBRTtRQUN6QixLQUFLLFFBQVEsQ0FBQyxDQUFDO1lBQ2IsT0FBTyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7U0FDdkQ7UUFDRCxLQUFLLFFBQVEsQ0FBQyxDQUFDO1lBQ2IsT0FBTyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7U0FDdkQ7UUFDRCxPQUFRLENBQUMsQ0FBQztZQUNSLE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUM7U0FDN0I7S0FDRjtBQUNILENBQUMsQ0FBQztBQWRXLFFBQUEsT0FBTyxXQWNsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFNFU0NsaWVudCwgR2V0SWRlbnRpdHlWZXJpZmljYXRpb25BdHRyaWJ1dGVzQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zZXMnO1xyXG5pbXBvcnQgeyBXb3JrTWFpbENsaWVudCwgRGVzY3JpYmVPcmdhbml6YXRpb25Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXdvcmttYWlsJztcclxuaW1wb3J0IHsgQ2RrQ3VzdG9tUmVzb3VyY2VJc0NvbXBsZXRlSGFuZGxlciwgQ2RrQ3VzdG9tUmVzb3VyY2VJc0NvbXBsZXRlUmVzcG9uc2UgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuXHJcbmNvbnN0IGNoZWNrVmVyaWZpY2F0aW9uU3RhdHVzID0gYXN5bmMgKHJlZ2lvbjogc3RyaW5nLCBpZGVudGl0eTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XHJcbiAgY29uc3QgY2xpZW50ID0gbmV3IFNFU0NsaWVudCh7IHJlZ2lvbiB9KTtcclxuICBjb25zdCBjbWQgPSBuZXcgR2V0SWRlbnRpdHlWZXJpZmljYXRpb25BdHRyaWJ1dGVzQ29tbWFuZCh7IElkZW50aXRpZXM6IFtpZGVudGl0eV0gfSk7XHJcbiAgY29uc3QgeyBWZXJpZmljYXRpb25BdHRyaWJ1dGVzIH0gPSBhd2FpdCBjbGllbnQuc2VuZChjbWQpO1xyXG4gIGNsaWVudC5kZXN0cm95KCk7XHJcbiAgY29uc3QgdmVyaWZpY2F0aW9uU3RhdHVzID0gVmVyaWZpY2F0aW9uQXR0cmlidXRlcz8uW2lkZW50aXR5XS5WZXJpZmljYXRpb25TdGF0dXM7XHJcbiAgaWYgKHZlcmlmaWNhdGlvblN0YXR1cyA9PSAnU3VjY2VzcycpIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG59O1xyXG5cclxuY29uc3QgY2hlY2tPcmdhbml6YXRpb25TdGF0ZSA9IGFzeW5jIChyZWdpb246IHN0cmluZywgb3JnYW5pemF0aW9uSWQ/OiBzdHJpbmcpOiBQcm9taXNlPENka0N1c3RvbVJlc291cmNlSXNDb21wbGV0ZVJlc3BvbnNlPiA9PiB7XHJcbiAgY29uc3QgY2xpZW50ID0gbmV3IFdvcmtNYWlsQ2xpZW50KHsgcmVnaW9uIH0pO1xyXG4gIGNvbnN0IGNtZCA9IG5ldyBEZXNjcmliZU9yZ2FuaXphdGlvbkNvbW1hbmQoeyBPcmdhbml6YXRpb25JZDogb3JnYW5pemF0aW9uSWQgfSk7XHJcbiAgbGV0IHN0YXRlOiBzdHJpbmd8dW5kZWZpbmVkLCBhbGlhczogc3RyaW5nfHVuZGVmaW5lZDtcclxuICB0cnkge1xyXG4gICAgY29uc3Qgb3V0cHV0ID0gYXdhaXQgY2xpZW50LnNlbmQoY21kKTtcclxuICAgIHN0YXRlID0gb3V0cHV0LlN0YXRlO1xyXG4gICAgYWxpYXMgPSBvdXRwdXQuQWxpYXM7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIHJldHVybiB7IElzQ29tcGxldGU6IGZhbHNlIH07XHJcbiAgfSBmaW5hbGx5IHtcclxuICAgIGNsaWVudC5kZXN0cm95KCk7XHJcbiAgfVxyXG4gIGlmIChzdGF0ZSAhPSAnQWN0aXZlJykge1xyXG4gICAgcmV0dXJuIHsgSXNDb21wbGV0ZTogZmFsc2UgfTtcclxuICB9IGVsc2Uge1xyXG4gICAgY29uc3Qgc2VzSWRlbnRpdHkgPSBgJHthbGlhc30uYXdzYXBwcy5jb21gO1xyXG4gICAgY29uc3QgdmVyaWZpY2F0aW9uU3RhdHVzID0gYXdhaXQgY2hlY2tWZXJpZmljYXRpb25TdGF0dXMocmVnaW9uLCBzZXNJZGVudGl0eSk7XHJcbiAgICBpZiAodmVyaWZpY2F0aW9uU3RhdHVzKSB7XHJcbiAgICAgIHJldHVybiB7IElzQ29tcGxldGU6IHRydWUgfTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiB7IElzQ29tcGxldGU6IGZhbHNlIH07XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyOiBDZGtDdXN0b21SZXNvdXJjZUlzQ29tcGxldGVIYW5kbGVyID0gYXN5bmMgKGV2ZW50LCBfY29udGV4dCkgPT4ge1xyXG4gIGNvbnN0IHJlZ2lvbjogc3RyaW5nID0gZXZlbnQuUmVzb3VyY2VQcm9wZXJ0aWVzLlJlZ2lvbjtcclxuICBjb25zdCBvcmdhbml6YXRpb25JZCA9IGV2ZW50LlBoeXNpY2FsUmVzb3VyY2VJZDtcclxuICBzd2l0Y2ggKGV2ZW50LlJlcXVlc3RUeXBlKSB7XHJcbiAgICBjYXNlICdDcmVhdGUnOiB7XHJcbiAgICAgIHJldHVybiBjaGVja09yZ2FuaXphdGlvblN0YXRlKHJlZ2lvbiwgb3JnYW5pemF0aW9uSWQpO1xyXG4gICAgfVxyXG4gICAgY2FzZSAnVXBkYXRlJzoge1xyXG4gICAgICByZXR1cm4gY2hlY2tPcmdhbml6YXRpb25TdGF0ZShyZWdpb24sIG9yZ2FuaXphdGlvbklkKTtcclxuICAgIH1cclxuICAgIGRlZmF1bHQgOiB7XHJcbiAgICAgIHJldHVybiB7IElzQ29tcGxldGU6IHRydWUgfTtcclxuICAgIH1cclxuICB9XHJcbn07Il19