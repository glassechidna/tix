import { Handler, Context, Callback } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { EmailSourceIdentifierResponse } from './emailSourceIdentifier';
import { Passkit } from './passkit';
import * as fs from 'fs';
import * as Key from './gekey';
import { simpleParser } from 'mailparser';
import { downloadEmail }  from './emailSourceIdentifier';

async function extractHoytsInfo(event: EmailSourceIdentifierResponse) {
    const email = await downloadEmail(event.Ses.receipt.action);
    const res = await simpleParser(email);
    let text = res.text;

    // we do this because otherwise the regex for "> Date:" below matches 
    // the forwarded email headers
    const offset = text.indexOf('> Booking No.:')
    text = text.slice(offset);

    const m = (field: string): string => {
        var re = new RegExp(`> ${field}:\\s+(.+)`);
        return text.match(re)![1];
    }

    const code = m('Booking No.');
    const location = m('Cinema');
    const date = m('Date');
    const time = m('Start Time');
    const seats = m('Seating');
    const cinema = text.match(/Your movie is in:\n>+ (.+)/)![1];

    return { code, location, date, time, seats, cinema };
}


export type CinemaResponse = EmailSourceIdentifierResponse & {
    PassBundle: PassBundle
}

const hoyts = async (event: EmailSourceIdentifierResponse, context: Context, callback: Callback) => {
    try {
        const info = await extractHoytsInfo(event);
        const sessionInfo: MovieSessionInfo = {
            chain: "Hoyts",
            movieName: "",
            startingTime: new Date(),
            code: info.code,
            codeFormat: "PKBarcodeFormatCode128",
            seats: info.seats,
            cinemaNumber: info.cinema,
            location: { longitude: 0, latitude: 0 } 
        }
    
        const resp: CinemaResponse = { ...event, PassBundle: sessionInfoToPassBundle(sessionInfo) };
        callback(undefined, resp);
    } catch(e) {
        callback(e, undefined);
    }
}

interface MovieSessionInfo {
    chain: "Hoyts" | "Village";
    movieName: string;
    startingTime: Date;
    code: string;
    codeFormat: BarcodeFormat
    seats: string;
    cinemaNumber: string;
    location: PasskitLocation;
}

function sessionInfoToPassBundle(info: MovieSessionInfo): PassBundle {
    return {
        passJson: {
            description: info.movieName,
            formatVersion: 1,
            organizationName: "tix.ge.cx",
            passTypeIdentifier: "pass.com.glassechidna.passtest",
            teamIdentifier: "QUKQK3GKXK",
            serialNumber: "1234",
            
            barcodes: [
                {
                    altText: info.code,
                    format: info.codeFormat,
                    message: info.code,
                    messageEncoding: "iso-8859-1"
                }
            ],
            locations: [
                info.location
            ],
            logoText: info.movieName,
            foregroundColor: "rgb(234, 186, 88)",
            backgroundColor: "rgb(54, 99, 184)",
            eventTicket: {
                primaryFields: [
                    {
                        key: "movieTime",
                        label: "Starting time",
                        value: "2013-04-24T10:00-05:00"
                    }
                ],
                secondaryFields: [
                    {
                        key: "cinemaNumber",
                        label: "Cinema number",
                        value: info.cinemaNumber
                    },
                    {
                        key: "seats",
                        label: "Seats",
                        value: info.seats
                    }
              ],
            }
        }
    }
}


const village = async (event: EmailSourceIdentifierResponse, context: Context, callback: Callback) => {
    try {
        const sessionInfo: MovieSessionInfo = {
            chain: "Village",
            movieName: "",
            startingTime: new Date(),
            code: "C023 QCC85S8",
            codeFormat: "PKBarcodeFormatQR",
            seats: "",
            cinemaNumber: "",
            location: { longitude: 0, latitude: 0 } 
        }
    
        const resp: CinemaResponse = { ...event, PassBundle: sessionInfoToPassBundle(sessionInfo) };
        callback(undefined, resp);
    } catch(e) {
        callback(e, undefined);        
    }
};
  
export { village, hoyts };
