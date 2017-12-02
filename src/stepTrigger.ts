import { Handler, Context, Callback, SNSEvent, SNSEventRecord } from 'aws-lambda';
import * as UUID from 'uuid/v4';

import * as AWS from 'aws-sdk';
const Step = new AWS.StepFunctions();

export interface StepExecutionInput {
  Id: string;
  Ses: SesNotification;
}

async function handleRecord(record: SNSEventRecord): Promise<{ executionArn: string; startDate: Date; }> {
  const stateMachineArn = process.env.STEP_MACHINE_ARN || '';
  const name = UUID(); // we do this because the aws-generated id isn't made available to us. https://forums.aws.amazon.com/thread.jspa?threadID=244274
  const input = JSON.stringify({ Id: name, Ses: JSON.parse(record.Sns.Message) });

  var resp = await Step.startExecution({ stateMachineArn, name, input }).promise()    
  return { executionArn: resp.executionArn, startDate: resp.startDate };
}

const handler = async (event: SNSEvent, context: Context, callback: Callback) => {
  for (const record of event.Records) {
    try {
      await handleRecord(record);
    } catch (e) {
      console.log("Got an error");
      console.log(JSON.stringify(record));
      callback(e, undefined);
    }
  }

  callback(undefined, {});
};

export { handler }