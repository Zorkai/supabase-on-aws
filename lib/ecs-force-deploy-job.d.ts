import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as events from 'aws-cdk-lib/aws-events';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
interface ForceDeployJobProps {
    cluster: ecs.Cluster;
}
export declare class ForceDeployJob extends Construct {
    stateMachine: sfn.StateMachine;
    constructor(scope: Construct, id: string, props: ForceDeployJobProps);
    addTrigger(props: TriggerProps): void;
}
interface TriggerProps {
    rule: events.Rule;
    input?: ForceDeployJobInput;
}
interface ForceDeployJobInput {
    services?: string[];
}
export {};
