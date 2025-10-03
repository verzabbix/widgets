/**
 * Custom presentation class for the Route widget.
 *
 * Extends the base class which implements the default functionality of any widget.
 */
class WMRoute extends CWidget {

	/**
	 * Map object of the Leaflet component.
	 */
	#map = null;

	/**
	 * The route and the finish marker layers on the map.
	 *
	 * @type {Array}
	 */
	#map_layers = [];

	/**
	 * Prepare server request data for updating the widget.
	 *
	 * @see CWidget.getUpdateRequestData
	 *
	 * @returns {Object}
	 */
	getUpdateRequestData() {
		return {
			// Use all default data.
			...super.getUpdateRequestData(),
			// Request the server to return the templates (the finish icon marker) needed for map creation.
			with_templates: this.#map === null ? 1 : undefined,
			// Let the server know if the widget is configured for a static time period.
			has_custom_time_period: this.getFieldsReferredData().has('time_period') ? undefined : 1
		}
	}

	/**
	 * Resolve as soon as the widget is fully rendered (ready for printing).
	 *
	 * Overloads the default implementation of the readiness method.
	 * Readiness state is crucial for PDF reporting of dashboards.
	 *
	 * @returns {Promise<unknown>}
	 */
	promiseReady() {
		if (this.#map === null) {
			// Resolve immediately if the widget has displayed a non-map view after the first update.
			return Promise.resolve();
		}

		return new Promise(resolve => {
			// Wait unless the map is ready (Leaflet implements its own readiness callback).
			this.#map.whenReady(() => {
				// When the map is ready, wait unless the default readiness promise is resolved.
				super.promiseReady()
					// Lastly, wait for the final animations to finish.
					.then(() => setTimeout(resolve, 300));
			});
		});
	}

	/**
	 * Promise to update the widget.
	 *
	 * Overloads the default implementation of the update method.
	 *
	 * @see CWidget.promiseUpdate
	 *
	 * @returns {Promise<void>}
	 */
	promiseUpdate() {
		if (!this.hasEverUpdated() || this.isFieldsReferredDataUpdated()) {
			// Only update the widget on the very first request or when the data has changed.
			return super.promiseUpdate();
		}

		// Do not update the widget if nothing changed.
		return Promise.resolve();
	}

	/**
	 * Update the widget body if the update cycle has run successfully and without errors.
	 *
	 * @param {Object} response
	 *
	 * @see CWidget.setContents
	 */
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

		// Remove previous way-points and the finish marker from the map.
		this.#map_layers.forEach(layer => this.#map.removeLayer(layer));
		this.#map_layers = [];

		const polyline = L.polyline(response.points, {color: 'blue'});

		// Display the way-points on the map.
		polyline.addTo(this.#map);

		// Create a marker icon from the inline SVG image.
		const icon = L.icon({
			iconUrl: `data:image/svg+xml;base64,${btoa(this._body.querySelector('template.svg-marker').innerHTML)}`,
			iconSize: [46, 61],
			iconAnchor: [22, 44]
		});

		const marker = L.marker(...response.points.slice(-1), {icon});

		// Display the icon over the last way-point as a finish marker.
		marker.addTo(this.#map);

		// Show the whole route centered and fully visible on the map.
		this.#map.fitBounds(response.points);

		this.#map_layers.push(polyline, marker);
	}

	/**
	 * Intercept the clear-contents event.
	 *
	 * Resets the state as if the map was never displayed.
	 */
	onClearContents() {
		if (this.#map !== null) {
			// Shut down and remove the map.
			this.#map.remove();
		}

		this.#map = null;
		this.#map_layers = [];
	}

	/**
	 * Intercept the resizing event of the widget container.
	 */
	onResize() {
		if (this.#map !== null) {
			// Inform the map component that the size of the container has changed.
			this.#map.invalidateSize();
		}
	}

	/**
	 * Turn off the text mode and use all available space for widget presentation.
	 *
	 * @returns {boolean}
	 */
	hasPadding() {
		return false;
	}
}
