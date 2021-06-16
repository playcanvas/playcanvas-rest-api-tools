window.snapchatCta = function() {
    console.log('Snapchat CTA clicked');
    if (window.mraid) {
        mraid.open('{{ .ClickTrackingUrl }}');
    }
}
