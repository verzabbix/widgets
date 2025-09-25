class WMRoute extends CWidget {

	promiseUpdate() {
		if (!this.hasEverUpdated()) {
			const map_wrapper = document.createElement('div');

			map_wrapper.style.height = '100%';

			this._body.appendChild(map_wrapper);

			const map = L.map(map_wrapper).setView([51.505, -0.09], 13);

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; OpenStreetMap contributors'
			}).addTo(map);
		}

		return Promise.resolve();
	}
}
