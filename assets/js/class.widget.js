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
	 * Resolve as soon as the widget is fully rendered (ready for printing).
	 *
	 * Overloads the default implementation of the readiness method.
	 * Readiness state is crucial for PDF reporting of dashboards.
	 *
	 * @returns {Promise<unknown>}
	 */
	promiseReady() {
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
		// Use convenient methods from the base CWidget and CWidgetBase classes.
		if (!this.hasEverUpdated()) {
			const map_wrapper = document.createElement('div');

			map_wrapper.style.height = '100%';

			// Set the content for a particular widget instance.
			this._body.appendChild(map_wrapper);

			// Focus the map in the center of London.
			this.#map = L.map(map_wrapper).setView([51.505, -0.09], 13);

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; OpenStreetMap contributors'
			}).addTo(this.#map);
		}

		// Return a resolved promise, since the update routine is promise-based.
		return Promise.resolve();
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
