import { Handler, Context, Callback, SNSEvent, SNSEventRecord } from 'aws-lambda';

import * as AWS from 'aws-sdk';
const Step = new AWS.StepFunctions();

async function handleRecord(record: SNSEventRecord): Promise<{ executionArn: string; startDate: Date; }> {
  const stateMachineArn = process.env.STEP_MACHINE_ARN || '';
  const input = JSON.stringify(record.Sns);

  var resp = await Step.startExecution({ stateMachineArn, input }).promise()    
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