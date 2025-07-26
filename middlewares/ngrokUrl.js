import ngrok from "ngrok";
let domain = null;

export async function initNgrok(req,res,next){
    try {
        if (!domain) {
            domain = await ngrok.connect({
                addr: process.env.PORT || 8080,
                authToken: process.env.NGROK_AUTHTOKEN
            });
        }
        // Always attach domain to request
        req.domain = domain;
        next();
    } catch (error) {
        console.error('Ngrok error', error);
        next(error);
    }
}