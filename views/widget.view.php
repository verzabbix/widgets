<?php declare(strict_types = 0);

/**
 * @var CView $this
 * @var array $data
 */

$view = new CWidgetView($data);

if (array_key_exists('error', $data)) {
	$view->addItem(
		(new CTableInfo())->setNoDataMessage($data['error'])
	);
}
elseif (!$data['points']) {
	$view->addItem(
		(new CDiv(_('No data found')))
			->addClass(ZBX_STYLE_NO_DATA_MESSAGE)
			->addClass(ZBX_ICON_SEARCH_LARGE)
	);
}
else {
	$view
		->addItem(
			(new CDiv())->addClass('map-wrapper')
		)
		->setVar('points', $data['points']);

	if ($data['with_templates']) {
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
	->setVar('info', $data['info'])
	->show();
