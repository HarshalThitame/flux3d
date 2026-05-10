import type {NextApiRequest, NextApiResponse} from "next";

function first(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0];
    return value;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {

    // META WEBHOOK VERIFICATION
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

    // INCOMING WHATSAPP MESSAGE
    if (req.method === "POST") {

        console.log("WHATSAPP WEBHOOK:");
        console.log(JSON.stringify(req.body, null, 2));

        return res.status(200).json({
            success: true,
        });
    }

    return res.status(405).send("Method not allowed");
}