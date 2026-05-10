import type {NextApiRequest, NextApiResponse} from "next";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

function first(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0];
    return value;
}

async function sendWhatsAppMessage(to: string, message: string) {

    const url =
        `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            text: {
                body: message,
            },
        }),
    });
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {

    // WEBHOOK VERIFICATION
    if (req.method === "GET") {

        const VERIFY_TOKEN = "flux3d_verify";

        const mode = first(req.query["hub.mode"]);
        const token = first(req.query["hub.verify_token"]);
        const challenge = first(req.query["hub.challenge"]);

        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            return res.status(200).send(challenge ?? "");
        }

        return res.status(403).send("Verification failed");
    }

    // WHATSAPP MESSAGE RECEIVED
    if (req.method === "POST") {

        try {

            console.log("WHATSAPP EVENT:");
            console.log(JSON.stringify(req.body, null, 2));

            const message =
                req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

            if (!message) {
                return res.status(200).json({
                    success: true,
                });
            }

            const from = message.from;
            const text = message.text?.body;

            console.log("FROM:", from);
            console.log("TEXT:", text);

            // OPENAI RESPONSE
            const completion = await openai.chat.completions.create({
                model: "gpt-4.1-mini",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are Flux3D AI assistant for a 3D printing business in Mumbai. Help customers with pricing, materials, and orders.",
                    },
                    {
                        role: "user",
                        content: text,
                    },
                ],
            });

            const aiReply =
                completion.choices[0]?.message?.content ||
                "Sorry, I could not process that.";

            console.log("AI REPLY:", aiReply);

            // SEND WHATSAPP REPLY
            await sendWhatsAppMessage(from, aiReply);

            return res.status(200).json({
                success: true,
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                success: false,
            });
        }
    }

    return res.status(405).send("Method not allowed");
}