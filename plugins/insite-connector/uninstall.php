<?php
/**
 * Clean uninstall — remove options. Loaded by WordPress on uninstall.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'insite_connector_secret' );
