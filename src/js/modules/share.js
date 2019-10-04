const twitterBaseUrl = 'https://twitter.com/intent/tweet?text=';
const googleBaseUrl = 'https://plus.google.com/share?url=';

export default function share(title, shareURL, fbImg, twImg, hashTag, message='') {
    var twImgText = twImg ? ` ${twImg.trim()} ` : ' ';
    return function (network, extra='') {
        var twitterMessage = `${extra}${title}${twImgText}${hashTag}`;
        var shareWindow;

        if (network === 'twitter') {
            shareWindow = twitterBaseUrl + encodeURIComponent(message + ' ') + shareURL;
        } else if (network === 'email') {
            shareWindow = 'mailto:?subject=' + encodeURIComponent(title) + '&body=' + shareURL;
        } else if (network === 'google') {
            shareWindow = googleBaseUrl + shareURL;
        }

        if (network != 'facebook') {
            window.open(shareWindow, network + 'share', 'width=640,height=320');
        } else {

          if (FB) { //http://drib.tech/programming/dynamically-change-facebook-open-graph-meta-data-javascript

            console.log("Initiated Facebook dynamic share stuff")

            FB.ui({
              method: 'share_open_graph',
              action_type: 'og.likes',
              action_properties: JSON.stringify({
                object: {
                  'og:url': shareURL,
                  'og:title': title,
                  'og:description': message,
                  'og:image': fbImg
                }
              })
            },
            function (response) {
            // Action after response
              console.log("Facebook share stuff worked")
            });


          }

        }
        
    }
}