import { maxVideoDuration } from "../../config.js";
import { cleanString } from "../../sub/utils.js";

let cachedID = {};

async function findClientID() {
    try {
        let sc = await fetch('https://soundcloud.com/').then((r) => { return r.text() }).catch(() => { return false });
        let scVersion = String(sc.match(/<script>window\.__sc_version="[0-9]{10}"<\/script>/)[0].match(/[0-9]{10}/));

        if (cachedID.version === scVersion) return cachedID.id;
        
        let scripts = sc.matchAll(/<script.+src="(.+)">/g);
        let clientid;
        for (let script of scripts) {
            let url = script[1];
    
            if (url && !url.startsWith('https://a-v2.sndcdn.com')) return;
    
            let scrf = await fetch(url).then((r) => {return r.text()}).catch(() => { return false });
            let id = scrf.match(/\("client_id=[A-Za-z0-9]{32}"\)/);
    
            if (id && typeof id[0] === 'string') {
                clientid = id[0].match(/[A-Za-z0-9]{32}/)[0];
                break;
            }
        }
        cachedID.version = scVersion;
        cachedID.id = clientid;

        return clientid;
    } catch (e) {
        return false;
    }
}

export default async function(obj) {
    let clientId = await findClientID();
    if (!clientId) return { error: 'ErrorSoundCloudNoClientId' };

    let link;
    if (obj.shortLink && !obj.author && !obj.song) {
        link = await fetch(`https://on.soundcloud.com/${obj.shortLink}/`, { redirect: "manual" }).then((r) => {
            if (r.status === 302 && r.headers.get("location").startsWith("https://soundcloud.com/")) {
                return r.headers.get("location").split('?', 1)[0]
            }
            return false
        }).catch(() => { return false });
    }
    if (!link && obj.author && obj.song) {
        link = `https://soundcloud.com/${obj.author}/${obj.song}${obj.accessKey ? `/s-${obj.accessKey}` : ''}`
    }
    if (!link) return { error: 'ErrorCouldntFetch' };

    let json = await fetch(`https://api-v2.soundcloud.com/resolve?url=${link}&client_id=${clientId}`).then((r) => {
        return r.status === 200 ? r.json() : false
    }).catch(() => { return false });
    if (!json) return { error: 'ErrorCouldntFetch' };

    if (!json["media"]["transcodings"]) return { error: 'ErrorEmptyDownload' };

    let fileUrlBase = json.media.transcodings.filter(v => v.preset === "opus_0_0")[0]["url"],
        fileUrl = `${fileUrlBase}${fileUrlBase.includes("?") ? "&" : "?"}client_id=${clientId}&track_authorization=${json.track_authorization}`;

    if (fileUrl.substring(0, 54) !== "https://api-v2.soundcloud.com/media/soundcloud:tracks:") return { error: 'ErrorEmptyDownload' };

    if (json.duration > maxVideoDuration) return { error: ['ErrorLengthAudioConvert', maxVideoDuration / 60000] };

    let file = await fetch(fileUrl).then(async (r) => { return (await r.json()).url }).catch(() => { return false });
    if (!file) return { error: 'ErrorCouldntFetch' };

    return {
        urls: file,
        audioFilename: `soundcloud_${json.id}`,
        fileMetadata: {
            title: cleanString(json.title.replace(/\p{Emoji}/gu, '').trim()),
            artist: cleanString(json.user.username.replace(/\p{Emoji}/gu, '').trim()),
        }
    }
}
