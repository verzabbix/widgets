class WMRoute extends CWidget {

	#map = null;

	promiseReady() {
		return new Promise(resolve => {
			this.#map.whenReady(() => {
				super.promiseReady()
					.then(() => setTimeout(resolve, 300));
			});
		});
	}

	promiseUpdate() {
		if (!this.hasEverUpdated()) {
			const map_wrapper = document.createElement('div');

			map_wrapper.style.height = '100%';

			this._body.appendChild(map_wrapper);

			this.#map = L.map(map_wrapper).setView([51.505, -0.09], 13);

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; OpenStreetMap contributors'
			}).addTo(this.#map);
		}

		return Promise.resolve();
	}

	onResize() {
		if (this.#map !== null) {
			this.#map.invalidateSize();
		}
	}

	hasPadding() {
		return false;
	}
}
