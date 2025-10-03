<?php declare(strict_types = 0);

/**
 * @var CView $this
 * @var array $data
 */

// The presentation of the Route widget view.

// Create a view object for the widget presentation.
$view = new CWidgetView($data);

if (array_key_exists('error', $data)) {
	// If the controller had an error, reflect it in the presentation.
	$view->addItem(
		(new CTableInfo())->setNoDataMessage($data['error'])
	);
}
elseif (!$data['points']) {
	// If there were no errors but also no points, display the "No data found" message.
	$view->addItem(
		(new CDiv(_('No data found')))
			->addClass(ZBX_STYLE_NO_DATA_MESSAGE)
			->addClass(ZBX_ICON_SEARCH_LARGE)
	);
}
else {
	$view
		// Add a wrapper container for the map.
		->addItem(
			(new CDiv())->addClass('map-wrapper')
		)
		// Add way-points data for sending back to the JavaScript class.
		->setVar('points', $data['points']);

	if ($data['with_templates']) {
		// Add the finish marker icon to the output, if requested by the JavaScript class.
		$view->addItem(
			(new CTag('template', true))
				->addClass('svg-marker')
				->addItem(
					(new CTag('svg', true))
						->setAttribute('xmlns', 'http://www.w3.org/2000/svg')
						->setAttribute('width', '24')
						->setAttribute('height', '32')
						->setAttribute('viewBox', '0 0 24 32')
						->addItem(
							(new CTag('path'))
								->setAttribute('fill', '#B44')
								->setAttribute('fill-rule', 'evenodd')
								->setAttribute('clip-rule', 'evenodd')
								->setAttribute('d', 'M12 24C12.972 24 18 15.7794 18 12.3C18 8.82061 15.3137 6 12 6C8.68629 6 6 8.82061 6 12.3C6 15.7794 11.028 24 12 24ZM12.0001 15.0755C13.4203 15.0755 14.5716 13.8565 14.5716 12.3528C14.5716 10.8491 13.4203 9.63011 12.0001 9.63011C10.58 9.63011 9.42871 10.8491 9.42871 12.3528C9.42871 13.8565 10.58 15.0755 12.0001 15.0755Z')
						)
				)
		);
	}
}

$view
	// Add custom icon information to the output.
	->setVar('info', $data['info'])
	// Generate a JSON response object to return to the JavaScript class.
	->show();
