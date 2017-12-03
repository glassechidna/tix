import { Handler, Context, Callback } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as nodemailer from 'nodemailer';
import { PkpassResponse } from './pkpass';

const SES = new AWS.SES();
const S3 = new AWS.S3();

function presignedUrl(Bucket: string, Key: string, Expires = 900): Promise<string> {
    return new Promise((resolve, reject) => {
        S3.getSignedUrl('getObject', { Bucket, Key, Expires }, (err, data) => {
            if (err != null) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    });
}

const handler = async (event: PkpassResponse, context: Context, callback: Callback) => {
    try {
        // const pkpassUrl = await presignedUrl(event.PkpassS3.Bucket, event.PkpassS3.Key);
        let transporter = nodemailer.createTransport({ SES });

        let s3Resp = await S3.getObject(event.PkpassS3).promise();
        
        // send some mail
        let resp = await transporter.sendMail({
            from: 'beta@tix.ge.cx',
            to: event.Ses.mail.commonHeaders.returnPath,
            subject: `${event.PassBundle.passJson.description} - Wallet Pass`,
            text: 'I hope this message gets sent!',
            attachments: [
                {
                    filename: 'pass.pkpass',
                    contentType: 'application/vnd.apple.pkpass',
                    content: s3Resp.Body as Buffer
                }
            ]
        });

        // const resp = await SES.sendEmail({
        //     Destination: {
        //         ToAddresses: [event.Ses.mail.commonHeaders.returnPath]
        //     },
        //     Message: {
        //         Body: {
        //             Text: {
        //                 Data: `hello world with\nurl: ${pkpassUrl}\n\n with\n${JSON.stringify(event, null, 2)}`
        //             }
        //         },
        //         Subject: {
        //             Data: "my subject"
        //         }
        //     },
        //     Source: "beta@tix.ge.cx"
        // }).promise();

        callback(undefined, { ...event, Done: true });
    } catch(e) {
        callback(e, undefined);
    }

};
  
export { handler }
  