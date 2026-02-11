async function loopAdCheck() {
    while (true) {
        await new Promise(res => setTimeout(res, 500));
        const adLayer = document.getElementById('ad-layer');
        const adStatus = localStorage.getItem('ad_status');

        if (adStatus === 'running') {
            adLayer.style.display = 'flex';
        } else {
            adLayer.style.display = 'none';
        }
    }
}

loopAdCheck();
