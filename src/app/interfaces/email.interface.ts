export interface SendEmailOptions {
    to: string;
    subject: string;
    templateName: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    templateData: Record<string, any>;
    attachments?: {
        filename: string;
        content: Buffer | string;
        contentType: string;
    }[];
};