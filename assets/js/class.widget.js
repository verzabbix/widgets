/**
 * Custom presentation class for the Route widget.
 *
 * Extends the base class which implements the default functionality of any widget.
 */
class WMRoute extends CWidget {

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
			const map = L.map(map_wrapper).setView([51.505, -0.09], 13);

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; OpenStreetMap contributors'
			}).addTo(map);
		}

		// Return a resolved promise, since the update routine is promise-based.
		return Promise.resolve();
	}
}
