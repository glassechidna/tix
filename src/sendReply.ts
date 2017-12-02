import { Handler, Context, Callback } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { CinemaResponse } from './village';

const SES = new AWS.SES();

const handler = async (event: CinemaResponse, context: Context, callback: Callback) => {
    const resp = await SES.sendEmail({
        Destination: {
            ToAddresses: [event.Ses.mail.commonHeaders.returnPath]
        },
        Message: {
            Body: {
                Text: {
                    Data: `hello world with\n${JSON.stringify(event, null, 2)}`
                }
            },
            Subject: {
                Data: "my subject"
            }
        },
        Source: "beta@tix.ge.cx"
    }).promise();
};
  
export { handler }
  