import { Handler, Context, Callback } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { EmailSourceIdentifierResponse } from './emailSourceIdentifier';
import { Passkit } from './passkit';
import * as fs from 'fs';

export type CinemaResponse = EmailSourceIdentifierResponse & {

}

const handler = async (event: EmailSourceIdentifierResponse, context: Context, callback: Callback) => {
    const passBundle: PassBundle = {
        passJson: {
            description: "Village test",
            formatVersion: 1,
            organizationName: "tix.ge.cx",
            passTypeIdentifier: "pass.com.glassechidna.passtest",
            serialNumber: "12345",
            teamIdentifier: "QUKQK3GKXK",
            
            barcodes: [
                {
                    altText: "C023 QCC85S8",
                    format: "PKBarcodeFormatQR",
                    message: "C023 QCC85S8",
                    messageEncoding: "iso-8859-1"
                }
            ]
        }
    }

    const file = fs.createWriteStream('output.pkpass');
    var prom = new Promise((resolve, reject) => {
        file.on("close", () => resolve());            
    });

    Passkit.generateZip(passBundle, file);
    // await prom;    

    callback(undefined, {
        ...event
    })
};
  
export { handler }

(function() {
    handler(null as any, null as any, () => null);
})();
  