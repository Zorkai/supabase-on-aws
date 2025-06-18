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
exports.ForceDeployJob = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const events = __importStar(require("aws-cdk-lib/aws-events"));
const targets = __importStar(require("aws-cdk-lib/aws-events-targets"));
const sfn = __importStar(require("aws-cdk-lib/aws-stepfunctions"));
const aws_stepfunctions_tasks_1 = require("aws-cdk-lib/aws-stepfunctions-tasks");
const constructs_1 = require("constructs");
class ForceDeployJob extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const cluster = props.cluster;
        const forceDeployEcsTask = new aws_stepfunctions_tasks_1.CallAwsService(this, 'ForceDeployEcsTask', {
            comment: 'Force deploy ECS Tasks',
            service: 'ECS',
            action: 'updateService',
            parameters: {
                'Cluster': cluster.clusterName,
                'Service.$': '$.service',
                'ForceNewDeployment': true,
            },
            iamResources: [`arn:${cdk.Aws.PARTITION}:ecs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:service/${cluster.clusterName}/*`],
            iamAction: 'ecs:UpdateService',
        });
        const forceDeployment = new sfn.Map(this, 'ForceDeployment', {
            itemsPath: sfn.JsonPath.stringAt('$.services'),
            parameters: {
                'service.$': '$$.Map.Item.Value',
            },
        });
        forceDeployment.iterator(forceDeployEcsTask);
        const getEcsServiceList = new aws_stepfunctions_tasks_1.CallAwsService(this, 'GetEcsServiceList', {
            comment: 'Fetch ECS Services',
            service: 'ECS',
            action: 'listServices',
            parameters: {
                Cluster: cluster.clusterName,
            },
            resultSelector: {
                'services.$': '$.ServiceArns',
            },
            iamResources: ['*'],
            iamAction: 'ecs:ListServices',
        });
        getEcsServiceList.next(forceDeployment);
        const checkInput = new sfn.Choice(this, 'CheckInput');
        checkInput.when(sfn.Condition.isPresent('$.services'), forceDeployment);
        checkInput.otherwise(getEcsServiceList);
        this.stateMachine = new sfn.StateMachine(this, 'StateMachine', {
            definition: checkInput,
        });
    }
    addTrigger(props) {
        const rule = props.rule;
        const input = props.input || {};
        const target = new targets.SfnStateMachine(this.stateMachine, {
            input: events.RuleTargetInput.fromObject(input),
        });
        rule.addTarget(target);
    }
}
exports.ForceDeployJob = ForceDeployJob;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWNzLWZvcmNlLWRlcGxveS1qb2IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZWNzLWZvcmNlLWRlcGxveS1qb2IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFHbkMsK0RBQWlEO0FBQ2pELHdFQUEwRDtBQUMxRCxtRUFBcUQ7QUFDckQsaUZBQXFFO0FBQ3JFLDJDQUF1QztBQU92QyxNQUFhLGNBQWUsU0FBUSxzQkFBUztJQUczQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTBCO1FBQ2xFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQztRQUU5QixNQUFNLGtCQUFrQixHQUFHLElBQUksd0NBQWMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDeEUsT0FBTyxFQUFFLHdCQUF3QjtZQUNqQyxPQUFPLEVBQUUsS0FBSztZQUNkLE1BQU0sRUFBRSxlQUFlO1lBQ3ZCLFVBQVUsRUFBRTtnQkFDVixTQUFTLEVBQUUsT0FBTyxDQUFDLFdBQVc7Z0JBQzlCLFdBQVcsRUFBRSxXQUFXO2dCQUN4QixvQkFBb0IsRUFBRSxJQUFJO2FBQzNCO1lBQ0QsWUFBWSxFQUFFLENBQUMsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsUUFBUSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsWUFBWSxPQUFPLENBQUMsV0FBVyxJQUFJLENBQUM7WUFDdkgsU0FBUyxFQUFFLG1CQUFtQjtTQUMvQixDQUFDLENBQUM7UUFFSCxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQzNELFNBQVMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUM7WUFDOUMsVUFBVSxFQUFFO2dCQUNWLFdBQVcsRUFBRSxtQkFBbUI7YUFDakM7U0FDRixDQUFDLENBQUM7UUFDSCxlQUFlLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFFN0MsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLHdDQUFjLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ3RFLE9BQU8sRUFBRSxvQkFBb0I7WUFDN0IsT0FBTyxFQUFFLEtBQUs7WUFDZCxNQUFNLEVBQUUsY0FBYztZQUN0QixVQUFVLEVBQUU7Z0JBQ1YsT0FBTyxFQUFFLE9BQU8sQ0FBQyxXQUFXO2FBQzdCO1lBQ0QsY0FBYyxFQUFFO2dCQUNkLFlBQVksRUFBRSxlQUFlO2FBQzlCO1lBQ0QsWUFBWSxFQUFFLENBQUMsR0FBRyxDQUFDO1lBQ25CLFNBQVMsRUFBRSxrQkFBa0I7U0FDOUIsQ0FBQyxDQUFDO1FBQ0gsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRXhDLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDdEQsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUN4RSxVQUFVLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFFeEMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUM3RCxVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7SUFFTCxDQUFDO0lBRUQsVUFBVSxDQUFDLEtBQW1CO1FBQzVCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDeEIsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDaEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDNUQsS0FBSyxFQUFFLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQztTQUNoRCxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pCLENBQUM7Q0FDRjtBQTlERCx3Q0E4REMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcyc7XHJcbmltcG9ydCB7IEFwcGxpY2F0aW9uTG9hZEJhbGFuY2VkRmFyZ2F0ZVNlcnZpY2UgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNzLXBhdHRlcm5zJztcclxuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMnO1xyXG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMtdGFyZ2V0cyc7XHJcbmltcG9ydCAqIGFzIHNmbiBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3RlcGZ1bmN0aW9ucyc7XHJcbmltcG9ydCB7IENhbGxBd3NTZXJ2aWNlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMtdGFza3MnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgQmFzZUZhcmdhdGVTZXJ2aWNlIH0gZnJvbSAnLi9lY3MtcGF0dGVybnMnO1xyXG5cclxuaW50ZXJmYWNlIEZvcmNlRGVwbG95Sm9iUHJvcHMge1xyXG4gIGNsdXN0ZXI6IGVjcy5DbHVzdGVyO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRm9yY2VEZXBsb3lKb2IgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHN0YXRlTWFjaGluZTogc2ZuLlN0YXRlTWFjaGluZTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEZvcmNlRGVwbG95Sm9iUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgY29uc3QgY2x1c3RlciA9IHByb3BzLmNsdXN0ZXI7XHJcblxyXG4gICAgY29uc3QgZm9yY2VEZXBsb3lFY3NUYXNrID0gbmV3IENhbGxBd3NTZXJ2aWNlKHRoaXMsICdGb3JjZURlcGxveUVjc1Rhc2snLCB7XHJcbiAgICAgIGNvbW1lbnQ6ICdGb3JjZSBkZXBsb3kgRUNTIFRhc2tzJyxcclxuICAgICAgc2VydmljZTogJ0VDUycsXHJcbiAgICAgIGFjdGlvbjogJ3VwZGF0ZVNlcnZpY2UnLFxyXG4gICAgICBwYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgJ0NsdXN0ZXInOiBjbHVzdGVyLmNsdXN0ZXJOYW1lLFxyXG4gICAgICAgICdTZXJ2aWNlLiQnOiAnJC5zZXJ2aWNlJyxcclxuICAgICAgICAnRm9yY2VOZXdEZXBsb3ltZW50JzogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgaWFtUmVzb3VyY2VzOiBbYGFybjoke2Nkay5Bd3MuUEFSVElUSU9OfTplY3M6JHtjZGsuQXdzLlJFR0lPTn06JHtjZGsuQXdzLkFDQ09VTlRfSUR9OnNlcnZpY2UvJHtjbHVzdGVyLmNsdXN0ZXJOYW1lfS8qYF0sXHJcbiAgICAgIGlhbUFjdGlvbjogJ2VjczpVcGRhdGVTZXJ2aWNlJyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGZvcmNlRGVwbG95bWVudCA9IG5ldyBzZm4uTWFwKHRoaXMsICdGb3JjZURlcGxveW1lbnQnLCB7XHJcbiAgICAgIGl0ZW1zUGF0aDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLnNlcnZpY2VzJyksXHJcbiAgICAgIHBhcmFtZXRlcnM6IHtcclxuICAgICAgICAnc2VydmljZS4kJzogJyQkLk1hcC5JdGVtLlZhbHVlJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gICAgZm9yY2VEZXBsb3ltZW50Lml0ZXJhdG9yKGZvcmNlRGVwbG95RWNzVGFzayk7XHJcblxyXG4gICAgY29uc3QgZ2V0RWNzU2VydmljZUxpc3QgPSBuZXcgQ2FsbEF3c1NlcnZpY2UodGhpcywgJ0dldEVjc1NlcnZpY2VMaXN0Jywge1xyXG4gICAgICBjb21tZW50OiAnRmV0Y2ggRUNTIFNlcnZpY2VzJyxcclxuICAgICAgc2VydmljZTogJ0VDUycsXHJcbiAgICAgIGFjdGlvbjogJ2xpc3RTZXJ2aWNlcycsXHJcbiAgICAgIHBhcmFtZXRlcnM6IHtcclxuICAgICAgICBDbHVzdGVyOiBjbHVzdGVyLmNsdXN0ZXJOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHRTZWxlY3Rvcjoge1xyXG4gICAgICAgICdzZXJ2aWNlcy4kJzogJyQuU2VydmljZUFybnMnLFxyXG4gICAgICB9LFxyXG4gICAgICBpYW1SZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgICBpYW1BY3Rpb246ICdlY3M6TGlzdFNlcnZpY2VzJyxcclxuICAgIH0pO1xyXG4gICAgZ2V0RWNzU2VydmljZUxpc3QubmV4dChmb3JjZURlcGxveW1lbnQpO1xyXG5cclxuICAgIGNvbnN0IGNoZWNrSW5wdXQgPSBuZXcgc2ZuLkNob2ljZSh0aGlzLCAnQ2hlY2tJbnB1dCcpO1xyXG4gICAgY2hlY2tJbnB1dC53aGVuKHNmbi5Db25kaXRpb24uaXNQcmVzZW50KCckLnNlcnZpY2VzJyksIGZvcmNlRGVwbG95bWVudCk7XHJcbiAgICBjaGVja0lucHV0Lm90aGVyd2lzZShnZXRFY3NTZXJ2aWNlTGlzdCk7XHJcblxyXG4gICAgdGhpcy5zdGF0ZU1hY2hpbmUgPSBuZXcgc2ZuLlN0YXRlTWFjaGluZSh0aGlzLCAnU3RhdGVNYWNoaW5lJywge1xyXG4gICAgICBkZWZpbml0aW9uOiBjaGVja0lucHV0LFxyXG4gICAgfSk7XHJcblxyXG4gIH1cclxuXHJcbiAgYWRkVHJpZ2dlcihwcm9wczogVHJpZ2dlclByb3BzKSB7XHJcbiAgICBjb25zdCBydWxlID0gcHJvcHMucnVsZTtcclxuICAgIGNvbnN0IGlucHV0ID0gcHJvcHMuaW5wdXQgfHwge307XHJcbiAgICBjb25zdCB0YXJnZXQgPSBuZXcgdGFyZ2V0cy5TZm5TdGF0ZU1hY2hpbmUodGhpcy5zdGF0ZU1hY2hpbmUsIHtcclxuICAgICAgaW5wdXQ6IGV2ZW50cy5SdWxlVGFyZ2V0SW5wdXQuZnJvbU9iamVjdChpbnB1dCksXHJcbiAgICB9KTtcclxuICAgIHJ1bGUuYWRkVGFyZ2V0KHRhcmdldCk7XHJcbiAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgVHJpZ2dlclByb3BzIHtcclxuICBydWxlOiBldmVudHMuUnVsZTtcclxuICBpbnB1dD86IEZvcmNlRGVwbG95Sm9iSW5wdXQ7XHJcbn1cclxuXHJcbmludGVyZmFjZSBGb3JjZURlcGxveUpvYklucHV0IHtcclxuICBzZXJ2aWNlcz86IHN0cmluZ1tdO1xyXG59XHJcbiJdfQ==