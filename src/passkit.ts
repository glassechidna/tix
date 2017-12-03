import * as fs from 'fs';
import { ZipFile } from 'yazl';
import { WriteStream } from 'fs';
import { createHash } from 'crypto';
//import * as forge from 'node-forge';
const forge = require('node-forge');

export class Passkit {
    certificate: any;
    key: any;

    constructor(signerPem: string, pemPassword: string) {
      const buf = Buffer.from(signerPem, 'utf-8');
      this.certificate = forge.pki.certificateFromPem(buf);
      this.key = Passkit.decodePrivateKey(buf, pemPassword);
    }

    generateZip(bundle: PassBundle, output: WriteStream) {
        const zip = new ZipFile();
        zip.outputStream.pipe(output);

        const manifest: any = {};

        const passJson = Buffer.from(JSON.stringify(bundle.passJson), 'utf-8');
        manifest['pass.json'] = this.getBufferHash(passJson);
        zip.addBuffer(passJson, 'pass.json', { compress: false });

        const filePaths: any = {
          "icon.png": "assets/icon.png",
          "icon@2x.png": "assets/icon@2x.png",
          "logo.png": "assets/logo.png",
          "logo@2x.png": "assets/logo@2x.png",
        }

        for (const key of Object.keys(filePaths)) {
          const path = filePaths[key];
          const buf = fs.readFileSync(path);
          manifest[key] = this.getBufferHash(buf);
          zip.addBuffer(buf, key, { compress: false });
        }

        const manifestJson = JSON.stringify(manifest);
        zip.addBuffer(Buffer.from(manifestJson), "manifest.json", { compress: false });

        const signature = this.signManifest(manifestJson);
        zip.addBuffer(signature, "signature", { compress: false });

        zip.end();
    }

    private getBufferHash(buffer: Buffer): string {
        // creating hash
        const sha = createHash('sha1');
        sha.update(buffer);
        return sha.digest('hex');
    }

    private signManifest(manifest: string): Buffer {
        // create PKCS#7 signed data
        const p7 = forge.pkcs7.createSignedData();
        p7.content = manifest;
        p7.addCertificate(forge.pki.certificateFromPem(Passkit.wwdrPem()));
        p7.addCertificate(this.certificate);
        p7.addSigner({
            key: this.key,
            certificate: this.certificate,
            digestAlgorithm: forge.pki.oids.sha1,
            authenticatedAttributes: [
                {
                    type: forge.pki.oids.contentType,
                    value: forge.pki.oids.data,
                },
                {
                    type: forge.pki.oids.messageDigest,
                    // value will be auto-populated at signing time
                },
                {
                    type: forge.pki.oids.signingTime,
                    // value will be auto-populated at signing time
                    // value: new Date('2050-01-01T00:00:00Z')
                },
            ],
        });
      
        p7.sign();
        p7.contentInfo.value.pop();
      
        return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary');
    }

    private static decodePrivateKey(keydata: Buffer, password: string, returnPEM = false) {
      const pemMessages = forge.pem.decode(keydata);
    
      // getting signer private key
      const signerKeyMessage = pemMessages.find((message: any) =>
        message.type.includes('KEY'),
      );
    
      if (!signerKeyMessage) {
        throw new Error('Invalid certificate, no key found');
      }
    
      const key = forge.pki.decryptRsaPrivateKey(
        forge.pem.encode(signerKeyMessage),
        password,
      );
    
      if (!key) {
        if (
          (signerKeyMessage.procType &&
            signerKeyMessage.procType.type === 'ENCRYPTED') ||
          signerKeyMessage.type.includes('ENCRYPTED')
        ) {
          throw new Error('Unable to parse key, incorrect passphrase');
        }
      }
    
      if (returnPEM) return forge.pki.privateKeyToPem(key);
      return key;
    }

    static wwdrPem(): Buffer {
      return Buffer.from(`-----BEGIN CERTIFICATE-----
MIIEIjCCAwqgAwIBAgIIAd68xDltoBAwDQYJKoZIhvcNAQEFBQAwYjELMAkGA1UE
BhMCVVMxEzARBgNVBAoTCkFwcGxlIEluYy4xJjAkBgNVBAsTHUFwcGxlIENlcnRp
ZmljYXRpb24gQXV0aG9yaXR5MRYwFAYDVQQDEw1BcHBsZSBSb290IENBMB4XDTEz
MDIwNzIxNDg0N1oXDTIzMDIwNzIxNDg0N1owgZYxCzAJBgNVBAYTAlVTMRMwEQYD
VQQKDApBcHBsZSBJbmMuMSwwKgYDVQQLDCNBcHBsZSBXb3JsZHdpZGUgRGV2ZWxv
cGVyIFJlbGF0aW9uczFEMEIGA1UEAww7QXBwbGUgV29ybGR3aWRlIERldmVsb3Bl
ciBSZWxhdGlvbnMgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkwggEiMA0GCSqGSIb3
DQEBAQUAA4IBDwAwggEKAoIBAQDKOFSmy1aqyCQ5SOmM7uxfuH8mkbw0U3rOfGOA
YXdkXqUHI7Y5/lAtFVZYcC1+xG7BSoU+L/DehBqhV8mvexj/avoVEkkVCBmsqtsq
Mu2WY2hSFT2Miuy/axiV4AOsAX2XBWfODoWVN2rtCbauZ81RZJ/GXNG8V25nNYB2
NqSHgW44j9grFU57Jdhav06DwY3Sk9UacbVgnJ0zTlX5ElgMhrgWDcHld0WNUEi6
Ky3klIXh6MSdxmilsKP8Z35wugJZS3dCkTm59c3hTO/AO0iMpuUhXf1qarunFjVg
0uat80YpyejDi+l5wGphZxWy8P3laLxiX27Pmd3vG2P+kmWrAgMBAAGjgaYwgaMw
HQYDVR0OBBYEFIgnFwmpthhgi+zruvZHWcVSVKO3MA8GA1UdEwEB/wQFMAMBAf8w
HwYDVR0jBBgwFoAUK9BpR5R2Cf70a40uQKb3R01/CF4wLgYDVR0fBCcwJTAjoCGg
H4YdaHR0cDovL2NybC5hcHBsZS5jb20vcm9vdC5jcmwwDgYDVR0PAQH/BAQDAgGG
MBAGCiqGSIb3Y2QGAgEEAgUAMA0GCSqGSIb3DQEBBQUAA4IBAQBPz+9Zviz1smwv
j+4ThzLoBTWobot9yWkMudkXvHcs1Gfi/ZptOllc34MBvbKuKmFysa/Nw0Uwj6OD
Dc4dR7Txk4qjdJukw5hyhzs+r0ULklS5MruQGFNrCk4QttkdUGwhgAqJTleMa1s8
Pab93vcNIx0LSiaHP7qRkkykGRIZbVf1eliHe2iK5IaMSuviSRSqpd1VAKmuu0sw
ruGgsbwpgOYJd+W+NKIByn/c4grmO7i77LpilfMFY0GCzQ87HUyVpNur+cmV6U/k
TecmmYHpvPm0KdIBembhLoz2IYrF+Hjhga6/05Cdqa3zr/04GpZnMBxRpVzscYqC
tGwPDBUf
-----END CERTIFICATE-----
`);
    }
}