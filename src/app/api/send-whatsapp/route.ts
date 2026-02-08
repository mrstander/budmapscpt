import { NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export async function POST(request: Request) {
    try {
        const { phoneNumber, message } = await request.json();

        console.log("API received request for:", phoneNumber);

        if (!phoneNumber || !message) {
            console.error("Missing phone number or message");
            return NextResponse.json({ success: false, error: 'Missing phone number or message' }, { status: 400 });
        }

        // Twilio WhatsApp numbers require the 'whatsapp:' prefix
        const to = phoneNumber.startsWith('whatsapp:') ? phoneNumber : `whatsapp:${phoneNumber}`;
        // Ensure the from number also has the prefix if it's not in the env var
        let from = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
        if (!from.startsWith('whatsapp:')) {
            from = `whatsapp:${from}`;
        }

        console.log(`Sending WhatsApp from ${from} to ${to}`);

        const response = await client.messages.create({
            body: message,
            from: from,
            to: to,
        });

        return NextResponse.json({ success: true, sid: response.sid });
    } catch (error: any) {
        console.error('Error sending WhatsApp message:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
