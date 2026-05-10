import type {NextApiRequest, NextApiResponse} from 'next'


function first(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0]
    return value
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<string | { success: boolean }>
) {
    console.log('METHOD:', req.method)
    console.log('QUERY:', req.query)

    if (req.method === 'GET') {

        const VERIFY_TOKEN = "flux3d_verify";
        const mode = first(req.query['hub.mode'])
        const token = first(req.query['hub.verify_token'])
        const challenge = first(req.query['hub.challenge'])

        console.log('ENV TOKEN:', VERIFY_TOKEN)
        console.log('MODE:', mode)
        console.log('TOKEN:', token)
        console.log('CHALLENGE:', challenge)

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('VERIFIED SUCCESSFULLY')
            return res.status(200).send(challenge ?? '')
        }

        return res.status(403).send('Verification failed')
    }

    return res.status(200).json({
        success: true,
    })
}
