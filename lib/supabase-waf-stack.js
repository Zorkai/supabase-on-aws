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
exports.SupabaseWafStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const waf = __importStar(require("aws-cdk-lib/aws-wafv2"));
class SupabaseWafStack extends cdk.Stack {
    constructor(scope, id, props = {}) {
        super(scope, id, props);
        const webAcl = new waf.CfnWebACL(this, 'WebACL', {
            name: id,
            description: 'Web ACL for Supabase',
            scope: 'CLOUDFRONT',
            visibilityConfig: {
                sampledRequestsEnabled: true,
                cloudWatchMetricsEnabled: true,
                metricName: id,
            },
            defaultAction: { allow: {} },
            rules: [
                {
                    name: 'AWS-AWSManagedRulesAmazonIpReputationList',
                    priority: 0,
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesAmazonIpReputationList',
                        },
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'AWS-AWSManagedRulesAmazonIpReputationList',
                    },
                    overrideAction: { none: {} },
                },
                {
                    name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
                    priority: 1,
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesKnownBadInputsRuleSet',
                        },
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
                    },
                    overrideAction: { none: {} },
                },
                {
                    name: 'AWS-AWSManagedRulesBotControlRuleSet',
                    priority: 2,
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesBotControlRuleSet',
                            excludedRules: [
                                { name: 'CategoryHttpLibrary' },
                                { name: 'SignalNonBrowserUserAgent' },
                            ],
                            scopeDownStatement: {
                                notStatement: {
                                    statement: {
                                        byteMatchStatement: {
                                            fieldToMatch: { uriPath: {} },
                                            positionalConstraint: 'STARTS_WITH',
                                            searchString: '/pg/',
                                            textTransformations: [{ priority: 0, type: 'NONE' }],
                                        },
                                    },
                                },
                            },
                        },
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'AWS-AWSManagedRulesBotControlRuleSet',
                    },
                    overrideAction: { none: {} },
                },
                {
                    name: 'AWS-AWSManagedRulesATPRuleSet',
                    priority: 3,
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesATPRuleSet',
                            excludedRules: [
                                { name: 'SignalMissingCredential' },
                            ],
                            managedRuleGroupConfigs: [
                                { loginPath: '/auth/v1/token' },
                                { payloadType: 'JSON' },
                                { usernameField: { identifier: '/email' } },
                                { passwordField: { identifier: '/password' } },
                            ],
                        },
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'AWS-AWSManagedRulesATPRuleSet',
                    },
                    overrideAction: { none: {} },
                },
                {
                    name: 'RateBasedRule',
                    priority: 4,
                    statement: {
                        rateBasedStatement: {
                            limit: 5 * 60 * 100,
                            aggregateKeyType: 'IP',
                        },
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'RateBasedRule',
                    },
                    action: { block: {} },
                },
            ],
        });
        this.webAclId = webAcl.ref;
    }
}
exports.SupabaseWafStack = SupabaseWafStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VwYWJhc2Utd2FmLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3N1cGFiYXNlLXdhZi1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQywyREFBNkM7QUFHN0MsTUFBYSxnQkFBaUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUc3QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLFFBQXdCLEVBQUU7UUFDbEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDL0MsSUFBSSxFQUFFLEVBQUU7WUFDUixXQUFXLEVBQUUsc0JBQXNCO1lBQ25DLEtBQUssRUFBRSxZQUFZO1lBQ25CLGdCQUFnQixFQUFFO2dCQUNoQixzQkFBc0IsRUFBRSxJQUFJO2dCQUM1Qix3QkFBd0IsRUFBRSxJQUFJO2dCQUM5QixVQUFVLEVBQUUsRUFBRTthQUNmO1lBQ0QsYUFBYSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtZQUM1QixLQUFLLEVBQUU7Z0JBQ0w7b0JBQ0UsSUFBSSxFQUFFLDJDQUEyQztvQkFDakQsUUFBUSxFQUFFLENBQUM7b0JBQ1gsU0FBUyxFQUFFO3dCQUNULHlCQUF5QixFQUFFOzRCQUN6QixVQUFVLEVBQUUsS0FBSzs0QkFDakIsSUFBSSxFQUFFLHVDQUF1Qzt5QkFDOUM7cUJBQ0Y7b0JBQ0QsZ0JBQWdCLEVBQUU7d0JBQ2hCLHNCQUFzQixFQUFFLElBQUk7d0JBQzVCLHdCQUF3QixFQUFFLElBQUk7d0JBQzlCLFVBQVUsRUFBRSwyQ0FBMkM7cUJBQ3hEO29CQUNELGNBQWMsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUU7aUJBQzdCO2dCQUNEO29CQUNFLElBQUksRUFBRSww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LEdBQUcsQ0FBQztJQUM3QixDQUFDO0NBQ0Y7QUEvSEQsNENBK0hDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgd2FmIGZyb20gJ2F3cy1jZGstbGliL2F3cy13YWZ2Mic7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFN1cGFiYXNlV2FmU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIHJlYWRvbmx5IHdlYkFjbElkOiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBjZGsuU3RhY2tQcm9wcyA9IHt9KSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICBjb25zdCB3ZWJBY2wgPSBuZXcgd2FmLkNmbldlYkFDTCh0aGlzLCAnV2ViQUNMJywge1xyXG4gICAgICBuYW1lOiBpZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdXZWIgQUNMIGZvciBTdXBhYmFzZScsXHJcbiAgICAgIHNjb3BlOiAnQ0xPVURGUk9OVCcsXHJcbiAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcclxuICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBtZXRyaWNOYW1lOiBpZCxcclxuICAgICAgfSxcclxuICAgICAgZGVmYXVsdEFjdGlvbjogeyBhbGxvdzoge30gfSxcclxuICAgICAgcnVsZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBuYW1lOiAnQVdTLUFXU01hbmFnZWRSdWxlc0FtYXpvbklwUmVwdXRhdGlvbkxpc3QnLFxyXG4gICAgICAgICAgcHJpb3JpdHk6IDAsXHJcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgbWFuYWdlZFJ1bGVHcm91cFN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICAgIHZlbmRvck5hbWU6ICdBV1MnLFxyXG4gICAgICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNBbWF6b25JcFJlcHV0YXRpb25MaXN0JyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XHJcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0FXUy1BV1NNYW5hZ2VkUnVsZXNBbWF6b25JcFJlcHV0YXRpb25MaXN0JyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBvdmVycmlkZUFjdGlvbjogeyBub25lOiB7fSB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbmFtZTogJ0FXUy1BV1NNYW5hZ2VkUnVsZXNLbm93bkJhZElucHV0c1J1bGVTZXQnLFxyXG4gICAgICAgICAgcHJpb3JpdHk6IDEsXHJcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgbWFuYWdlZFJ1bGVHcm91cFN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICAgIHZlbmRvck5hbWU6ICdBV1MnLFxyXG4gICAgICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNLbm93bkJhZElucHV0c1J1bGVTZXQnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcclxuICAgICAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQVdTLUFXU01hbmFnZWRSdWxlc0tub3duQmFkSW5wdXRzUnVsZVNldCcsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgb3ZlcnJpZGVBY3Rpb246IHsgbm9uZToge30gfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIG5hbWU6ICdBV1MtQVdTTWFuYWdlZFJ1bGVzQm90Q29udHJvbFJ1bGVTZXQnLFxyXG4gICAgICAgICAgcHJpb3JpdHk6IDIsXHJcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgbWFuYWdlZFJ1bGVHcm91cFN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICAgIHZlbmRvck5hbWU6ICdBV1MnLFxyXG4gICAgICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNCb3RDb250cm9sUnVsZVNldCcsXHJcbiAgICAgICAgICAgICAgZXhjbHVkZWRSdWxlczogW1xyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnQ2F0ZWdvcnlIdHRwTGlicmFyeScgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ1NpZ25hbE5vbkJyb3dzZXJVc2VyQWdlbnQnIH0sXHJcbiAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICBzY29wZURvd25TdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgICAgIG5vdFN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICAgICAgICBzdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBieXRlTWF0Y2hTdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgIGZpZWxkVG9NYXRjaDogeyB1cmlQYXRoOiB7fSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb25hbENvbnN0cmFpbnQ6ICdTVEFSVFNfV0lUSCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICBzZWFyY2hTdHJpbmc6ICcvcGcvJyxcclxuICAgICAgICAgICAgICAgICAgICAgIHRleHRUcmFuc2Zvcm1hdGlvbnM6IFt7IHByaW9yaXR5OiAwLCB0eXBlOiAnTk9ORScgfV0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XHJcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0FXUy1BV1NNYW5hZ2VkUnVsZXNCb3RDb250cm9sUnVsZVNldCcsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgb3ZlcnJpZGVBY3Rpb246IHsgbm9uZToge30gfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIG5hbWU6ICdBV1MtQVdTTWFuYWdlZFJ1bGVzQVRQUnVsZVNldCcsXHJcbiAgICAgICAgICBwcmlvcml0eTogMyxcclxuICAgICAgICAgIHN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICBtYW5hZ2VkUnVsZUdyb3VwU3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgICAgdmVuZG9yTmFtZTogJ0FXUycsXHJcbiAgICAgICAgICAgICAgbmFtZTogJ0FXU01hbmFnZWRSdWxlc0FUUFJ1bGVTZXQnLFxyXG4gICAgICAgICAgICAgIGV4Y2x1ZGVkUnVsZXM6IFtcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ1NpZ25hbE1pc3NpbmdDcmVkZW50aWFsJyB9LFxyXG4gICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgbWFuYWdlZFJ1bGVHcm91cENvbmZpZ3M6IFtcclxuICAgICAgICAgICAgICAgIHsgbG9naW5QYXRoOiAnL2F1dGgvdjEvdG9rZW4nIH0sXHJcbiAgICAgICAgICAgICAgICB7IHBheWxvYWRUeXBlOiAnSlNPTicgfSxcclxuICAgICAgICAgICAgICAgIHsgdXNlcm5hbWVGaWVsZDogeyBpZGVudGlmaWVyOiAnL2VtYWlsJyB9IH0sXHJcbiAgICAgICAgICAgICAgICB7IHBhc3N3b3JkRmllbGQ6IHsgaWRlbnRpZmllcjogJy9wYXNzd29yZCcgfSB9LFxyXG4gICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xyXG4gICAgICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdBV1MtQVdTTWFuYWdlZFJ1bGVzQVRQUnVsZVNldCcsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgb3ZlcnJpZGVBY3Rpb246IHsgbm9uZToge30gfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIG5hbWU6ICdSYXRlQmFzZWRSdWxlJyxcclxuICAgICAgICAgIHByaW9yaXR5OiA0LFxyXG4gICAgICAgICAgc3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgIHJhdGVCYXNlZFN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICAgIGxpbWl0OiA1ICogNjAgKiAxMDAsIC8vIDEwMHJlcS9zXHJcbiAgICAgICAgICAgICAgYWdncmVnYXRlS2V5VHlwZTogJ0lQJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XHJcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ1JhdGVCYXNlZFJ1bGUnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGFjdGlvbjogeyBibG9jazoge30gfSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy53ZWJBY2xJZCA9IHdlYkFjbC5yZWY7XHJcbiAgfVxyXG59XHJcbiJdfQ==