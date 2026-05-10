export default async function handler(req, res) {

    console.log("METHOD:", req.method);
    console.log("QUERY:", req.query);

    // WEBHOOK VERIFICATION
    if (req.method === "GET") {

        const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

        console.log("ENV TOKEN:", VERIFY_TOKEN);

        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        console.log("MODE:", mode);
        console.log("TOKEN:", token);
        console.log("CHALLENGE:", challenge);

        if (mode === "subscribe" && token === VERIFY_TOKEN) {

            console.log("VERIFIED SUCCESSFULLY");

            return res.status(200).send(challenge);
        }

        return res.status(403).send("Verification failed");
    }

    return res.status(200).json({
        success: true
    });
}