interface SesNotification {
    notificationType: "Received";
    mail: {
        timestamp: string;
        source: string;
        messageId: string;
        destination: string[];
        headersTruncated: boolean;
        headers: { name: string; value: string; }[];
        commonHeaders: {
            returnPath: string;
            from: string[];
            date: string;
            to: string[];
            messageId: string;
            subject: string;
        }
    }
    receipt: {
        timestamp: string;
        processingTimeMillis: number;
        recipients: string[];
        spamVerdict: { status: string; };
        virusVerdict: { status: string; };
        spfVerdict: { status: string; };
        dkimVerdict: { status: string; };
        dmarcVerdict: { status: string; };
        action: {
            type: "S3";
            topicArn: string;
            bucketName: string;
            objectKeyPrefix: string;
            objectKey: string;
        }
    }
}
