import * as fs from 'fs';
import { ZipFile } from 'yazl';
import { WriteStream } from 'fs';
import { createHash } from 'crypto';
//import * as forge from 'node-forge';
const forge = require('node-forge');

export class Passkit {
    static generateZip(bundle: PassBundle, output: WriteStream) {
        const zip = new ZipFile();
        zip.outputStream.pipe(output);

        const manifest: any = {};

        const passJson = Buffer.from(JSON.stringify(bundle.passJson), 'utf-8');
        manifest['pass.json'] = this.getBufferHash(passJson);
        zip.addBuffer(passJson, 'pass.json', { compress: false });

        const manifestJson = JSON.stringify(manifest);
        zip.addBuffer(Buffer.from(manifestJson), "manifest.json", { compress: false });

        const signature = this.signManifest(this.signerPem(), "abcd", manifestJson);
        zip.addBuffer(signature, "signature", { compress: false });

        zip.end();
    }

    static getBufferHash(buffer: Buffer): string {
        // creating hash
        const sha = createHash('sha1');
        sha.update(buffer);
        return sha.digest('hex');
    }

    static signManifest(signerPem: Buffer, password: string, manifest: string): Buffer {
        const certificate = forge.pki.certificateFromPem(signerPem);
      
        // getting signer private key
        const key = this.decodePrivateKey(signerPem, password);
      
        // create PKCS#7 signed data
        const p7 = forge.pkcs7.createSignedData();
        p7.content = manifest;
        p7.addCertificate(certificate);
        p7.addCertificate(forge.pki.certificateFromPem(this.wwdrPem()));
        p7.addSigner({
          key,
          certificate,
          digestAlgorithm: forge.pki.oids.sha1,
          authenticatedAttributes: [
            {
              type: forge.pki.oids.contentType,
              value: forge.pki.oids.data,
            },
            {
              type: forge.pki.oids.messageDigest,
              value: forge.pki.oids.sha1,
              // value will be auto-populated at signing time
            },
            // {
            //   type: forge.pki.oids.signingTime,
            //   // value will be auto-populated at signing time
            //   // value: new Date('2050-01-01T00:00:00Z')
            // },
          ],
        });
      
        p7.sign();
        p7.contentInfo.value.pop();
      
        return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary');
    }

    static decodePrivateKey(keydata: Buffer, password: string, returnPEM = false) {
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

    static signerPem(): Buffer {
      return Buffer.from(`-----BEGIN CERTIFICATE-----
  MIIGBzCCBO+gAwIBAgIIPtBcDSyh1l0wDQYJKoZIhvcNAQEFBQAwgZYxCzAJBgNV
  BAYTAlVTMRMwEQYDVQQKDApBcHBsZSBJbmMuMSwwKgYDVQQLDCNBcHBsZSBXb3Js
  ZHdpZGUgRGV2ZWxvcGVyIFJlbGF0aW9uczFEMEIGA1UEAww7QXBwbGUgV29ybGR3
  aWRlIERldmVsb3BlciBSZWxhdGlvbnMgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkw
  HhcNMTcxMjAyMDEwNDQxWhcNMTgxMjAyMDEwNDQxWjCBqTEuMCwGCgmSJomT8ixk
  AQEMHnBhc3MuY29tLmdsYXNzZWNoaWRuYS5wYXNzdGVzdDE1MDMGA1UEAwwsUGFz
  cyBUeXBlIElEOiBwYXNzLmNvbS5nbGFzc2VjaGlkbmEucGFzc3Rlc3QxEzARBgNV
  BAsMClFVS1FLM0dLWEsxHjAcBgNVBAoMFUdsYXNzIEVjaGlkbmEgUHR5IEx0ZDEL
  MAkGA1UEBhMCVVMwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQClPg5M
  XOz9YE1j+lD677rq7xUoUIfDZLCkc5qPxKnXE2hlZTl8vw+fc/0RMSAL/QN/1D5i
  tpsjmC2HHHCCEN41D1+Ctk9ZVvwLWGOxpuvp2oDrp7xQqqmzQY0NTkxJB0RSIURy
  r8M0Ly7MjkQxbdMutz1hnjzQddF7tvbiwx+kkt6r9KlKyq9QeWd6/WiZnPWlqoT0
  NVNu3cVw4Sy9Z3ly+ygn4IADnCjHwRYzz3tYjiQkAQYwtLnT2xQ7umDc0c248rTH
  WjtqMrvHeZC/z5NndD2Fr2/djHV9Ir5MU+17ZptNR8Fwyf2EhkoasesoabNMnl6Y
  BdXUelMA9XRkNw69AgMBAAGjggJCMIICPjA9BggrBgEFBQcBAQQxMC8wLQYIKwYB
  BQUHMAGGIWh0dHA6Ly9vY3NwLmFwcGxlLmNvbS9vY3NwLXd3ZHIwMzAdBgNVHQ4E
  FgQUnFMeVu8XdX0jte+MLHSYaqx5kFMwCQYDVR0TBAIwADAfBgNVHSMEGDAWgBSI
  JxcJqbYYYIvs67r2R1nFUlSjtzCCAQ8GA1UdIASCAQYwggECMIH/BgkqhkiG92Nk
  BQEwgfEwKQYIKwYBBQUHAgEWHWh0dHA6Ly93d3cuYXBwbGUuY29tL2FwcGxlY2Ev
  MIHDBggrBgEFBQcCAjCBtgyBs1JlbGlhbmNlIG9uIHRoaXMgY2VydGlmaWNhdGUg
  YnkgYW55IHBhcnR5IGFzc3VtZXMgYWNjZXB0YW5jZSBvZiB0aGUgdGhlbiBhcHBs
  aWNhYmxlIHN0YW5kYXJkIHRlcm1zIGFuZCBjb25kaXRpb25zIG9mIHVzZSwgY2Vy
  dGlmaWNhdGUgcG9saWN5IGFuZCBjZXJ0aWZpY2F0aW9uIHByYWN0aWNlIHN0YXRl
  bWVudHMuMDAGA1UdHwQpMCcwJaAjoCGGH2h0dHA6Ly9jcmwuYXBwbGUuY29tL3d3
  ZHJjYS5jcmwwCwYDVR0PBAQDAgeAMB4GA1UdJQQXMBUGCCsGAQUFBwMCBgkqhkiG
  92NkBA4wEAYKKoZIhvdjZAYDAgQCBQAwLgYKKoZIhvdjZAYBEAQgDB5wYXNzLmNv
  bS5nbGFzc2VjaGlkbmEucGFzc3Rlc3QwDQYJKoZIhvcNAQEFBQADggEBAJCDhlpp
  Mwfk8c6tEtntGoXQrEQejaH8PvSaTXFer3FWuuMpMXuKUGvtsfj3jnIX4QlEQV61
  f2q4ZtU/mhZnQw3asttdc/867xfi5K1NdFn3UfROZ3pqjWTdP/1vs9OQNh4TGo89
  PdyCC+Y3zUtSyBLGOHtakXCbvk/TcSu6JXPzvPRybXz22l5/wqVU3BLP0XVmA+Bp
  rE5dsfySHu5i8q7mW1CQz26iTTu2pNVDtrgRQwiCdJ/T1umneCc4Gewl63WOHbyz
  O/29hXxHM9RRsgogqcBsim7MHD2Le6yeBy34kLZlNaJ/VZ97Lcq3aJzf4Nt0gjGT
  bDCQe/22TrWwrqU=
  -----END CERTIFICATE-----
  -----BEGIN ENCRYPTED PRIVATE KEY-----
  MIIFDjBABgkqhkiG9w0BBQ0wMzAbBgkqhkiG9w0BBQwwDgQIUCj2JVcPoh4CAggA
  MBQGCCqGSIb3DQMHBAjx3CoMqIQxtgSCBMi1yAivxIFAArXUFf/qoeOWjIdeEkPl
  mt/HtjN4+NISFHwFhhUPY3ppgusIHY9QWqBFKTHGdTWFvt8IBA6CBJzYjMhUtrYH
  DoL21reKMmrsnIV8ZZ3AMYrcLNiQbWJw7yNdSYAJnPnqrMze0r5xh+l6dnWHdGNB
  tFs34oPr6mdjl1aWnnXlYVU8wtQ3lllWbSZQb00jDbdbeyWuSijPgLYDjiVFP9LG
  nzDMKGi8Ao79yvORKC1Wh6nRje7Hv6/PUju8Pyt3pdqo2pivs2uRjLojBBCwNycJ
  GFOaoSEOEke4WHzf2t0Znx+qctvauqeThnRbGxfGy7pUzpkfsbkfZllW499VHVhb
  OYoycFMq3Rrw9yXBkDrCN+RL/eT02AzcvHjCbN7wTUyxNa8XwZfGk5nL1vP3BFYO
  PmK/crxt8NdaTQtBUEpU8M8eeLmWqNF6QFMuwZGOVGgri0INzIL/uwFvCYfe0sG8
  sUnqxBOkSu/35OvgZp48gbXeEdp95J8IRxORtH7ND5jMguQmH6C+SgN6MR8MDTMi
  zQ91AiGwFxEDzVjRkNKaSfPejlluYGYVy9/wX09x7SczReILcrI2xJwxQlX2AJNf
  rHWuF3LIVcBXgfIJafGBcklb5cJYsszRA7wGl1pjdpR9PefcV+1o8gRXjUBlgsDo
  dB8ezhvXA0ZIblmDm4jOraSQp06ilWcs/7sPFLpuAf2QGnc5P7sWsDlrrhfzJV2Q
  Yrf5na1t4azly/1IXHQJGZ+WuEQTYd/Q2bbI1zFE22co/8k8yNhzPbmYIiK//Rm0
  xSdlDi2kBExUuDcTnQ2gS/8meWziiiFSPEK1bGo7JGw/GGw/hFX8gezdwRdJXNJI
  s7EpEMr042cWQScWZO8pug79qPv1aMZarfXRDXo60FiociXxdk8T81oo3ODd7ks4
  SbV6TaqHMgaF7VVkhFWZUY7wV6YsfMtWPRFV9jSswRX9/6hK9JV7ww2IjUGAkr/h
  E+3KtbONJj7/SqchroSC1ZSRwdDPlD2AkM49ByxWAgnDSPCC1RWyHlF8uZJmLrpx
  TXyw4S8IHNQ0GzQQTtAzTq77Nq+LMFaOKnnbz2vIQevyi+gI/cmOuEXakUbhwcTf
  Qe8qKF1v4pyt8vSeWSXfHiU0a4JR37BN3EFhRSaj3lkpp2nzDemwou1jzjZpZsbz
  RlsNpD33h0uXqpIS9GfUTt3XYVnmHaf2lMwTMOgVZRBMIxDFBVNfJ1M0GggyyDSz
  dEl/lMZbPLdSsbPvjSeJF4NgA9ILdT5Vs96aOISZzL8Tk/rBC62uMJ4w9CfMFqLm
  MbpSyD/ppb/ZNyutyNDZhDBOeQNe8mgulXmmqTdiTIaVW1pqFC5/TvWSj4uRbLpb
  ncMPBypiggOb1iWWH1MP7KmIIj0IoQvHdkV88MAoS7X+1MRZVfLdHzWptEXu/Yfm
  cDrbJxE2yEABIwlTcEhTYzdZYn6U9giDJ38PPOEHKxfAaDpxy2sqFvDjwrscTFNx
  jkMvWhJNADBmjM6UCLOyq6BtNO/2Xi/AgQ12MZgAvx1N2RAECVrHkU1E2mjY1Hzj
  pZueupvBlY/8vE2Yd/xqYSEvFR6CAvXzHYrFjJzaI6odNB/qb6zF1Iub6KfvhSZX
  QW0=
  -----END ENCRYPTED PRIVATE KEY----- 
`);
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