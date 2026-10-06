<?php
/**
 * Minimal bootstrap — HMAC unit tests do not need full WordPress.
 */

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

require_once dirname( __DIR__ ) . '/includes/class-insite-hmac.php';
