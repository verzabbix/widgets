<?php

const ITEMID = 68626;

const CENTER = [51.5, -0.1];
const OFFSET = 1;

$values = [];

$time_from = strtotime('2025-10-01 00:00:00');
$time_to = strtotime('2025-10-09 23:59:59');

$p = CENTER;
$p[0] += (mt_rand() / mt_getrandmax() - 0.5) * OFFSET / 100;
$p[1] += (mt_rand() / mt_getrandmax() - 0.5) * OFFSET / 100;

$battery = 100;

$time = $time_from;

while ($time < $time_to) {
	$dx = $p[0] - CENTER[0];
	$dy = $p[1] - CENTER[1];
	$a = atan(abs($dy) / abs($dx));

	if ($dx < 0 && $dy >= 0) {
		$a = pi() - $a;
	}
	elseif ($dx < 0 && $dy < 0) {
		$a += pi();
	}
	elseif ($dx >= 0 && $dy < 0) {
		$a = 2 * pi() - $a;
	}

	$d = fmod($a + 3 * pi(), 2 * pi());

	$drive = mt_rand(30, 100);
	$still = 10;

	for ($i = 0; $i < $drive; $i++) {
		$p[0] += cos($d) * OFFSET / 100;
		$p[1] += sin($d) * OFFSET / 100;

		$values[] = [
			'itemid' => ITEMID,
			'value' => json_encode(['lat' => sprintf('%.6f', $p[0]), 'lng' => sprintf('%.6f', $p[1])]),
			'clock' => $time + $i * 60
		];

		$battery -= mt_rand(1, 5) / 5;

		if ($battery <= 0) {
			$battery = 0;
			$drive = $i + 1;

			break;
		}

		$d += (mt_rand() / mt_getrandmax() - 0.5) * pi() / 4;
	}

	for ($i = 0; $i < $still; $i++) {
		$values[] = [
			'itemid' => ITEMID,
			'value' => json_encode(['lat' => sprintf('%.6f', $p[0]), 'lng' => sprintf('%.6f', $p[1])]),
			'clock' => $time + ($drive + $i) * 60
		];
	}

	$time += ($drive + $still) * 60;

	if ($battery < 20) {
		$battery = 100;
	}
}

echo json_encode([
	'jsonrpc' => '2.0',
	'method' => 'history.push',
	'params' => $values
], JSON_PRETTY_PRINT);
