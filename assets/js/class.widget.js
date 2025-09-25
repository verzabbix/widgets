class WMRoute extends CWidget {

	#map = null;
	#map_layers = [];

	getUpdateRequestData() {
		return {
			...super.getUpdateRequestData(),
			with_templates: this.#map === null ? 1 : undefined,
			has_custom_time_period: this.getFieldsReferredData().has('time_period') ? undefined : 1
		}
	}

	promiseReady() {
		if (this.#map === null) {
			return Promise.resolve();
		}

		return new Promise(resolve => {
			this.#map.whenReady(() => {
				super.promiseReady()
					.then(() => setTimeout(resolve, 300));
			});
		});
	}

	promiseUpdate() {
		if (!this.hasEverUpdated() || this.isFieldsReferredDataUpdated()) {
			return super.promiseUpdate();
		}

		return Promise.resolve();
	}

	setContents(response) {
		if (response.points === undefined) {
			this.clearContents();

			super.setContents(response);

			return;
		}

		if (this.#map === null) {
			this.clearContents();

			super.setContents(response);

			this.#map = L.map(this._body.querySelector('.map-wrapper'));
			this.#map_layers = [];

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; OpenStreetMap contributors'
			}).addTo(this.#map);
		}

		this.#map_layers.forEach(layer => this.#map.removeLayer(layer));
		this.#map_layers = [];

		const polyline = L.polyline(response.points, {color: 'blue'});

		polyline.addTo(this.#map);

		console.log(this._body.querySelector('template.svg-marker'));

		const icon = L.icon({
			iconUrl: `data:image/svg+xml;base64,${btoa(this._body.querySelector('template.svg-marker').innerHTML)}`,
			iconSize: [46, 61],
			iconAnchor: [22, 44]
		});

		const marker = L.marker(...response.points.slice(-1), {icon});

		marker.addTo(this.#map);

		this.#map.fitBounds(response.points);

		this.#map_layers.push(polyline, marker);
	}

	onClearContents() {
		if (this.#map !== null) {
			this.#map.remove();
		}

		this.#map = null;
		this.#map_layers = [];
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
