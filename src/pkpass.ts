import { Handler, Context, Callback } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { EmailSourceIdentifierResponse } from './emailSourceIdentifier';
import { Passkit } from './passkit';
import * as fs from 'fs';
import * as GeKey from './gekey';
import { simpleParser } from 'mailparser';
import { downloadEmail }  from './emailSourceIdentifier';
import { CinemaResponse } from './cinemas';

export type PkpassResponse = CinemaResponse & {
    PkpassS3: {
        Bucket: string;
        Key: string;
    }
}

const S3 = new AWS.S3();

const handler = async (event: CinemaResponse, context: Context, callback: Callback) => {
    try {
        const path = '/tmp/output.pkpass'
        const file = fs.createWriteStream(path);
        const prom = new Promise((resolve, reject) => {
            file.on("close", () => resolve());            
        });
    
        const pkit = new Passkit(GeKey.CertAndKeyPem, GeKey.Password);
        pkit.generateZip(event.PassBundle, file);
        await prom;
        
        const Bucket = process.env.OUTPUT_BUCKET as string;
        const Key = `${event.Id}.pkpass`;
        const zipReadStream = fs.createReadStream('/tmp/output.pkpass')
        const s3Resp = await S3.putObject({ Bucket, Key, Body: zipReadStream, ContentType: "application/vnd.apple.pkpass" }).promise();
    
        const resp: PkpassResponse = { ...event, PkpassS3: { Bucket, Key } };
        callback(undefined, resp);
    } catch(e) {
        callback(e, undefined);
    }
};
  
export { handler };
