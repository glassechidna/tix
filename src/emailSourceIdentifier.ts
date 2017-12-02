import { Handler, Context, Callback } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { StepExecutionInput } from './stepTrigger';

export type EmailSourceIdentifierResponse = StepExecutionInput & {
  Source: "Village" | "Hoyts" | "Unknown";
}

const s3 = new AWS.S3();

async function getFromS3({ bucketName, objectKeyPrefix = "", objectKey }: { bucketName: string; objectKeyPrefix: string; objectKey: string; }): Promise<string> {
  const resp = await s3.getObject({ Bucket: bucketName, Key: `${objectKeyPrefix}${objectKey}` }).promise();
  const body = (resp.Body as Buffer).toString('utf-8');
  return body;
}

const handler = async (event: StepExecutionInput, context: Context, callback: Callback) => {
  const villageEmail = "noreply@mailout.villagecinemas.com.au";
  const hoytsEmail = "ticketing@hoyts.com.au";

  const emailBody = await getFromS3(event.Ses.receipt.action);

  if (emailBody.indexOf(villageEmail) !== -1) {
    const resp: EmailSourceIdentifierResponse = { Source: "Village", ...event };
    callback(undefined, resp);
  } else if (emailBody.indexOf(hoytsEmail) !== -1) {
    const resp: EmailSourceIdentifierResponse = { Source: "Hoyts", ...event };
    callback(undefined, resp);
  } else {
    const resp: EmailSourceIdentifierResponse = { Source: "Unknown", ...event };    
    callback(undefined, resp);
  }
};

export { handler }
