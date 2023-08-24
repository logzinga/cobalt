export default function (inHost, inURL) {
    let host = String(inHost);
    let url = String(inURL);

    switch(host) {
        case "youtu":
            if (url.startsWith("https://youtu.be/")) {
                host = "youtube";
                url = `https://youtube.com/watch?v=${url.replace("https://youtu.be/", "")}`;
            }
            break;
        case "vxtwitter":
        case "x":
            if (url.startsWith("https://x.com/")) {
                host = "twitter";
                url = url.replace("https://x.com/", "https://twitter.com/")
            }
            if (url.startsWith("https://vxtwitter.com/")) {
                host = "twitter";
                url = url.replace("https://vxtwitter.com/", "https://twitter.com/")
            }
            break;
        case "tumblr":
            if (!url.includes("blog/view")) {
                if (url.slice(-1) === '/') url = url.slice(0, -1);
                url = url.replace(url.split('/')[5], '')
            }
            break;
    }
    return {
        host: host,
        url: url
    }
}
